-- 035: store the patient's age
--
-- Reception must enter an age when registering a patient (a date of birth is
-- optional), but profiles had nowhere to keep it, so an age given without a
-- birth date was silently lost.
--
-- The age is stored together with the date it was recorded, so it can be
-- brought up to date later (age_years + whole years since age_recorded_on)
-- without inventing a birth date. When a date of birth is known it remains
-- the source of truth.

alter table public.profiles
  add column if not exists age_years smallint,
  add column if not exists age_recorded_on date;

alter table public.profiles
  drop constraint if exists profiles_age_years_check;

alter table public.profiles
  add constraint profiles_age_years_check check (age_years is null or (age_years between 0 and 150));

-- Patients who already have a date of birth get an age from it, so every
-- patient with either one has an age.
update public.profiles
set age_years = date_part('year', age(current_date, date_of_birth))::smallint,
    age_recorded_on = current_date
where role = 'patient'
  and date_of_birth is not null
  and age_years is null
  and date_of_birth <= current_date;
