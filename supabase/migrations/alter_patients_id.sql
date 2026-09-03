-- Migration: Change patients.id from UUID to TEXT
-- This allows hospital-specific patient IDs like 'HOSP-PAT-12345'

-- Step 1: Create a backup of existing data
CREATE TABLE IF NOT EXISTS patients_backup AS SELECT * FROM patients;

-- Step 2: Drop the primary key constraint
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_pkey;

-- Step 3: Drop foreign key constraints that reference patients.id
-- Note: You may need to drop and recreate these after the type change
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_patient_id_fkey;

-- Step 4: Change the id column type from uuid to text
ALTER TABLE patients
ALTER COLUMN id TYPE text USING id::text;

-- Step 5: Recreate the primary key constraint
ALTER TABLE patients ADD CONSTRAINT patients_pkey PRIMARY KEY (id);

-- Step 6: Recreate foreign key constraints
-- For appointments table
ALTER TABLE appointments
ADD CONSTRAINT appointments_patient_id_fkey
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

-- For invoices table (if it exists and references patients)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        ALTER TABLE invoices
        ADD CONSTRAINT invoices_patient_id_fkey
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_id_text ON patients USING btree (id);
CREATE INDEX IF NOT EXISTS idx_patients_hospital_id_text ON patients USING btree (hospital_id);

-- Verification query
SELECT
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name = 'id';
