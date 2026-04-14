-- Create hospitals table
CREATE TABLE
    public.hospitals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        registration_no TEXT NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        license_number VARCHAR(64) NOT NULL UNIQUE,
        address TEXT NOT NULL,
        city VARCHAR(64) NOT NULL,
        state VARCHAR(64) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        administrator_name VARCHAR(255) NOT NULL,
        hospital_type VARCHAR(64),
        website TEXT,
        total_beds INTEGER CHECK (total_beds >= 0),
        icu_beds INTEGER CHECK (icu_beds >= 0),
        emergency_services BOOLEAN DEFAULT false,
        inpatient_services BOOLEAN DEFAULT false,
        ambulance_services BOOLEAN DEFAULT false,
        feedback_enabled BOOLEAN DEFAULT false,
        account_status VARCHAR(32) DEFAULT 'Active',
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT current_timestamp,
        updated_at TIMESTAMP DEFAULT current_timestamp
    );

-- Create profiles/users table
CREATE TABLE
    public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
        registration_no TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        mobile TEXT NOT NULL,
        role TEXT NOT NULL,
        status VARCHAR(32) DEFAULT 'active',
        hospital_id TEXT REFERENCES hospitals (registration_no) ON DELETE SET NULL,
        access_granted BOOLEAN DEFAULT false,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT current_timestamp,
        updated_at TIMESTAMP DEFAULT current_timestamp
    );

-- Enable RLS
-- ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- RLS policies disabled for development - will be enabled after testing basic flow
-- TODO: Re-enable RLS with proper policies after registration flow is working
-- RLS Policy for hospitals - Admins can see their own hospital
-- CREATE POLICY "hospitals_read_self_policy" ON public.hospitals FOR
-- SELECT
--     USING (auth.uid () IS NOT NULL);
-- RLS Policy for hospitals - Insert only for authenticated users
-- CREATE POLICY "hospitals_insert_policy" ON public.hospitals FOR INSERT
-- WITH
--     CHECK (auth.uid () IS NOT NULL);
-- RLS Policy for hospitals - Update own hospital
-- CREATE POLICY "hospitals_update_policy" ON public.hospitals FOR
-- UPDATE USING (auth.uid () IS NOT NULL)
-- WITH
--     CHECK (auth.uid () IS NOT NULL);
-- RLS Policy for profiles - Users can see own profile
-- CREATE POLICY "profiles_read_self_policy" ON public.profiles FOR
-- SELECT
--     USING (id = auth.uid ());
-- RLS Policy for profiles - Allow insert during registration
-- CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT
-- WITH
--     CHECK (id = auth.uid ());
-- RLS Policy for profiles - Allow update own profile
-- CREATE POLICY "profiles_update_policy" ON public.profiles FOR
-- UPDATE USING (id = auth.uid ())
-- WITH
--     CHECK (id = auth.uid ());
-- Create indexes
CREATE INDEX idx_profiles_hospital_id ON public.profiles (hospital_id);

CREATE INDEX idx_profiles_email ON public.profiles (email);

CREATE INDEX idx_profiles_role ON public.profiles (role);

CREATE INDEX idx_hospitals_registration_no ON public.hospitals (registration_no);

CREATE INDEX idx_hospitals_email ON public.hospitals (email);