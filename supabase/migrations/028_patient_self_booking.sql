-- =========================================================
-- Patient self-booking + confirmation workflow
--
-- A patient booking from their own portal creates a *request*, not a booking.
-- It lands as 'pending_confirmation' with payment 'unpaid', reception reviews
-- it, confirms (optionally collecting payment), and the patient is notified.
-- A staff-booked appointment skips 'pending_confirmation' entirely -- a human
-- at the desk already confirmed it by creating it.
--
-- 1. appointments: booked_by_type backfill, payment state, confirmation audit,
--    a status CHECK (the table never had one), patient self-cancel policy.
-- 2. notifications: real per-user notification rows, replacing the feed that
--    src/actions/notifications.js currently synthesizes from notices + issues.
-- =========================================================

-- ---------------------------------------------------------
-- 1. appointments
-- ---------------------------------------------------------

-- booked_by_type already exists (010) but is nullable with no default and has
-- never been written to. Backfill every existing row as staff-booked, then
-- lock it down -- from here on the column is how reception tells a patient
-- request apart from a desk booking.
update public.appointments
  set booked_by_type = 'staff'
  where booked_by_type is null;

alter table public.appointments
  alter column booked_by_type set default 'staff';

alter table public.appointments
  alter column booked_by_type set not null;

alter table public.appointments
  drop constraint if exists appointments_booked_by_type_check;
alter table public.appointments
  add constraint appointments_booked_by_type_check
  check (booked_by_type in ('staff', 'patient'));

-- Payment state on the appointment itself. The invoice remains the source of
-- truth for money actually collected; this mirrors it so a pending request can
-- show "Unpaid -- Rs.500 due" in the reception queue before any invoice exists.
-- We do not take online payments, so a patient-booked row is always 'unpaid'
-- until someone at the desk records a payment.
alter table public.appointments
  add column if not exists payment_status text not null default 'unpaid';

alter table public.appointments
  drop constraint if exists appointments_payment_status_check;
alter table public.appointments
  add constraint appointments_payment_status_check
  check (payment_status in ('unpaid', 'partially_paid', 'paid'));

-- Always computed server-side from staff.consultation_fee + treatments.price.
-- Never trusted from the patient's browser.
alter table public.appointments
  add column if not exists amount_due numeric(10,2) not null default 0;

-- Confirmation / rejection audit trail.
alter table public.appointments
  add column if not exists confirmed_by uuid references public.profiles (id) on delete set null;

alter table public.appointments
  add column if not exists confirmed_at timestamptz;

alter table public.appointments
  add column if not exists cancellation_reason text;

-- The table has carried a bare `status text default 'scheduled'` since 010 with
-- no constraint at all. Pin the vocabulary now that a new state exists.
-- Guard first: a CHECK is validated against existing rows, so an unexpected
-- legacy value would abort the whole migration.
do $$
declare
  bad_count integer;
begin
  select count(*) into bad_count
  from public.appointments
  where status is not null
    and status not in ('pending_confirmation', 'scheduled', 'completed', 'cancelled');

  if bad_count > 0 then
    raise exception
      'Cannot add appointments_status_check: % row(s) have a status outside (pending_confirmation, scheduled, completed, cancelled). Normalise them first.',
      bad_count;
  end if;
end $$;

alter table public.appointments
  drop constraint if exists appointments_status_check;
alter table public.appointments
  add constraint appointments_status_check
  check (status in ('pending_confirmation', 'scheduled', 'completed', 'cancelled'));

comment on column public.appointments.booked_by_type is
  'Who created this appointment. ''patient'' rows arrive as pending_confirmation and must be reviewed by reception; ''staff'' rows are confirmed on creation.';
comment on column public.appointments.payment_status is
  'Mirrors the invoice payment state so the reception queue can badge a pending request before an invoice exists. No online payment is collected -- patient-booked rows stay ''unpaid'' until the desk records one.';
comment on column public.appointments.amount_due is
  'Server-computed from the doctor consultation fee + treatment catalog prices. Never accepted from the client.';

-- The pending-requests queue polls this constantly. Partial index keeps it tiny.
create index if not exists idx_appointments_pending
  on public.appointments (hospital_id, created_at desc)
  where status = 'pending_confirmation';

-- ---------------------------------------------------------
-- 1b. Patient self-cancel
--
-- 025 already grants patients SELECT on their own appointments. They also need
-- UPDATE, but ONLY to withdraw a request that has not been confirmed yet.
-- Postgres has no column-level RLS: the USING clause gates which rows are
-- updatable and WITH CHECK gates the resulting row, but a patient could still
-- rewrite appointment_date or amount_due on a pending row of their own. A
-- trigger enforces "the only field you may change is status -> cancelled".
-- ---------------------------------------------------------

drop policy if exists "Patients can cancel their own pending appointments" on public.appointments;
create policy "Patients can cancel their own pending appointments" on public.appointments
  for update
  to authenticated
  using (
    status = 'pending_confirmation'
    and patient_id in (
      select p.id from public.patients p where p.profile_id = auth.uid()
    )
  )
  with check (
    status = 'cancelled'
    and patient_id in (
      select p.id from public.patients p where p.profile_id = auth.uid()
    )
  );

