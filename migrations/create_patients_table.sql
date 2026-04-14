-- Correct schema for patients table with TEXT-based ID
-- Drop existing table if recreating
-- DROP TABLE IF EXISTS patients CASCADE;

CREATE TABLE IF NOT EXISTS public.patients (
  -- Hospital-specific patient ID: HOSP-PAT-XXXXX (TEXT, not UUID)
  id text not null,

  -- References global profile (UUID)
  profile_id uuid not null,

  -- Hospital registration number (TEXT)
  hospital_id text not null,

  -- Hospital patient ID (same as id, for convenience)
  registration_no text not null,

  -- Physical attributes
  height numeric null,
  weight numeric null,

  -- Personal information
  marital_status text null,
  emergency_contact_name text null,
  emergency_contact_mobile text null,

  -- Insurance information
  insurance_provider text null,
  insurance_number text null,

  -- Medical information
  allergies text null,
  chronic_conditions text null,
  medical_notes text null,

  -- Metadata
  registered_by uuid null,
  is_active boolean null default true,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,

  -- Constraints
  constraint patients_pkey primary key (id),
  constraint patients_profile_hospital_unique unique (profile_id, hospital_id),
  constraint patients_hospital_fkey foreign KEY (hospital_id) references hospitals (registration_no) on delete CASCADE,
  constraint patients_profile_fkey foreign KEY (profile_id) references profiles (id) on delete CASCADE,
  constraint patients_registered_by_fkey foreign KEY (registered_by) references profiles (id) on delete set null
) TABLESPACE pg_default;

-- Indexes for performance
create index IF not exists idx_patients_profile_id on public.patients using btree (profile_id) TABLESPACE pg_default;
create index IF not exists idx_patients_hospital_id on public.patients using btree (hospital_id) TABLESPACE pg_default;
create index IF not exists idx_patients_id on public.patients using btree (id) TABLESPACE pg_default;

-- Add comment for documentation
COMMENT ON TABLE public.patients IS 'Hospital-specific patient records with TEXT-based patient IDs (HOSP-PAT-XXXXX)';
COMMENT ON COLUMN public.patients.id IS 'Hospital-specific patient ID in format HOSP-PAT-XXXXX (5 digits)';
COMMENT ON COLUMN public.patients.registration_no IS 'Same as id, hospital-specific patient ID';
COMMENT ON COLUMN public.patients.profile_id IS 'References global profile in profiles table (UUID)';
COMMENT ON COLUMN public.patients.hospital_id IS 'Hospital registration number (TEXT)';
