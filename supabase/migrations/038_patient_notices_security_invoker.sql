-- 038: make the patient_notices view obey the notices RLS
--
-- Migration 031 turned patient_notices into a view over `notices` and said it
-- "inherits the base table RLS". It didn't: a Postgres view runs with its
-- OWNER's rights unless it is created with security_invoker, and the owner
-- (postgres) bypasses RLS. So anyone with the public anon key -- not even
-- signed in -- could read every patient-addressed notice of every hospital
-- through the view, while the `notices` table itself correctly returned none.
--
-- security_invoker (Postgres 15+) makes the view run as the caller, so the
-- "Notices read by audience" policy on `notices` applies again: a patient sees
-- platform-wide notices plus those of the hospitals they're registered at.

alter view public.patient_notices set (security_invoker = true);

comment on view public.patient_notices is
  'Compatibility view over the patient-addressed slice of `notices`, so the patient portal keeps working after unification. security_invoker = true, so the base table RLS applies to the caller.';

-- PostgREST caches relationships; reload so the view is picked up cleanly.
notify pgrst, 'reload schema';
