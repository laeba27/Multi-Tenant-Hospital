-- 037: follow-up day notifications + the patient's "are you coming?" answer
--
-- 1. New notification kinds, sent by the daily cron at ~12 AM IST
--    (src/app/api/cron/daily):
--      follow_up_today     to the patient: "your follow-up is today"
--      follow_up_digest    to each doctor and receptionist: today's count
--      follow_up_response  to the doctor and reception desk when a patient
--                          says they are / aren't coming
-- 2. Each is sent at most once, enforced by the database, so a cron run that
--    fires twice (or overlaps) never doubles up:
--      follow_up_today:  entity_id "<patients.id>:<follow_up_date>"
--      follow_up_digest: entity_id "<profiles.id>:<date>"
-- 3. follow_up_responses: one answer per patient record per follow-up date.
--    The patient can change it until the day is over. Written and read only
--    by server actions using the service role, so RLS is on with no policies.

alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check check (
    kind = any (array[
      'appointment_requested',
      'appointment_confirmed',
      'appointment_cancelled',
      'appointment_rescheduled',
      'follow_up_reminder',
      'follow_up_today',
      'follow_up_digest',
      'follow_up_response'
    ])
  );

create unique index if not exists notifications_follow_up_today_once
  on public.notifications (entity_id)
  where kind = 'follow_up_today';

create unique index if not exists notifications_follow_up_digest_once
  on public.notifications (entity_id)
  where kind = 'follow_up_digest';

create table if not exists public.follow_up_responses (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals (registration_no) on delete cascade,
  patient_id text not null references public.patients (id) on delete cascade,
  follow_up_date date not null,
  response text not null check (response in ('coming', 'not_coming')),
  note text,                          -- optional reason, e.g. "out of town"
  responded_by uuid references public.profiles (id) on delete set null,
  responded_at timestamptz not null default now(),
  unique (patient_id, follow_up_date)
);

create index if not exists idx_follow_up_responses_hospital_date
  on public.follow_up_responses (hospital_id, follow_up_date);

alter table public.follow_up_responses enable row level security;
