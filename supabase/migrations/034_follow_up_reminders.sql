-- 034: follow-up reminder notifications
--
-- When a doctor sets a follow-up date on a prescription, the daily cron job
-- (src/app/api/cron/daily) notifies the patient two days before it.
--
-- 1. Allow the new notification kind. The original check (028) only allowed
--    the four appointment kinds, so inserting a reminder would fail.
-- 2. One AUTOMATIC reminder per patient record per follow-up date, enforced
--    by the database. entity_id is "<patients.id>:<follow_up_date>", so a job
--    that runs twice, or two runs that overlap, can never notify the same
--    patient about the same follow-up twice. Reminders staff send by hand from
--    the Follow-ups page use entity_type 'follow_up_manual' and are not
--    covered (the app limits those to one an hour).

alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check check (
    kind = any (array[
      'appointment_requested',
      'appointment_confirmed',
      'appointment_cancelled',
      'appointment_rescheduled',
      'follow_up_reminder'
    ])
  );

create unique index if not exists notifications_follow_up_once
  on public.notifications (entity_id)
  where kind = 'follow_up_reminder' and entity_type = 'follow_up';

-- The job looks prescriptions up by follow-up date every day.
create index if not exists idx_prescriptions_follow_up_date
  on public.prescriptions (follow_up_date)
  where follow_up_date is not null;
