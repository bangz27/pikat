-- PIKAT: address_points table with PostGIS geometry.
-- No personal data (recipient names, phone numbers, tracking numbers) by design.

create extension if not exists postgis with schema extensions;

create table if not exists public.address_points (
  id                  uuid primary key default gen_random_uuid(),
  house_no            text not null check (length(btrim(house_no)) between 1 and 50),
  village             text,
  soi                 text,
  street              text,
  subdistrict         text,
  district            text,
  province            text,
  postal_code         text check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  landmark            text,
  notes               text,
  source              text,
  verification_status text not null default 'unverified'
                      check (verification_status in ('unverified', 'verified', 'needs_review')),
  latitude            double precision not null check (latitude between -90 and 90),
  longitude           double precision not null check (longitude between -180 and 180),
  -- Always derived from latitude/longitude, so the two can never drift apart.
  geom                extensions.geography(Point, 4326)
                      generated always as (
                        extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
                      ) stored,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  verified_at         timestamptz,
  constraint address_points_not_null_island check (not (latitude = 0 and longitude = 0)),
  constraint address_points_verified_at_consistent
    check ((verification_status = 'verified') = (verified_at is not null))
);

comment on table public.address_points is 'PIKAT address/location points. Imported rows start unverified; verification is an explicit action.';

-- Spatial index for nearby / bbox / viewport queries.
create index if not exists address_points_geom_gix on public.address_points using gist (geom);
create index if not exists address_points_status_idx on public.address_points (verification_status);
create index if not exists address_points_house_no_idx on public.address_points (lower(house_no));
create index if not exists address_points_created_at_idx on public.address_points (created_at desc);

-- Maintain updated_at and verified_at server-side.
create or replace function public.address_points_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.verification_status = 'verified' then
    if tg_op = 'UPDATE' and old.verification_status = 'verified' then
      new.verified_at := coalesce(old.verified_at, now());
    else
      new.verified_at := now();
    end if;
  else
    new.verified_at := null;
  end if;
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists address_points_before_write on public.address_points;
create trigger address_points_before_write
  before insert or update on public.address_points
  for each row execute function public.address_points_before_write();

-- ---------- Spatial query helpers (prepared for future features) ----------

-- Points within radius_m metres of (lat, lng), nearest first, with distance.
create or replace function public.nearby_address_points(lat double precision, lng double precision, radius_m double precision default 500, max_results integer default 50)
returns table (point public.address_points, distance_m double precision)
language sql
stable
set search_path = ''
as $$
  select p, extensions.st_distance(p.geom, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) as distance_m
  from public.address_points p
  where extensions.st_dwithin(p.geom, extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography, radius_m)
  order by distance_m
  limit least(greatest(max_results, 1), 500);
$$;

-- Points inside a bounding box (map viewport loading).
create or replace function public.address_points_in_bbox(min_lng double precision, min_lat double precision, max_lng double precision, max_lat double precision, max_results integer default 2000)
returns setof public.address_points
language sql
stable
set search_path = ''
as $$
  select p.*
  from public.address_points p
  where p.geom operator(extensions.&&) extensions.st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::extensions.geography
  limit least(greatest(max_results, 1), 5000);
$$;

-- Row Level Security: enabled with NO policies here, so nothing is exposed by default.
-- See the separate *_mvp_anon_policies.sql migration for the no-auth MVP policies.
alter table public.address_points enable row level security;
