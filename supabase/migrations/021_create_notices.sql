-- =========================================================
-- Notices / Announcements
-- Hospital-scoped notices visible to staff (doctors, nurses, etc.)
-- =========================================================

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals (registration_no) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  title text not null,
  body text,
  category text not null default 'general'
    check (category in ('general', 'urgent', 'schedule', 'policy', 'event')),
  audience text not null default 'all'
    check (audience in ('all', 'doctors', 'nurses', 'admins')),
  is_pinned boolean not null default false,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notices_hospital
  on public.notices (hospital_id, is_pinned desc, published_at desc);

create index if not exists idx_notices_expiry
  on public.notices (expires_at);

alter table public.notices enable row level security;

-- Read: any staff/profile in the same hospital can read non-expired notices.
create policy "Notices read by hospital members" on public.notices
  for select
  using (
    hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    and (expires_at is null or expires_at > now())
  );

-- Manage: hospital admins (and super admins) can create/update/delete.
create policy "Notices manage by hospital admin" on public.notices
  for all
  using (
    hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('hospital_admin', 'super_admin')
    )
  )
  with check (
    hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('hospital_admin', 'super_admin')
    )
  );

-- Seed a welcome notice for every existing hospital (id-stable, idempotent-ish).
insert into public.notices (hospital_id, title, body, category, audience, is_pinned)
select h.registration_no,
       'Welcome to the staff portal',
       'Use the dashboard to track appointments, prescriptions, and patient history. Notices from your hospital administrator will appear here.',
       'general',
       'all',
       true
from public.hospitals h
where not exists (
  select 1 from public.notices n where n.hospital_id = h.registration_no
);
