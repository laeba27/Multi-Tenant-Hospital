-- Complete fix for patient ID issue
-- Run this entire script in Supabase SQL Editor

-- First, let's check current schema
DO $$
BEGIN
    RAISE NOTICE 'Checking current schema...';
END $$;

SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('patients', 'appointments', 'invoices')
AND column_name IN ('id', 'patient_id')
ORDER BY table_name, column_name;

-- Now fix the schema
BEGIN;

-- Drop all foreign key constraints that reference patients.id
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    FOR fk_record IN
        SELECT
            conname AS constraint_name,
            conrelid::regclass AS table_name
        FROM pg_constraint
        WHERE confrelid = 'public.patients'::regclass
        AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
            fk_record.table_name,
            fk_record.constraint_name);
        RAISE NOTICE 'Dropped constraint: % from %', fk_record.constraint_name, fk_record.table_name;
    END LOOP;
END $$;

-- Drop primary key on patients
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_pkey;
RAISE NOTICE 'Dropped primary key on patients';

-- Change patients.id to text
ALTER TABLE patients
ALTER COLUMN id TYPE text USING id::text;
RAISE NOTICE 'Changed patients.id to text';

-- Recreate primary key
ALTER TABLE patients ADD CONSTRAINT patients_pkey PRIMARY KEY (id);
RAISE NOTICE 'Recreated primary key on patients';

-- Change appointments.patient_id to text
ALTER TABLE appointments
ALTER COLUMN patient_id TYPE text USING patient_id::text;
RAISE NOTICE 'Changed appointments.patient_id to text';

-- Change invoices.patient_id to text if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'patient_id') THEN
            ALTER TABLE invoices
            ALTER COLUMN patient_id TYPE text USING patient_id::text;
            RAISE NOTICE 'Changed invoices.patient_id to text';
        END IF;
    END IF;
END $$;

-- Recreate all foreign key constraints
ALTER TABLE appointments
ADD CONSTRAINT appointments_patient_fkey
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
RAISE NOTICE 'Recreated appointments foreign key';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'patient_id') THEN
            ALTER TABLE invoices
            ADD CONSTRAINT invoices_patient_id_fkey
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
            RAISE NOTICE 'Recreated invoices foreign key';
        END IF;
    END IF;
END $$;

COMMIT;

-- Verify the changes
DO $$
BEGIN
    RAISE NOTICE 'Schema updated successfully!';
END $$;

SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('patients', 'appointments', 'invoices')
AND column_name IN ('id', 'patient_id')
ORDER BY table_name, column_name;
