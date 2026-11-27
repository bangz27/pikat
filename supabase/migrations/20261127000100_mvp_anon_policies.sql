-- MVP ONLY: the app has no authentication yet, so the anon role may read and write.
-- Anyone holding the anon key can modify data. Replace with authenticated,
-- role-based policies before real/production data is stored. To lock down, run:
--   drop policy ... (see names below) — the table then becomes inaccessible to anon.

create policy "mvp anon read address_points"   on public.address_points for select to anon, authenticated using (true);
create policy "mvp anon insert address_points" on public.address_points for insert to anon, authenticated with check (true);
create policy "mvp anon update address_points" on public.address_points for update to anon, authenticated using (true) with check (true);
create policy "mvp anon delete address_points" on public.address_points for delete to anon, authenticated using (true);

grant select, insert, update, delete on public.address_points to anon, authenticated;
grant execute on function public.nearby_address_points(double precision, double precision, double precision, integer) to anon, authenticated;
grant execute on function public.address_points_in_bbox(double precision, double precision, double precision, double precision, integer) to anon, authenticated;
