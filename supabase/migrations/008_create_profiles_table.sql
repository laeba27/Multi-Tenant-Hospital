-- Create profiles table with complete schema
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  registration_no text NOT NULL UNIQUE,
  name text NOT NULL,
  email text UNIQUE,
  mobile text NOT NULL,
  role text NOT NULL,
  status character varying(32) DEFAULT 'active'::character varying,
  hospital_id text,
  access_granted boolean DEFAULT false,
  avatar_url text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  gender text,
  date_of_birth date,
  address text,
  city text,
  state text,
  pincode text,
  country text,
  aadhaar_number text,
  blood_group text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_email_key UNIQUE (email),
  CONSTRAINT profiles_registration_no_key UNIQUE (registration_no),
  CONSTRAINT profiles_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES hospitals (registration_no) ON DELETE SET NULL,
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_hospital_id ON public.profiles USING btree (hospital_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles USING btree (email) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles USING btree (role) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Hospital admins can view their staff profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hospital_admin'
    ) AND hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
