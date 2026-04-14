-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id text NOT NULL,
  hospital_id text NOT NULL,
  patient_id uuid NOT NULL,
  department_id uuid,
  doctor_id uuid,
  appointment_type text DEFAULT 'consultation'::text,
  treatment_id uuid,
  treatment_details jsonb,
  appointment_date date NOT NULL,
  appointment_slot text NOT NULL,
  booked_by uuid,
  booked_by_type text,
  consultation_fee_snapshot numeric,
  status text DEFAULT 'scheduled'::text,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_department_fkey FOREIGN KEY (department_id) REFERENCES public.departments (id),
  CONSTRAINT appointments_doctor_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff (id),
  CONSTRAINT appointments_hospital_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals (registration_no) ON DELETE CASCADE,
  CONSTRAINT appointments_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.patients (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_date ON public.appointments USING btree (hospital_id, appointment_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments USING btree (patient_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments USING btree (doctor_id) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Hospital admins can manage appointments in their hospital" ON public.appointments
  FOR ALL
  USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'hospital_admin'));

CREATE POLICY "Reception can manage appointments in their hospital" ON public.appointments
  FOR ALL
  USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'reception'));

CREATE POLICY "Doctors can view appointments in their hospital" ON public.appointments
  FOR SELECT
  USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'doctor'));

CREATE POLICY "Super admins can manage all appointments" ON public.appointments
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
