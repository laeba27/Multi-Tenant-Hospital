-- 039: what hospitals pay for the portal, and salary entries linked to staff
--
-- 1. hospital_subscriptions: one plan per hospital (fee + billing cycle),
--    set by a super admin.
-- 2. subscription_payments: each payment a super admin records against that
--    plan, with the period it covers. A hospital's status is worked out from
--    these (src/lib/finance/subscriptions.js): paid up to the latest
--    period_end; due once that date passes; overdue after the grace days.
--    Both tables are read and written only by super-admin server actions using
--    the service role, so RLS is on with no policies.
-- 3. finance_transactions.staff_id: a salary payment can name the staff member
--    it was for, so the Finance page can show who has been paid this month.

create table if not exists public.hospital_subscriptions (
  hospital_id text primary key references public.hospitals (registration_no) on delete cascade,
  plan_name text not null default 'Standard',
  amount numeric(12, 2) not null check (amount >= 0),
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'quarterly', 'half_yearly', 'yearly')),
  start_date date not null default current_date,
  grace_days integer not null default 7 check (grace_days between 0 and 90),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals (registration_no) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  period_start date not null,
  period_end date not null,
  paid_on date not null default current_date,
  payment_method text
    check (payment_method in ('cash', 'bank_transfer', 'cheque', 'card', 'upi', 'other')),
  reference text,
  notes text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index if not exists idx_subscription_payments_hospital
  on public.subscription_payments (hospital_id, period_end desc);

alter table public.hospital_subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

alter table public.finance_transactions
  add column if not exists staff_id uuid references public.staff (id) on delete set null;

create index if not exists idx_finance_transactions_staff
  on public.finance_transactions (staff_id, transaction_date)
  where staff_id is not null;

notify pgrst, 'reload schema';
