-- =========================================================
-- Quick Updates: one notice table, multi-role audience.
--
-- Before this, "notices" were split in two:
--   notices          -- staff-facing,   audience text: all|doctors|nurses|admins
--   patient_notices  -- patient-facing, no audience at all
--
-- Two problems that made the split untenable:
--
--   1. An update aimed at "all patients and staff" had to be written to BOTH
--      tables, then kept in sync on every edit and delete.
--   2. notices.audience was DECORATIVE. No RLS policy and no query ever read
--      it, so a notice marked 'doctors' was in fact visible to every profile at
--      the hospital -- receptionists included. Targeting that isn't enforced is
--      worse than no targeting, because the author believes it worked.
--
-- After this: ONE table, `notices`, with `audience` as a text[] of recipient
-- roles, and RLS that actually enforces it. patient_notices becomes a view so
-- the existing patient portal keeps working untouched.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Widen `audience` from a single text to an array of roles.
--
-- The old vocabulary (all|doctors|nurses|admins) didn't even cover the roles
-- the product has: staff.role allows doctor, nurse, receptionist,
-- lab_technician, pharmacist, admin, other -- so there was no way to address a
-- receptionist or a pharmacist. The new vocabulary is the role list itself,
-- singular, plus 'patient'.
-- ---------------------------------------------------------

alter table public.notices
  add column if not exists audience_roles text[] not null default array['all']::text[];

-- Carry the old single-value audience across.
update public.notices
set audience_roles = case audience
  when 'all'     then array['all']::text[]
  when 'doctors' then array['doctor']::text[]
  when 'nurses'  then array['nurse']::text[]
  when 'admins'  then array['hospital_admin']::text[]
  else array['all']::text[]
end
where audience_roles = array['all']::text[]
  and audience is not null;

-- Every element must be a role we recognise. 'all' is a wildcard meaning
-- "every staff role AND patients"; 'staff' means "every staff role, no
-- patients". Both are shorthands the read policy expands.
alter table public.notices drop constraint if exists notices_audience_roles_valid;
alter table public.notices
  add constraint notices_audience_roles_valid check (
    array_length(audience_roles, 1) >= 1
    and audience_roles <@ array[
      'all', 'staff', 'patient',
      'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist',
      'hospital_admin', 'other'
    ]::text[]
  );

-- The old scalar column is dead. Keep it nullable so nothing that still writes
-- it breaks, but stop requiring it.
alter table public.notices alter column audience drop not null;
alter table public.notices alter column audience drop default;

-- patient_notices had richer categories than notices did. Union the two, so a
-- single form can offer every category to every audience.
alter table public.notices drop constraint if exists notices_category_check;
alter table public.notices
  add constraint notices_category_check check (
    category in (
      'general', 'urgent', 'schedule', 'policy', 'event',   -- from notices
      'health_alert', 'advisory', 'closure'                 -- from patient_notices
    )
  );

-- An image can hang off a notice (documents.notice_id). That FK currently
-- points at patient_notices, which is about to become a view -- repoint it.
alter table public.documents drop constraint if exists documents_notice_id_fkey;
alter table public.documents
  add constraint documents_notice_id_fkey
  foreign key (notice_id) references public.notices (id) on delete cascade;

create index if not exists idx_notices_audience
  on public.notices using gin (audience_roles);

-- ---------------------------------------------------------
-- 2. Absorb any existing patient_notices rows.
-- ---------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'patient_notices'
      and table_type = 'BASE TABLE'
  ) then
    insert into public.notices (
      hospital_id, created_by, title, body, category,
      audience_roles, is_pinned, published_at, expires_at, created_at, updated_at
    )
    select
      pn.hospital_id, pn.created_by, pn.title, pn.body, pn.category,
      array['patient']::text[], pn.is_pinned, pn.published_at, pn.expires_at,
      pn.created_at, pn.updated_at
    from public.patient_notices pn
    -- notices.hospital_id is NOT NULL; a platform-wide patient notice has none.
    -- None exist today, but don't silently drop one if it does.
    where pn.hospital_id is not null;

    drop table public.patient_notices cascade;
  end if;
end $$;

-- ---------------------------------------------------------
-- 3. Compatibility view.
--
-- The patient portal (getMyNotices, QuickUpdates.jsx) selects from
-- patient_notices. Rather than rewrite it, give it a view over the patient-
-- addressed slice of notices. The view inherits the base table's RLS.
-- ---------------------------------------------------------

create or replace view public.patient_notices as
select
  id, hospital_id, created_by, title, body, category,
  is_pinned, published_at, expires_at, created_at, updated_at
from public.notices
where audience_roles && array['all', 'patient']::text[];

grant select on public.patient_notices to authenticated;

-- ---------------------------------------------------------
-- 4. RLS that actually enforces the audience.
--
-- This is the whole point of the migration. A notice is readable by you only
-- if its audience_roles intersects the roles YOU hold:
--
--   'all'     matches everybody
--   'staff'   matches any non-patient hospital member
--   'patient' matches a patient registered at that hospital
--   a role    matches a profile with exactly that role
--
-- Patients are matched through `patients` (they may be registered at several
-- hospitals and their profiles.hospital_id is not the link); staff through
-- profiles.hospital_id.
-- ---------------------------------------------------------

drop policy if exists "Notices read by hospital members" on public.notices;
drop policy if exists "Notices read by audience" on public.notices;
create policy "Notices read by audience" on public.notices
  for select
  to authenticated
  using (
    (expires_at is null or expires_at > now())
    and published_at <= now()
    and (
      -- Staff: same hospital, and the notice is addressed to them.
      exists (
        select 1 from public.profiles pr
        where pr.id = auth.uid()
          and pr.hospital_id = notices.hospital_id
          and pr.role <> 'patient'
          and (
            notices.audience_roles && array['all', 'staff']::text[]
            or notices.audience_roles && array[pr.role]::text[]
          )
      )
      -- Patients: registered at the hospital, and addressed to patients.
      or (
        notices.audience_roles && array['all', 'patient']::text[]
        and exists (
          select 1 from public.patients p
          where p.profile_id = auth.uid()
            and p.hospital_id = notices.hospital_id
        )
      )
      -- Super admins see everything.
      or exists (
        select 1 from public.profiles pr
        where pr.id = auth.uid() and pr.role = 'super_admin'
      )
    )
  );

-- Authoring stays with hospital admins (and super admins).
drop policy if exists "Notices manage by hospital admin" on public.notices;
create policy "Notices manage by hospital admin" on public.notices
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'super_admin'
          or (p.role = 'hospital_admin' and p.hospital_id = notices.hospital_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'super_admin'
          or (p.role = 'hospital_admin' and p.hospital_id = notices.hospital_id)
        )
    )
  );

comment on column public.notices.audience_roles is
  'Who may read this notice. Elements are profile/staff roles, plus two shorthands: ''all'' (everyone at the hospital, patients included) and ''staff'' (every non-patient). Enforced by the "Notices read by audience" RLS policy -- unlike the old scalar `audience` column, which nothing ever checked.';
comment on view public.patient_notices is
  'Compatibility view over the patient-addressed slice of `notices`, so the patient portal keeps working after unification. Inherits the base table RLS.';
