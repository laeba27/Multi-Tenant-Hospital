-- Complete staff table with all fields
DROP TABLE IF EXISTS public.staff CASCADE;

CREATE TABLE public.staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  hospital_id text NOT NULL,
  department_id uuid NULL,
  role text NOT NULL,
  employee_registration_no text NOT NULL,
  name text NOT NULL,
  gender text NULL,
  date_of_birth date NULL,
  specialization text NULL,
  qualification text NULL,
  years_of_experience integer NULL,
  shift text NULL,
  salary numeric NULL,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  shift_name text NULL,
  shift_start_time time without time zone NULL,
  shift_end_time time without time zone NULL,
  address text NULL,
  emergency_contact text NULL,
  joining_date date NULL,
  employment_type text NULL,
  license_number text NULL,
  license_expiry date NULL,
  max_patients_per_day integer NULL,
  consultation_fee numeric NULL,
  avatar_url text NULL,
  notes text NULL,
  work_days jsonb NULL,
  updated_at timestamp with time zone NULL DEFAULT now(),
  
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_hospital_id_employee_registration_no_key UNIQUE (hospital_id, employee_registration_no),
  CONSTRAINT staff_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT staff_employee_registration_no_fkey FOREIGN KEY (employee_registration_no) REFERENCES profiles(registration_no) ON DELETE CASCADE,
  CONSTRAINT staff_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES hospitals(registration_no) ON DELETE CASCADE,
  CONSTRAINT staff_role_check CHECK (role = ANY (ARRAY['doctor'::text, 'nurse'::text, 'receptionist'::text, 'lab_technician'::text, 'pharmacist'::text, 'admin'::text, 'other'::text]))
) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Hospital admins can view their own staff"
  ON public.staff FOR SELECT
  USING (
    auth.uid() IN (
      SELECT p.id 
      FROM profiles p
      WHERE p.hospital_id = staff.hospital_id
      AND p.role = 'hospital_admin'
    )
  );

CREATE POLICY "Hospital admins can insert their own staff"
  ON public.staff FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT p.id 
      FROM profiles p
      WHERE p.hospital_id = staff.hospital_id
      AND p.role = 'hospital_admin'
    )
  );

CREATE POLICY "Hospital admins can update their own staff"
  ON public.staff FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT p.id 
      FROM profiles p
      WHERE p.hospital_id = staff.hospital_id
      AND p.role = 'hospital_admin'
    )
  );

CREATE POLICY "Hospital admins can delete their own staff"
  ON public.staff FOR DELETE
  USING (
    auth.uid() IN (
      SELECT p.id 
      FROM profiles p
      WHERE p.hospital_id = staff.hospital_id
      AND p.role = 'hospital_admin'
    )
  );

-- Create indexes
CREATE INDEX idx_staff_hospital_id ON public.staff(hospital_id);
CREATE INDEX idx_staff_department_id ON public.staff(department_id);
CREATE INDEX idx_staff_role ON public.staff(role);
CREATE INDEX idx_staff_joining_date ON public.staff(joining_date);
