-- =========================================================
-- File uploads: one table for every attachment in the product.
--
-- Files themselves live in Cloudflare R2 (a PRIVATE bucket). Postgres stores
-- only the object key + metadata, and is the sole authority on who may read a
-- file. R2 has no row-level security, so this table IS the access control:
-- nothing is ever served from a public URL. A download goes through a server
-- action that checks ownership here, then mints a short-lived signed URL.
--
-- Five surfaces, one table, discriminated by `scope`:
--   avatar          -- profile picture           (owner: a profile)
--   hospital_media  -- hospital gallery/social   (owner: a hospital)  [PUBLIC]
--   notice_media    -- image on a quick update   (owner: a hospital)  [PUBLIC]
--   prescription    -- an uploaded prescription  (owner: a patient)   [PRIVATE]
--   medical_report  -- lab/blood/history reports (owner: a patient)   [PRIVATE]
-- =========================================================

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),

  scope text not null
    check (scope in ('avatar', 'hospital_media', 'notice_media', 'prescription', 'medical_report')),

  -- The R2 object key, e.g. 'medical_report/HOSP48789/<patient>/<uuid>.pdf'.
  -- Unique because two rows pointing at one object would let a delete on either
  -- orphan the other.
  storage_key text not null unique,

  -- Descriptive metadata, kept so the UI can render a file list without R2.
  file_name text not null,          -- original name, for the download prompt
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),

  -- ── Ownership. Exactly one of these anchors the file. ──
  -- Which one is required depends on `scope` (see the check below).
  --
  -- Types follow the LIVE schema, which diverged from the migration files:
  -- profiles.id is a uuid (it mirrors auth.users), but patients.id is TEXT --
  -- it holds the human-readable hospital patient number, e.g. 'HOSP-PAT-59588'
  -- -- and hospitals are keyed by registration_no ('HOSP48789'), also text.
  profile_id uuid references public.profiles (id) on delete cascade,
  hospital_id text references public.hospitals (registration_no) on delete cascade,
  patient_id text references public.patients (id) on delete cascade,

  -- Optional links, so a report can hang off a specific visit or notice.
  appointment_id text references public.appointments (id) on delete set null,
  notice_id uuid references public.patient_notices (id) on delete cascade,

  -- ── Provenance. A doctor must be able to tell an official lab report from a
  -- phone photo the patient uploaded themselves. ──
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_by_role text not null default 'staff'
    check (uploaded_by_role in ('patient', 'staff')),

  -- Free-text, e.g. 'Blood test — CBC', 'X-ray left knee'.
  title text,
  description text,
  -- 'lab_report' | 'blood_report' | 'x_ray' | 'discharge_summary' | 'other'
  document_type text,

  -- Public files (hospital gallery, notice images) are cacheable and may be
  -- served via the R2 public domain. Private ones NEVER are.
  is_public boolean not null default false,

  -- Soft delete: a deleted medical record should remain auditable.
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Each scope must carry the owner it is addressed by. Without this, a
  -- medical_report with a null patient_id would be readable by nobody -- or,
  -- worse, match a policy that forgot to check for null.
  constraint documents_scope_owner check (
    (scope = 'avatar'         and profile_id  is not null) or
    (scope = 'hospital_media' and hospital_id is not null) or
    (scope = 'notice_media'   and hospital_id is not null) or
    (scope = 'prescription'   and patient_id  is not null and hospital_id is not null) or
    (scope = 'medical_report' and patient_id  is not null and hospital_id is not null)
  ),

  -- Medical records must never be marked public. Belt and braces: the upload
  -- action also refuses, but a bug there shouldn't be able to expose a report.
  constraint documents_medical_never_public check (
    not (is_public and scope in ('prescription', 'medical_report'))
  )
);

create index if not exists idx_documents_patient
  on public.documents (patient_id, scope, created_at desc)
  where deleted_at is null;

create index if not exists idx_documents_hospital
  on public.documents (hospital_id, scope, created_at desc)
  where deleted_at is null;

create index if not exists idx_documents_profile
  on public.documents (profile_id, scope)
  where deleted_at is null;

create index if not exists idx_documents_notice
  on public.documents (notice_id)
  where deleted_at is null;

alter table public.documents enable row level security;

-- ---------------------------------------------------------
-- Read policies.
--
-- These gate the metadata row. Because the R2 bucket is private and every
-- download is signed by a server action that re-checks ownership, "can you see
-- the row" and "can you fetch the bytes" are the same question.
-- ---------------------------------------------------------

-- Anyone signed in may read PUBLIC media (hospital gallery, notice images).
drop policy if exists "Public media is readable" on public.documents;
create policy "Public media is readable" on public.documents
  for select to authenticated
  using (is_public = true and deleted_at is null);

-- Your own avatar.
drop policy if exists "Users read their own avatar" on public.documents;
create policy "Users read their own avatar" on public.documents
  for select to authenticated
  using (scope = 'avatar' and profile_id = auth.uid() and deleted_at is null);

-- A patient reads their OWN medical documents -- whoever uploaded them.
drop policy if exists "Patients read their own documents" on public.documents;
create policy "Patients read their own documents" on public.documents
  for select to authenticated
  using (
    deleted_at is null
    and patient_id in (
      select p.id from public.patients p where p.profile_id = auth.uid()
    )
  );

-- Hospital staff read documents belonging to their own hospital.
drop policy if exists "Staff read their hospital documents" on public.documents;
create policy "Staff read their hospital documents" on public.documents
  for select to authenticated
  using (
    deleted_at is null
    and hospital_id in (
      select pr.hospital_id from public.profiles pr
      where pr.id = auth.uid()
        and pr.role in ('hospital_admin', 'doctor', 'receptionist', 'reception', 'staff')
    )
  );

drop policy if exists "Super admins read all documents" on public.documents;
create policy "Super admins read all documents" on public.documents
  for select to authenticated
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'super_admin')
  );

-- No insert/update/delete policies for `authenticated`. Writes go through
-- server actions on the service-role client, which upload to R2 and record the
-- row in one place -- so a metadata row can never point at a file that was
-- never stored, and vice versa.

comment on table public.documents is
  'Every uploaded file. Bytes live in a private Cloudflare R2 bucket; this table is the access-control authority. Private files (prescriptions, medical reports) are served only via short-lived signed URLs minted by a server action after an ownership check.';
comment on column public.documents.uploaded_by_role is
  'Whether a patient or hospital staff uploaded this. Lets a doctor distinguish an official hospital-issued report from supporting material the patient added themselves.';
comment on column public.documents.storage_key is
  'The R2 object key. Never a URL -- private objects have no stable public URL by design.';
