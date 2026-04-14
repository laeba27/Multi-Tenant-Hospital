-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id text NOT NULL,
  hospital_id text NOT NULL,
  patient_id uuid NOT NULL,
  appointment_id text,
  subtotal numeric DEFAULT 0,
  discount_type text,
  discount_value numeric,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  paid_amount numeric DEFAULT 0,
  due_amount numeric DEFAULT 0,
  payment_method text,
  payment_status text DEFAULT 'unpaid',
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_patient_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE,
  CONSTRAINT invoices_hospital_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE,
  CONSTRAINT invoices_appointment_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_hospital ON public.invoices USING btree (hospital_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices USING btree (patient_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_invoices_appointment ON public.invoices USING btree (appointment_id) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Hospital admins can manage invoices in their hospital" ON public.invoices
  FOR ALL
  USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'hospital_admin'));

CREATE POLICY "Reception can manage invoices in their hospital" ON public.invoices
  FOR ALL
  USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'reception'));

CREATE POLICY "Super admins can manage all invoices" ON public.invoices
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
