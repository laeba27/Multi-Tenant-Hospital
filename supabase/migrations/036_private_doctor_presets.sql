-- 036: a doctor's personal prescription presets are private to that doctor
--
-- Presets with visibility 'doctor' ("Common cold", saved from the composer or
-- the Presets tab) belong to one doctor. The policies from 020 let anyone in
-- the same hospital READ them, and let a hospital admin change them. The app
-- already only shows a doctor their own presets; these restrictive policies
-- make the database enforce it too, so no other doctor (or admin) can read or
-- change them through the API.
--
-- RESTRICTIVE policies are ANDed with the existing permissive ones, so presets
-- with any other visibility ('system', 'hospital', 'department') behave
-- exactly as before. The app's server actions use the service role, which
-- bypasses RLS, and check ownership themselves.

create or replace function public.is_own_doctor_staff(staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff s
    join public.profiles p on p.registration_no = s.employee_registration_no
    where p.id = auth.uid()
      and s.id = staff_id
  )
$$;

drop policy if exists "Doctor presets are private" on public.prescription_presets;
create policy "Doctor presets are private" on public.prescription_presets
  as restrictive
  for all
  using (visibility <> 'doctor' or public.is_own_doctor_staff(doctor_id))
  with check (visibility <> 'doctor' or public.is_own_doctor_staff(doctor_id));

drop policy if exists "Doctor preset values are private" on public.prescription_preset_values;
create policy "Doctor preset values are private" on public.prescription_preset_values
  as restrictive
  for all
  using (
    exists (
      select 1
      from public.prescription_presets pr
      where pr.id = prescription_preset_values.preset_id
        and (pr.visibility <> 'doctor' or public.is_own_doctor_staff(pr.doctor_id))
    )
  )
  with check (
    exists (
      select 1
      from public.prescription_presets pr
      where pr.id = prescription_preset_values.preset_id
        and (pr.visibility <> 'doctor' or public.is_own_doctor_staff(pr.doctor_id))
    )
  );
