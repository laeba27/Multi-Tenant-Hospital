-- Super admin approval workflow for hospital onboarding
-- 1) New hospitals should start in Pending status
-- 2) Hospital admin login should stay blocked until approval
-- 3) Existing records are normalized to match status/access rules
ALTER TABLE IF EXISTS public.hospitals
ALTER COLUMN account_status
SET DEFAULT 'Pending';

UPDATE public.hospitals
SET
    account_status = 'Pending'
WHERE
    account_status IS NULL
    OR btrim (account_status) = '';

CREATE INDEX IF NOT EXISTS idx_hospitals_account_status ON public.hospitals USING btree (account_status) TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.profiles
ALTER COLUMN access_granted
SET DEFAULT false;

-- Normalize hospital admin access based on hospital account status
UPDATE public.profiles AS p
SET
    access_granted = CASE
        WHEN lower(coalesce(h.account_status, '')) IN ('active', 'approved') THEN true
        ELSE false
    END,
    status = CASE
        WHEN lower(coalesce(h.account_status, '')) IN ('active', 'approved') THEN 'active'
        ELSE 'pending_approval'
    END,
    updated_at = CURRENT_TIMESTAMP
FROM
    public.hospitals AS h
WHERE
    p.role = 'hospital_admin'
    AND p.hospital_id = h.registration_no;

-- Super admins should always be active and have access
UPDATE public.profiles
SET
    access_granted = true,
    status = 'active',
    updated_at = CURRENT_TIMESTAMP
WHERE
    role = 'super_admin'
    AND (
        access_granted IS DISTINCT
        FROM
            true
            OR status IS DISTINCT
        FROM
            'active'
    );