-- Add missing fields to staff table
alter table if exists public.staff
add column if not exists license_number text,
add column if not exists license_expiry date,
add column if not exists consultation_fee numeric,
add column if not exists max_patients_per_day integer,
add column if not exists employment_type text check (
    employment_type in (
        'full_time',
        'part_time',
        'contract',
        'temporary',
        'permanent'
    )
),
add column if not exists joining_date date,
add column if not exists shift_start_time time,
add column if not exists shift_end_time time,
add column if not exists address text,
add column if not exists emergency_contact text;

-- Create index for employment type lookups
create index if not exists idx_staff_employment_type on public.staff (employment_type);

create index if not exists idx_staff_joining_date on public.staff (joining_date);