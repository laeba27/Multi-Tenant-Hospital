-- =========================================================
-- Finance Transactions (manual ledger)
-- Hospital admins record manual incoming (funds, banking,
-- donations) and outgoing (salary, investment, utilities,
-- other) money. Patient appointment income is NOT stored
-- here -- it is read live from the invoices table.
-- =========================================================

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals (registration_no) on delete cascade,
  direction text not null check (direction in ('incoming', 'outgoing')),
  category text not null,
  -- who the money was paid to (outgoing) or received from (incoming)
  party text,
  amount numeric not null check (amount >= 0),
  payment_method text check (payment_method in ('cash', 'bank_transfer', 'cheque', 'card', 'upi', 'other')),
  reference text,
  notes text,
  transaction_date date not null default current_date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_tx_hospital
  on public.finance_transactions (hospital_id, transaction_date desc);
create index if not exists idx_finance_tx_direction
  on public.finance_transactions (hospital_id, direction);

alter table public.finance_transactions enable row level security;

-- Hospital admins manage their own hospital's ledger.
create policy "Finance read by hospital admin or super admin"
  on public.finance_transactions
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'super_admin'
          or (p.role = 'hospital_admin' and p.hospital_id = finance_transactions.hospital_id)
        )
    )
  );

create policy "Finance manage by hospital admin"
  on public.finance_transactions
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'hospital_admin'
        and p.hospital_id = finance_transactions.hospital_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'hospital_admin'
        and p.hospital_id = finance_transactions.hospital_id
    )
  );

create policy "Finance manage by super admin"
  on public.finance_transactions
  for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );
