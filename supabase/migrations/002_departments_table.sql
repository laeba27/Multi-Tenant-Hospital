create table departments (
  id uuid primary key default gen_random_uuid(),

  hospital_id uuid not null references hospitals(id) on delete cascade,

  name text not null,                 -- Cardiology, Orthopedics, ICU
  code text,                          -- optional short code (CARD, ORTHO)
  description text,

  is_active boolean default true,

  created_at timestamptz default now(),

  unique (hospital_id, name)
);

-- Enable RLS
alter table departments enable row level security;

-- Policies
create policy "Hospitals can view their own departments"
  on departments for select
  using ( auth.uid() in (
    select user_id from hospital_users where hospital_id = departments.hospital_id
  ));

create policy "Hospitals can insert their own departments"
  on departments for insert
  with check ( auth.uid() in (
    select user_id from hospital_users where hospital_id = departments.hospital_id
  ));

create policy "Hospitals can update their own departments"
  on departments for update
  using ( auth.uid() in (
    select user_id from hospital_users where hospital_id = departments.hospital_id
  ));

create policy "Hospitals can delete their own departments"
  on departments for delete
  using ( auth.uid() in (
    select user_id from hospital_users where hospital_id = departments.hospital_id
  ));
