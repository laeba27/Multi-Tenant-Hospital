-- =========================================================
-- Patient default-password handling
-- Patients are onboarded with their phone number as a temporary password.
-- This flag lets the patient portal prompt them to set a real password.
-- =========================================================

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

comment on column public.profiles.must_change_password is
  'True when the account still uses the system-issued temporary password (e.g. a patient onboarded with their phone number). The portal prompts the user to change it.';

-- =========================================================
-- Patient self-service read access (for the unified patient portal)
-- A patient can read their OWN hospital links + appointments across every
-- hospital they are registered at. Profiles already allow self-read.
-- =========================================================

-- patients: a patient sees their own per-hospital records (profile_id = auth.uid()).
drop policy if exists "Patients can view their own hospital records" on public.patients;
create policy "Patients can view their own hospital records" on public.patients
  for select
  using (profile_id = auth.uid());

-- appointments: a patient sees appointments whose per-hospital patient row
-- belongs to them. (appointments.patient_id -> patients.id -> profile_id)
drop policy if exists "Patients can view their own appointments" on public.appointments;
create policy "Patients can view their own appointments" on public.appointments
  for select
  using (
    patient_id in (
      select p.id from public.patients p where p.profile_id = auth.uid()
    )
  );

-- profiles: ensure a signed-in user can read their own profile row (needed for
-- the dashboard header / must_change_password flag). Idempotent.
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles
  for select
  using (id = auth.uid());

-- hospitals: allow any authenticated user to read basic hospital rows so the
-- patient portal can show hospital names/locations for their links.
drop policy if exists "Authenticated can view hospitals" on public.hospitals;
create policy "Authenticated can view hospitals" on public.hospitals
  for select
  to authenticated
  using (true);
