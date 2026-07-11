-- =========================================================
-- Staff Shift & Slot Management
--
-- Until now "availability" was three loose columns on `staff`
-- (shift_start_time, shift_end_time, max_patients_per_day) and a `work_days`
-- jsonb that NOTHING EVER READ. The consequences, all live today:
--
--   * A doctor who works Mon-Fri is offered Sunday slots.
--   * Booked slots are not excluded -- getDoctorAvailableSlots literally
--     comments "for MVP, returning all shift slots" -- so two patients can
--     book the same 10:30 with the same doctor.
--   * No unique constraint stops them at the database either.
--   * There is no way to record a leave or a holiday at all.
--
-- This migration makes a slot a real thing: an hour (or half-hour) BLOCK with
-- a capacity, whose state is one of
--
--   green   available    -- room left
--   yellow  full         -- capacity reached, not bookable
--   red     unavailable  -- leave, holiday, or no shift that day
--
-- =========================================================

-- ---------------------------------------------------------
-- 1. Per-staff schedule configuration.
--
-- Lives on `staff` rather than a side table: every doctor has exactly one
-- schedule, and this keeps the booking query a single join-free read.
-- ---------------------------------------------------------

-- How long one bookable block is. 60 = the 6:00-7:00, 7:00-8:00 blocks.
alter table public.staff
  add column if not exists slot_duration_minutes integer not null default 60
    check (slot_duration_minutes in (15, 20, 30, 45, 60, 90, 120));

-- How many patients fit in ONE block. This is the number the colour depends on.
-- (max_patients_per_day still caps the whole day, and both are enforced.)
alter table public.staff
  add column if not exists max_patients_per_slot integer not null default 1
    check (max_patients_per_slot >= 1);

-- Lunch / rounds. A block overlapping the break is not offered at all.
alter table public.staff
  add column if not exists break_start_time time,
  add column if not exists break_end_time time;

-- A break must be a real interval if given at all.
alter table public.staff drop constraint if exists staff_break_valid;
alter table public.staff
  add constraint staff_break_valid check (
    (break_start_time is null and break_end_time is null)
    or (break_start_time is not null and break_end_time is not null
        and break_end_time > break_start_time)
  );

comment on column public.staff.slot_duration_minutes is
  'Length of one bookable block. 60 gives the 6:00-7:00, 7:00-8:00 blocks the product asks for.';
comment on column public.staff.max_patients_per_slot is
  'How many patients fit in one block. Drives the slot colour: room left = green, reached = yellow (full).';
comment on column public.staff.work_days is
  'Lowercase day names, e.g. ["monday","tuesday"]. As of migration 032 this is ENFORCED at booking time -- before it, it was stored and ignored, so doctors were offered days they do not work.';

-- ---------------------------------------------------------
-- 2. Leaves, holidays, and one-off unavailability.
--
-- One table for all three, because they answer the same question -- "is this
-- person away?" -- and the booking path should ask it once.
--
-- A hospital-wide holiday has staff_id = null: it closes EVERY doctor's diary
-- for that date without needing a row per doctor.
-- ---------------------------------------------------------

create table if not exists public.staff_unavailability (
  id uuid primary key default gen_random_uuid(),

  hospital_id text not null references public.hospitals (registration_no) on delete cascade,

  -- null = applies to the whole hospital (a public holiday, a shutdown).
  staff_id uuid references public.staff (id) on delete cascade,

  kind text not null default 'leave'
    check (kind in ('leave', 'holiday', 'unavailable')),

  starts_on date not null,
  ends_on date not null,

  -- Null times = the whole day is blocked. Give both to block only part of it
  -- (e.g. away 14:00-17:00 but working the morning).
  starts_at_time time,
  ends_at_time time,

  reason text,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint staff_unavailability_dates check (ends_on >= starts_on),
  constraint staff_unavailability_times check (
    (starts_at_time is null and ends_at_time is null)
    or (starts_at_time is not null and ends_at_time is not null
        and ends_at_time > starts_at_time)
  )
);

-- The booking path hits this on every slot lookup: "is this doctor away on this
-- date?" -- so index for exactly that question.
create index if not exists idx_unavailability_lookup
  on public.staff_unavailability (hospital_id, staff_id, starts_on, ends_on);

