-- Comprehensive migration: Change patient IDs from UUID to TEXT
-- This affects both patients.id and appointments.patient_id

BEGIN;

-- Step 1: Create backups
CREATE TABLE IF NOT EXISTS patients_backup AS SELECT * FROM patients;
CREATE TABLE IF NOT EXISTS appointments_backup AS SELECT * FROM appointments;

-- Step 2: Drop foreign key constraints
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_patient_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_patient_id_fkey;

-- Step 3: Drop primary key constraint on patients
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_pkey;

-- Step 4: Change patients.id from uuid to text
ALTER TABLE patients
ALTER COLUMN id TYPE text USING id::text;

-- Step 5: Recreate primary key on patients
ALTER TABLE patients ADD CONSTRAINT patients_pkey PRIMARY KEY (id);

-- Step 6: Change appointments.patient_id from uuid to text
ALTER TABLE appointments
ALTER COLUMN patient_id TYPE text USING patient_id::text;

-- Step 7: Recreate foreign key constraints
ALTER TABLE appointments
ADD CONSTRAINT appointments_patient_fkey
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

-- Recreate invoices foreign key if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'patient_id') THEN
            ALTER TABLE invoices
            ALTER COLUMN patient_id TYPE text USING patient_id::text;

            ALTER TABLE invoices
            ADD CONSTRAINT invoices_patient_id_fkey
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Step 8: Create/update indexes for performance
DROP INDEX IF EXISTS idx_patients_id;
DROP INDEX IF EXISTS idx_appointments_patient;

CREATE INDEX idx_patients_id ON patients USING btree (id);
CREATE INDEX idx_appointments_patient ON appointments USING btree (patient_id);

-- Verification queries
SELECT
    'patients.id' as column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'patients' AND column_name = 'id'

UNION ALL

SELECT
    'appointments.patient_id' as column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'appointments' AND column_name = 'patient_id';

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully! Patient IDs are now TEXT-based.';
    RAISE NOTICE 'Format: HOSP-PAT-XXXXX (5 digits)';
    RAISE NOTICE 'Example: HOSP-PAT-12345';
END $$;
