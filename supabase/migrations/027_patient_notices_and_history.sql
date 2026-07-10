-- =========================================================
-- Patient portal: quick updates + history
--
-- 1. patient_notices -- health news / advisories shown to patients
--    (e.g. "COVID booster clinic open Saturdays"). Authored by a hospital for
--    its own patients, or platform-wide by a super admin.
-- 2. A patient-read RLS policy on prescriptions so the portal's history page
--    can show what was prescribed to them.
-- =========================================================

create table if not exists public.patient_notices (
  id uuid primary key default gen_random_uuid(),

  -- null hospital_id = platform-wide notice, visible to every patient.
  -- Otherwise the notice is only visible to patients of that hospital.
  hospital_id text references public.hospitals (registration_no) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,

  title text not null,
  body text,
  category text not null default 'general'
    check (category in ('general', 'health_alert', 'advisory', 'event', 'closure')),

  is_pinned boolean not null default false,
  published_at timestamptz not null default now(),
  expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_patient_notices_feed
  on public.patient_notices (is_pinned desc, published_at desc);

create index if not exists idx_patient_notices_hospital
  on public.patient_notices (hospital_id);

alter table public.patient_notices enable row level security;

-- A patient reads platform-wide notices plus notices from any hospital they
-- are registered at. Expired notices are filtered out here rather than in
-- application code, so no caller can accidentally leak a stale advisory.
drop policy if exists "Patients read their notices" on public.patient_notices;
create policy "Patients read their notices" on public.patient_notices
  for select
  to authenticated
  using (
    (expires_at is null or expires_at > now())
    and published_at <= now()
    and (
      hospital_id is null
      or hospital_id in (
        select p.hospital_id from public.patients p where p.profile_id = auth.uid()
      )
    )
  );

-- Hospital admins manage their own hospital's notices.
drop policy if exists "Hospital admins manage their notices" on public.patient_notices;
create policy "Hospital admins manage their notices" on public.patient_notices
  for all
  to authenticated
  using (
    hospital_id in (
      select pr.hospital_id from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'hospital_admin'
    )
  )
  with check (
    hospital_id in (
      select pr.hospital_id from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'hospital_admin'
    )
  );

-- Super admins manage everything, including platform-wide (null hospital) notices.
drop policy if exists "Super admins manage all notices" on public.patient_notices;
create policy "Super admins manage all notices" on public.patient_notices
  for all
  to authenticated
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'super_admin')
  )
  with check (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'super_admin')
  );

-- =========================================================
-- History: let a patient read their own prescriptions.
-- prescriptions.patient_id -> patients.id -> profile_id, the same chain the
-- appointments policy in migration 025 uses.
-- =========================================================

drop policy if exists "Patients can view their own prescriptions" on public.prescriptions;
create policy "Patients can view their own prescriptions" on public.prescriptions
  for select
  to authenticated
  using (
    patient_id in (
      select p.id from public.patients p where p.profile_id = auth.uid()
    )
  );
