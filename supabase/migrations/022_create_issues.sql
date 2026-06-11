-- =========================================================
-- Support Issues / Tickets
-- Hospital admins raise issues; super admins triage and respond.
-- =========================================================

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  hospital_id text references public.hospitals (registration_no) on delete set null,
  raised_by uuid references public.profiles (id) on delete set null,
  title text not null,
  description text,
  category text not null default 'general'
    check (category in ('general', 'technical', 'billing', 'access', 'feature_request', 'other')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_response text,
  responded_by uuid references public.profiles (id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_issues_hospital on public.issues (hospital_id, created_at desc);
create index if not exists idx_issues_status on public.issues (status, priority);

alter table public.issues enable row level security;

-- Hospital admins: see + create + update their own hospital's issues.
create policy "Issues read by hospital admin or super admin" on public.issues
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'super_admin'
          or (p.role = 'hospital_admin' and p.hospital_id = issues.hospital_id)
        )
    )
  );

create policy "Issues insert by hospital admin" on public.issues
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'hospital_admin'
        and p.hospital_id = issues.hospital_id
    )
  );

-- Super admins can update any issue (status, response).
create policy "Issues manage by super admin" on public.issues
  for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );
