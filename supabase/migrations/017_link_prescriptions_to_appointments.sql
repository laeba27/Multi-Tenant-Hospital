-- =========================================================
-- Migration: Link Prescriptions to Appointments
-- Purpose: Enhance appointment schema to support prescription workflow
-- Ensures appointments can be linked to prescription creation
-- =========================================================

-- Add prescription tracking to appointments if not exists
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS prescription_status text DEFAULT 'pending' 
  CHECK (prescription_status IN ('pending', 'draft', 'issued', 'amended', 'cancelled'));

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS has_prescription boolean DEFAULT false;

-- Add index for efficient prescription lookup by appointment
CREATE INDEX IF NOT EXISTS idx_appointments_prescription_status 
  ON public.appointments (id, prescription_status, has_prescription);

-- Create view for doctor's appointment details with prescription status
CREATE OR REPLACE VIEW public.doctor_appointments_with_prescriptions AS
SELECT 
  a.id,
  a.hospital_id,
  a.patient_id,
  a.department_id,
  a.doctor_id,
  a.appointment_type,
  a.appointment_date,
  a.appointment_slot,
  a.status,
  a.reason,
  a.created_at,
  a.updated_at,
  a.prescription_status,
  a.has_prescription,
  COALESCE(p.id, NULL) as prescription_id,
  COALESCE(p.status, NULL) as latest_prescription_status,
  COALESCE(p.issued_at, NULL) as prescription_issued_at,
  COUNT(CASE WHEN p.status NOT IN ('cancelled') THEN 1 END) as prescription_count
FROM 
  public.appointments a
LEFT JOIN 
  public.prescriptions p ON a.id = p.appointment_id
GROUP BY 
  a.id, p.id;

-- Trigger to update appointment has_prescription flag when prescription is created/updated
CREATE OR REPLACE FUNCTION public.update_appointment_prescription_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.appointment_id IS NOT NULL THEN
    UPDATE public.appointments
    SET 
      has_prescription = true,
      prescription_status = NEW.status,
      updated_at = now()
    WHERE id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists to avoid duplicate
DROP TRIGGER IF EXISTS trigger_update_appointment_prescription_status ON public.prescriptions;

-- Create the trigger
CREATE TRIGGER trigger_update_appointment_prescription_status
AFTER INSERT OR UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_appointment_prescription_status();

-- Trigger to reset has_prescription when all prescriptions are cancelled
CREATE OR REPLACE FUNCTION public.check_appointment_prescriptions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.prescriptions 
      WHERE appointment_id = NEW.appointment_id 
      AND status != 'cancelled'
    ) THEN
      UPDATE public.appointments
      SET has_prescription = false, prescription_status = 'pending'
      WHERE id = NEW.appointment_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_check_appointment_prescriptions ON public.prescriptions;

-- Create the trigger for checking cancelled prescriptions
CREATE TRIGGER trigger_check_appointment_prescriptions
AFTER UPDATE OF status ON public.prescriptions
FOR EACH ROW
WHEN (NEW.status = 'cancelled')
EXECUTE FUNCTION public.check_appointment_prescriptions();

-- Ensure RLS is enabled
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Update existing appointment policies to include prescription operations
-- Doctor can view appointments and their prescriptions
DROP POLICY IF EXISTS "Doctors can view appointments in their hospital" ON public.appointments;

CREATE POLICY "Doctors can view and manage appointments with prescriptions" ON public.appointments
  FOR SELECT
  USING (
    hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
    AND doctor_id = (SELECT id FROM public.staff WHERE profile_id = auth.uid() AND role = 'doctor')
  );

-- Grant necessary permissions
GRANT SELECT ON public.doctor_appointments_with_prescriptions TO authenticated;
GRANT SELECT ON public.doctor_appointments_with_prescriptions TO service_role;
