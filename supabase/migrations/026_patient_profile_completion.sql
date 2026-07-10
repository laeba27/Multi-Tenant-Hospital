-- =========================================================
-- Patient onboarding: minimal registration + first-login completion
--
-- Reception registers a patient with only name / mobile / gender /
-- date_of_birth. No email is collected at that point, but profiles.id has a
-- FK to auth.users(id), so an auth user must exist. We create one with a
-- placeholder address derived from the registration number
-- (e.g. PATIENT-000123@patients.internal) and the phone digits as the
-- temporary password.
--
-- On first login the patient is forced to supply a real email, verify it with
-- a 6-digit OTP, and set a real password. Completing that swaps the
-- placeholder email out and clears both flags.
-- =========================================================

-- Set while the account still holds a placeholder email / unverified details.
alter table public.profiles
  add column if not exists must_complete_profile boolean not null default false;

comment on column public.profiles.must_complete_profile is
  'True for a patient onboarded by reception who has not yet supplied and verified a real email address. The portal forces them through /dashboard/patient/complete-profile before anything else.';

-- Marks a verified email. Placeholder addresses are never verified.
alter table public.profiles
  add column if not exists email_verified boolean not null default false;

comment on column public.profiles.email_verified is
  'True once the address in profiles.email has been confirmed via an emailed OTP.';

-- =========================================================
-- Email verification codes (6-digit OTP, custom nodemailer flow)
-- =========================================================

create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  -- SHA-256 of the 6-digit code. Never store the code itself: a leaked table
  -- would otherwise let an attacker verify any pending address.
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_evc_profile on public.email_verification_codes (profile_id);
create index if not exists idx_evc_expires on public.email_verification_codes (expires_at);

alter table public.email_verification_codes enable row level security;

-- No policies: this table is only ever touched by the service-role admin
-- client from server actions. RLS on + zero policies = deny all to anon/auth,
-- which is exactly what we want for an OTP store.

-- =========================================================
-- Backfill: existing patients created by the old flow.
--
-- The old code inserted a profile only when an email was supplied, so every
-- existing patient profile already has a real (non-placeholder) email. Treat
-- those as complete so this migration does not lock them out of the portal.
-- =========================================================

update public.profiles
set must_complete_profile = false,
    email_verified = true
where role = 'patient'
  and email is not null
  and email not like '%@patients.internal';

-- Any patient somehow already holding a placeholder must finish onboarding.
update public.profiles
set must_complete_profile = true,
    email_verified = false
where role = 'patient'
  and (email is null or email like '%@patients.internal');