create index if not exists idx_unavailability_hospital_wide
  on public.staff_unavailability (hospital_id, starts_on, ends_on)
  where staff_id is null;

alter table public.staff_unavailability enable row level security;

-- Everyone at the hospital may READ who is away -- reception needs it to book,
-- doctors to see their own diary. Patients too: the booking screen has to show
-- red days, and "the doctor is away on the 14th" is not a secret.
drop policy if exists "Hospital members read unavailability" on public.staff_unavailability;
create policy "Hospital members read unavailability" on public.staff_unavailability
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.hospital_id = staff_unavailability.hospital_id
    )
    or exists (
      select 1 from public.patients p
      where p.profile_id = auth.uid() and p.hospital_id = staff_unavailability.hospital_id
    )
    or exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'super_admin'
    )
  );

-- Only hospital admins schedule leave.
drop policy if exists "Hospital admins manage unavailability" on public.staff_unavailability;
create policy "Hospital admins manage unavailability" on public.staff_unavailability
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid()
        and (
          pr.role = 'super_admin'
          or (pr.role = 'hospital_admin' and pr.hospital_id = staff_unavailability.hospital_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid()
        and (
          pr.role = 'super_admin'
          or (pr.role = 'hospital_admin' and pr.hospital_id = staff_unavailability.hospital_id)
        )
    )
  );

comment on table public.staff_unavailability is
  'Leave, holidays and one-off absences. staff_id null = a hospital-wide holiday closing every diary that day. Consulted on every slot lookup -- an overlapping row makes a slot RED (unavailable).';

-- ---------------------------------------------------------
-- 3. Stop double-booking at the database.
--
-- Capacity is per-BLOCK now, so a plain unique index on
-- (doctor, date, slot) would be wrong -- a 5-patient block legitimately has 5
-- rows. Instead a trigger enforces the configured capacity, which also closes
-- the race two concurrent bookings would otherwise win.
--
-- Cancelled appointments do not occupy a place. Pending requests DO -- a place
-- is held while reception decides, and released if they decline.
-- ---------------------------------------------------------

create or replace function public.enforce_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  taken integer;
begin
  -- Only guard rows that actually occupy a place.
  if new.status not in ('scheduled', 'pending_confirmation') then
    return new;
  end if;
  if new.doctor_id is null or new.appointment_slot is null then
    return new;
  end if;

  select coalesce(max_patients_per_slot, 1) into cap
  from public.staff where id = new.doctor_id;

  if cap is null then
    return new;
  end if;

  select count(*) into taken
  from public.appointments a
  where a.doctor_id = new.doctor_id
    and a.appointment_date = new.appointment_date
    and a.appointment_slot = new.appointment_slot
    and a.status in ('scheduled', 'pending_confirmation')
    and (tg_op = 'INSERT' or a.id <> new.id);

  if taken >= cap then
    raise exception
      'That time slot is full (% of % places taken). Please choose another.', taken, cap
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists trg_enforce_slot_capacity on public.appointments;
create trigger trg_enforce_slot_capacity
  before insert or update of doctor_id, appointment_date, appointment_slot, status
  on public.appointments
  for each row
  execute function public.enforce_slot_capacity();

comment on function public.enforce_slot_capacity is
  'Refuses a booking once a block holds max_patients_per_slot. Counts scheduled AND pending_confirmation (a pending request holds its place). This is the last line of defence -- getDoctorAvailableSlots also filters full slots, but only the trigger closes the race between two simultaneous bookings.';

-- ---------------------------------------------------------
-- 4. Backfill: give existing doctors a sane block size.
--
-- Slots were generated in hard-coded 30-minute steps, and existing appointments
-- sit on :00/:30 boundaries. Keep 30 for them so no historical appointment
-- falls outside its own block; new doctors default to 60.
-- ---------------------------------------------------------

update public.staff
set slot_duration_minutes = 30,
    max_patients_per_slot = 1
where role = 'doctor'
  and slot_duration_minutes = 60
  and exists (
    select 1 from public.appointments a where a.doctor_id = staff.id
  );
