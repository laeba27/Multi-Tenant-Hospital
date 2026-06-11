-- Minimal Prescription Table Setup
-- Only essential tables for prescription-appointment integration

-- Prescription table
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id TEXT NOT NULL,
  doctor_id UUID NOT NULL,
  created_by UUID NOT NULL,
  patient_id UUID NOT NULL,
  appointment_id UUID,
  template_id TEXT,
  template_version_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('pending', 'draft', 'issued', 'amended', 'cancelled')),
  clinical_summary TEXT,
  follow_up_date TIMESTAMP,
  template_snapshot JSONB DEFAULT '{}'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  issued_at TIMESTAMP WITH TIME ZONE,
  
  FOREIGN KEY (doctor_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  
  INDEX idx_prescriptions_hospital_id (hospital_id),
  INDEX idx_prescriptions_doctor_id (doctor_id),
  INDEX idx_prescriptions_patient_id (patient_id),
  INDEX idx_prescriptions_appointment_id (appointment_id),
  INDEX idx_prescriptions_status (status),
  INDEX idx_prescriptions_created_at (created_at),
  INDEX idx_prescriptions_template (template_id, template_version_id)
);

-- Prescription values table (individual field values)
CREATE TABLE IF NOT EXISTS prescription_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL,
  section_key TEXT NOT NULL,
  field_key TEXT NOT NULL,
  label TEXT,
  value TEXT,
  rendered_value TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_prescription_values_prescription_id (prescription_id),
  INDEX idx_prescription_values_field_key (field_key),
  INDEX idx_prescription_values_section_key (section_key)
);

-- Prescription audit logs (track changes)
CREATE TABLE IF NOT EXISTS prescription_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_audit_logs_prescription_id (prescription_id),
  INDEX idx_audit_logs_created_at (created_at)
);

-- Add prescription columns to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS prescription_status TEXT DEFAULT 'pending' CHECK (prescription_status IN ('pending', 'draft', 'issued', 'amended', 'cancelled')),
ADD COLUMN IF NOT EXISTS has_prescription BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_appointments_prescription_status ON appointments(prescription_status);
CREATE INDEX IF NOT EXISTS idx_appointments_has_prescription ON appointments(has_prescription);

-- Enable RLS on prescription tables
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Doctor can view own prescriptions
CREATE POLICY "Doctors can view own prescriptions" ON prescriptions
  FOR SELECT
  USING (doctor_id = auth.uid());

-- RLS Policy: Doctor can insert prescriptions
CREATE POLICY "Doctors can create prescriptions" ON prescriptions
  FOR INSERT
  WITH CHECK (
    doctor_id = auth.uid()
    AND created_by = auth.uid()
  );

-- RLS Policy: Doctor can update own prescriptions
CREATE POLICY "Doctors can update own prescriptions" ON prescriptions
  FOR UPDATE
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- RLS Policy: Prescription values follow prescription rules
CREATE POLICY "Prescription values follow prescription access" ON prescription_values
  FOR ALL
  USING (
    prescription_id IN (
      SELECT id FROM prescriptions WHERE doctor_id = auth.uid()
    )
  );

-- RLS Policy: Audit logs follow prescription rules
CREATE POLICY "Audit logs follow prescription access" ON prescription_audit_logs
  FOR SELECT
  USING (
    prescription_id IN (
      SELECT id FROM prescriptions WHERE doctor_id = auth.uid()
    )
  );
