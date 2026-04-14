-- Update patients table schema for multi-hospital patient linking
-- Drop the old patients table and create new one with updated structure
DROP TABLE IF EXISTS public.patients CASCADE;

CREATE TABLE
    public.patients (
        id uuid NOT NULL DEFAULT gen_random_uuid (),
        profile_id uuid NOT NULL,
        hospital_id text NOT NULL,
        height numeric NULL,
        weight numeric NULL,
        marital_status text NULL,
        emergency_contact_name text NULL,
        emergency_contact_mobile text NULL,
        insurance_provider text NULL,
        insurance_number text NULL,
        allergies text NULL,
        chronic_conditions text NULL,
        medical_notes text NULL,
        registered_by uuid NULL,
        is_active boolean NULL DEFAULT true,
        created_at timestamp without time zone NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp without time zone NULL DEFAULT CURRENT_TIMESTAMP,
        registration_no text NOT NULL,
        CONSTRAINT patients_pkey PRIMARY KEY (id),
        CONSTRAINT patients_profile_hospital_unique UNIQUE (profile_id, hospital_id),
        CONSTRAINT patients_hospital_fkey FOREIGN KEY (hospital_id) REFERENCES hospitals (registration_no) ON DELETE CASCADE,
        CONSTRAINT patients_profile_fkey FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
        CONSTRAINT patients_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES profiles (id) ON DELETE SET NULL
    ) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_profile_id ON public.patients USING btree (profile_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_hospital_id ON public.patients USING btree (hospital_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_registration_no ON public.patients USING btree (registration_no) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Hospital admins can view patients in their hospital" ON public.patients FOR
SELECT
    USING (
        hospital_id = (
            SELECT
                hospital_id
            FROM
                public.profiles
            WHERE
                id = auth.uid ()
                AND role = 'hospital_admin'
        )
    );

CREATE POLICY "Doctors can view patients in their hospital" ON public.patients FOR
SELECT
    USING (
        hospital_id = (
            SELECT
                hospital_id
            FROM
                public.profiles
            WHERE
                id = auth.uid ()
                AND role = 'doctor'
        )
    );

CREATE POLICY "Reception can view patients in their hospital" ON public.patients FOR
SELECT
    USING (
        hospital_id = (
            SELECT
                hospital_id
            FROM
                public.profiles
            WHERE
                id = auth.uid ()
                AND role = 'reception'
        )
    );

CREATE POLICY "Patients can view their own records" ON public.patients FOR
SELECT
    USING (profile_id = auth.uid ());

CREATE POLICY "Hospital staff can create patients" ON public.patients FOR INSERT
WITH
    CHECK (
        hospital_id = (
            SELECT
                hospital_id
            FROM
                public.profiles
            WHERE
                id = auth.uid ()
        )
    );

CREATE POLICY "Hospital staff can update patients" ON public.patients FOR
UPDATE USING (
    hospital_id = (
        SELECT
            hospital_id
        FROM
            public.profiles
        WHERE
            id = auth.uid ()
    )
)
WITH
    CHECK (
        hospital_id = (
            SELECT
                hospital_id
            FROM
                public.profiles
            WHERE
                id = auth.uid ()
        )
    );