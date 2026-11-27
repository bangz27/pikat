-- Assertions run against a throwaway PostGIS database after applying migrations.
\set ON_ERROR_STOP on
begin;

insert into public.address_points (house_no, soi, street, province, latitude, longitude, source)
values ('99/1', 'ทดสอบ 1', 'ทดสอบ', 'กรุงเทพมหานคร', 13.7563, 100.5018, 'test'),
       ('12', null, null, null, 13.7570, 100.5020, 'test'),
       ('7', null, null, 'เชียงใหม่', 18.7883, 98.9853, 'test');

-- geom must match lat/lng
do $$ declare bad int; begin
  select count(*) into bad from public.address_points
  where abs(extensions.st_y(geom::extensions.geometry) - latitude) > 1e-9 or abs(extensions.st_x(geom::extensions.geometry) - longitude) > 1e-9;
  if bad <> 0 then raise exception 'geom out of sync: %', bad; end if;
end $$;

-- geom follows coordinate updates
update public.address_points set latitude = 13.8, longitude = 100.6 where house_no = '12';
do $$ begin
  if not exists (select 1 from public.address_points where house_no = '12' and abs(extensions.st_y(geom::extensions.geometry) - 13.8) < 1e-9) then
    raise exception 'geom did not follow update';
  end if;
end $$;

-- default status unverified, verified_at null
do $$ begin
  if exists (select 1 from public.address_points where verification_status <> 'unverified' or verified_at is not null) then
    raise exception 'imported rows must start unverified';
  end if;
end $$;

-- explicit verification sets verified_at; un-verifying clears it
update public.address_points set verification_status = 'verified' where house_no = '99/1';
do $$ begin
  if not exists (select 1 from public.address_points where house_no = '99/1' and verified_at is not null) then raise exception 'verified_at not set'; end if;
end $$;
update public.address_points set verification_status = 'needs_review' where house_no = '99/1';
do $$ begin
  if exists (select 1 from public.address_points where house_no = '99/1' and verified_at is not null) then raise exception 'verified_at not cleared'; end if;
end $$;

-- nearby search: Bangkok point within 500 m, Chiang Mai not
do $$ declare n int; begin
  select count(*) into n from public.nearby_address_points(13.7565, 100.5019, 500);
  if n <> 1 then raise exception 'nearby expected 1 got %', n; end if;
end $$;

-- bbox: Bangkok area contains 2 points
do $$ declare n int; begin
  select count(*) into n from public.address_points_in_bbox(100.4, 13.6, 100.7, 13.9);
  if n <> 2 then raise exception 'bbox expected 2 got %', n; end if;
end $$;

-- constraints reject invalid data
do $$ begin
  begin insert into public.address_points (house_no, latitude, longitude) values ('1', 91, 100); raise exception 'lat>90 accepted';
  exception when check_violation then null; end;
  begin insert into public.address_points (house_no, latitude, longitude) values ('1', 0, 0); raise exception '0,0 accepted';
  exception when check_violation then null; end;
  begin insert into public.address_points (house_no, latitude, longitude, postal_code) values ('1', 13, 100, '123'); raise exception 'bad postal accepted';
  exception when check_violation then null; end;
  begin insert into public.address_points (house_no, latitude, longitude, verification_status) values ('1', 13, 100, 'approved'); raise exception 'bad status accepted';
  exception when check_violation then null; end;
  begin insert into public.address_points (house_no, latitude, longitude) values ('  ', 13, 100); raise exception 'blank house_no accepted';
  exception when check_violation then null; end;
end $$;

-- spatial index exists
do $$ begin
  if not exists (select 1 from pg_indexes where indexname = 'address_points_geom_gix') then raise exception 'missing gist index'; end if;
end $$;

-- anon role can use the table via MVP policies
set local role anon;
do $$ declare n int; begin
  select count(*) into n from public.address_points;
  if n < 3 then raise exception 'anon cannot read'; end if;
end $$;
reset role;

rollback;
\echo 'ALL MIGRATION ASSERTIONS PASSED'
