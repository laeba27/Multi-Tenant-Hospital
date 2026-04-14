-- Create patients table to link patients to hospitals
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  hospital_id text NOT NULL,
  patient_number text NOT NULL, -- Hospital-specific patient identifier
  status character varying(32) NOT NULL DEFAULT 'active'::character varying,
  registration_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  last_visit timestamp without time zone,
  medical_history text,
  allergies text,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance_provider text,
  insurance_policy_number text,
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by uuid,
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_unique_patient_hospital UNIQUE (patient_id, hospital_id),
  CONSTRAINT patients_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
  CONSTRAINT patients_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals (registration_no) ON DELETE CASCADE,
  CONSTRAINT patients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_hospital_id ON public.patients USING btree (hospital_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON public.patients USING btree (patient_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_patient_number ON public.patients USING btree (patient_number) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients USING btree (status) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patients table

-- Hospital admins can view all patients in their hospital
CREATE POLICY "Hospital admins can view patients in their hospital" ON public.patients
  FOR SELECT
  USING (
    hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'hospital_admin')
  );

-- Doctors can view patients in their hospital
CREATE POLICY "Doctors can view patients in their hospital" ON public.patients
  FOR SELECT
  USING (
    hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
  );

-- Reception can view patients in their hospital
CREATE POLICY "Reception can view patients in their hospital" ON public.patients
  FOR SELECT
  USING (
    hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'reception')
  );

-- Hospital admins can create patients in their hospital
CREATE POLICY "Hospital admins can create patients in their hospital" ON public.patients
  FOR INSERT
  WITH CHECK (
    hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'hospital_admin')
  );

-- Reception can create patients in their hospital
CREATE POLICY "Reception can create patients in their hospital" ON public.patients
  FOR INSERT
  WITH CHECK (
    hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'reception')
  );

-- Hospital admins can update patients in their hospital
CREATE POLICY "Hospital admins can update patients in their hospital" ON public.patients
  FOR UPDATE
  USING (
    hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'hospital_admin')
  );

-- Reception can update patients in their hospital
CREATE POLICY "Reception can update patients in their hospital" ON public.patients
  FOR UPDATE
  USING (
    hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'reception')
  );

-- Hospital admins can delete patients in their hospital
CREATE POLICY "Hospital admins can delete patients in their hospital" ON public.patients
  FOR DELETE
  USING (
    hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'hospital_admin')
  );

-- Super admins can perform all operations on patients
CREATE POLICY "Super admins can manage all patients" ON public.patients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