create or replace function public.enforce_patient_appointment_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.profiles where id = auth.uid();

  -- Staff, doctors and admins go through the server actions (service-role
  -- client, auth.uid() is null there) -- leave those writes untouched.
  if actor_role is distinct from 'patient' then
    return new;
  end if;

  -- A patient may only flip status to 'cancelled'. Everything else must be
  -- byte-identical to the row they started from.
  if new.status is distinct from 'cancelled' then
    raise exception 'A patient may only cancel an appointment.';
  end if;

  if (new.appointment_date, new.appointment_slot, new.doctor_id, new.department_id,
      new.hospital_id, new.patient_id, new.appointment_type, new.treatment_id,
      new.treatment_details, new.amount_due, new.payment_status,
      new.consultation_fee_snapshot, new.booked_by, new.booked_by_type)
     is distinct from
     (old.appointment_date, old.appointment_slot, old.doctor_id, old.department_id,
      old.hospital_id, old.patient_id, old.appointment_type, old.treatment_id,
      old.treatment_details, old.amount_due, old.payment_status,
      old.consultation_fee_snapshot, old.booked_by, old.booked_by_type)
  then
    raise exception 'A patient may only change the status of their appointment.';
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_enforce_patient_appointment_cancel on public.appointments;
create trigger trg_enforce_patient_appointment_cancel
  before update on public.appointments
  for each row
  execute function public.enforce_patient_appointment_cancel();

-- ---------------------------------------------------------
-- 1c. Fix the reception RLS role name
--
-- profiles.role stores 'receptionist', but 010's policy checks for 'reception'
-- -- so it has never matched a real receptionist and reception's appointment
-- access has only worked because the server actions use the service-role
-- client. Accept both spellings so the policy actually does its job.
-- ---------------------------------------------------------

drop policy if exists "Reception can manage appointments in their hospital" on public.appointments;
create policy "Reception can manage appointments in their hospital" on public.appointments
  for all
  to authenticated
  using (
    hospital_id in (
      select pr.hospital_id from public.profiles pr
      where pr.id = auth.uid() and pr.role in ('receptionist', 'reception')
    )
  )
  with check (
    hospital_id in (
      select pr.hospital_id from public.profiles pr
      where pr.id = auth.uid() and pr.role in ('receptionist', 'reception')
    )
  );

-- ---------------------------------------------------------
-- 2. notifications
--
-- Real per-user notification rows with read state. getNavNotifications()
-- currently fabricates a feed out of notices + issues and has no unread
-- tracking; patients get nothing from it at all.
-- ---------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),

  -- A notification targets either ONE person...
  recipient_id uuid references public.profiles (id) on delete cascade,
  -- ...or every holder of a role at a hospital (e.g. fan a new booking request
  -- out to the whole reception desk without knowing who is on shift).
  recipient_role text,
  hospital_id text references public.hospitals (registration_no) on delete cascade,

  kind text not null
    check (kind in (
      'appointment_requested',
      'appointment_confirmed',
      'appointment_cancelled',
      'appointment_rescheduled'
    )),

  title text not null,
  body text,
  link text,                    -- deep link, e.g. /dashboard/reception/patient-management?tab=pending
  entity_type text,             -- 'appointment'
  entity_id text,               -- the APT###### id

  read_at timestamptz,
  created_at timestamptz not null default now(),

  -- Must target somebody: a person, or a role at a hospital.
  constraint notifications_has_target
    check (
      recipient_id is not null
      or (recipient_role is not null and hospital_id is not null)
    )
);

create index if not exists idx_notifications_recipient
  on public.notifications (recipient_id, created_at desc)
  where recipient_id is not null;

create index if not exists idx_notifications_unread
  on public.notifications (recipient_id)
  where recipient_id is not null and read_at is null;

create index if not exists idx_notifications_role
  on public.notifications (hospital_id, recipient_role, created_at desc)
  where recipient_role is not null;

create index if not exists idx_notifications_entity
  on public.notifications (entity_type, entity_id);

alter table public.notifications enable row level security;

-- You read what is addressed to you personally, plus anything addressed to your
-- role at your hospital.
drop policy if exists "Users read their own notifications" on public.notifications;
create policy "Users read their own notifications" on public.notifications
  for select
  to authenticated
  using (
    recipient_id = auth.uid()
    or (
      recipient_role is not null
      and exists (
        select 1 from public.profiles pr
        where pr.id = auth.uid()
          and pr.hospital_id = notifications.hospital_id
          and pr.role = notifications.recipient_role
      )
    )
  );

-- Only personally-addressed notifications can be marked read. A role-addressed
-- one is a shared broadcast -- one receptionist dismissing it must not hide it
-- from the rest of the desk.
drop policy if exists "Users mark their own notifications read" on public.notifications;
create policy "Users mark their own notifications read" on public.notifications
  for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Deliberately NO insert policy for `authenticated`. Every write goes through
-- notify() on the service-role client -- a patient must be able to create a
-- notification addressed to the reception desk, which no sane RLS rule would
-- permit directly.

comment on table public.notifications is
  'Per-user notification feed with read state. Written only by notify() via the service-role client. recipient_id targets one person; recipient_role + hospital_id broadcasts to a role at a hospital.';
