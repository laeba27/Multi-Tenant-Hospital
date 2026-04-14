-- Create staff table
create table
  if not exists public.staff (
    id uuid primary key default gen_random_uuid (),
    -- Tenant isolation
    hospital_id text not null references hospitals (registration_no) on delete cascade,
    department_id uuid references departments (id) on delete set null,
    -- Professional info
    role text not null check (
      role in (
        'doctor',
        'nurse',
        'receptionist',
        'lab_technician',
        'pharmacist',
        'admin',
        'other'
      )
    ),
    -- Employee business identifier (links to profiles table)
    employee_registration_no text not null references profiles (registration_no) on delete cascade,
    -- Personal info
    name text not null,
    gender text,
    date_of_birth date,
    -- Doctor-specific fields
    specialization text,
    qualification text,
    license_number text,
    license_expiry date,
    consultation_fee numeric,
    max_patients_per_day integer,
    -- Work info
    years_of_experience integer,
    employment_type text check (
      employment_type in (
        'full_time',
        'part_time',
        'contract',
        'temporary',
        'permanent'
      )
    ),
    joining_date date,
    -- Schedule
    shift_start_time time,
    shift_end_time time,
    -- Contact info
    address text,
    emergency_contact text,
    -- Compensation
    salary numeric,
    is_active boolean default true,
    created_at timestamptz default now (),
    updated_at timestamptz default now (),
    -- Prevent duplicate staff per hospital
    unique (hospital_id, employee_registration_no)
  );

-- Enable RLS
alter table public.staff enable row level security;

-- RLS Policies
-- Hospital Admins can view their own staff
create policy "Hospital admins can view their own staff" on public.staff for
select
  using (
    auth.uid () in (
      select
        p.id
      from
        profiles p
      where
        p.hospital_id = staff.hospital_id
        and p.role = 'hospital_admin'
    )
  );

-- Hospital Admins can insert/invite staff
create policy "Hospital admins can insert their own staff" on public.staff for insert
with
  check (
    auth.uid () in (
      select
        p.id
      from
        profiles p
      where
        p.hospital_id = staff.hospital_id
        and p.role = 'hospital_admin'
    )
  );

-- Hospital Admins can update their own staff
create policy "Hospital admins can update their own staff" on public.staff for
update using (
  auth.uid () in (
    select
      p.id
    from
      profiles p
    where
      p.hospital_id = staff.hospital_id
      and p.role = 'hospital_admin'
  )
);

-- Hospital Admins can delete their own staff
create policy "Hospital admins can delete their own staff" on public.staff for delete using (
  auth.uid () in (
    select
      p.id
    from
      profiles p
    where
      p.hospital_id = staff.hospital_id
      and p.role = 'hospital_admin'
  )
);

-- Create indexes
create index idx_staff_hospital_id on public.staff (hospital_id);

create index idx_staff_department_id on public.staff (department_id);

create index idx_staff_role on public.staff (role);