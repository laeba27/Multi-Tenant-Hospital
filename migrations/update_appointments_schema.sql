-- Updated appointments table schema with TEXT-based patient_id
-- This references the patients table where id is now TEXT (HOSP-PAT-XXXXX)

-- Drop existing table if recreating
-- DROP TABLE IF EXISTS appointments CASCADE;

CREATE TABLE IF NOT EXISTS public.appointments (
  -- Appointment ID (TEXT)
  id text NOT NULL,

  -- Hospital registration number (TEXT)
  hospital_id text NOT NULL,

  -- Patient ID (TEXT) - references patients.id (HOSP-PAT-XXXXX)
  patient_id text NOT NULL,

  -- Department and doctor IDs (UUID)
  department_id uuid,
  doctor_id uuid,

  -- Appointment details
  appointment_type text DEFAULT 'consultation'::text,
  treatment_id uuid,
  treatment_details jsonb,
  appointment_date date NOT NULL,
  appointment_slot text NOT NULL,

  -- Booking metadata
  booked_by uuid,
  booked_by_type text,
  consultation_fee_snapshot numeric,

  -- Status
  status text DEFAULT 'scheduled'::text,
  reason text,

  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Constraints
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_department_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id),
  CONSTRAINT appointments_doctor_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff (id),
  CONSTRAINT appointments_hospital_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals (registration_no) ON DELETE CASCADE,
  CONSTRAINT appointments_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.patients (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_date ON public.appointments USING btree (hospital_id, appointment_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments USING btree (patient_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments USING btree (doctor_id) TABLESPACE pg_default;

-- Add comments for documentation
COMMENT ON TABLE public.appointments IS 'Hospital appointments with TEXT-based patient IDs';
COMMENT ON COLUMN public.appointments.patient_id IS 'Hospital-specific patient ID (TEXT) in format HOSP-PAT-XXXXX';
COMMENT ON COLUMN public.appointments.id IS 'Appointment ID (TEXT)';
COMMENT ON COLUMN public.appointments.hospital_id IS 'Hospital registration number (TEXT)';
