-- =========================================================
-- Prescription System
-- Scalable, template-driven architecture for multi-specialty use
-- =========================================================

create table if not exists public.prescription_templates (
  id uuid primary key default gen_random_uuid(),
  hospital_id text references public.hospitals (registration_no) on delete cascade,
  doctor_id uuid references public.staff (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  source_template_id uuid references public.prescription_templates (id) on delete set null,
  template_key text not null,
  name text not null,
  description text,
  specialty_key text,
  department_id uuid references public.departments (id) on delete set null,
  visibility text not null default 'doctor' check (visibility in ('system', 'hospital', 'doctor')),
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  is_default boolean not null default false,
  current_version integer not null default 1,
  layout_config jsonb not null default '{}'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescription_templates_scope_check check (
    (visibility = 'system' and hospital_id is null and doctor_id is null)
    or (visibility = 'hospital' and hospital_id is not null)
    or (visibility = 'doctor' and hospital_id is not null and doctor_id is not null)
  )
);

create table if not exists public.prescription_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.prescription_templates (id) on delete cascade,
  version_number integer not null,
  version_label text,
  change_summary text,
  created_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz not null default now(),
  snapshot jsonb not null default '{}'::jsonb,
  unique (template_id, version_number)
);

create table if not exists public.prescription_option_sets (
  id uuid primary key default gen_random_uuid(),
  hospital_id text references public.hospitals (registration_no) on delete cascade,
  doctor_id uuid references public.staff (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  set_key text not null,
  name text not null,
  description text,
  category text not null,
  visibility text not null default 'doctor' check (visibility in ('system', 'hospital', 'doctor')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescription_option_sets_scope_check check (
    (visibility = 'system' and hospital_id is null and doctor_id is null)
    or (visibility = 'hospital' and hospital_id is not null)
    or (visibility = 'doctor' and hospital_id is not null and doctor_id is not null)
  )
);

create table if not exists public.prescription_option_items (
  id uuid primary key default gen_random_uuid(),
  option_set_id uuid not null references public.prescription_option_sets (id) on delete cascade,
  item_key text not null,
  label text not null,
  value jsonb not null default '{}'::jsonb,
  synonyms jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (option_set_id, item_key)
);

create table if not exists public.prescription_template_sections (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.prescription_template_versions (id) on delete cascade,
  section_key text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  column_span integer not null default 1,
  is_required boolean not null default false,
  is_removable boolean not null default true,
  ui_config jsonb not null default '{}'::jsonb,
  unique (version_id, section_key)
);

create table if not exists public.prescription_template_fields (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.prescription_template_versions (id) on delete cascade,
  section_id uuid not null references public.prescription_template_sections (id) on delete cascade,
  option_set_id uuid references public.prescription_option_sets (id) on delete set null,
  field_key text not null,
  label text not null,
  helper_text text,
  field_type text not null check (
    field_type in (
      'text',
      'textarea',
      'number',
      'date',
      'datetime',
      'select',
      'multi_select',
      'checkbox',
      'radio',
      'switch',
      'json',
      'medication_list'
    )
  ),
  value_mode text not null default 'scalar' check (value_mode in ('scalar', 'array', 'object')),
  placeholder text,
  unit_label text,
  sort_order integer not null default 0,
  width integer not null default 1,
  is_required boolean not null default false,
  is_removable boolean not null default true,
  is_repeatable boolean not null default false,
  is_locked boolean not null default false,
  default_value jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  ui_config jsonb not null default '{}'::jsonb,
  unique (version_id, field_key)
);

create table if not exists public.prescription_presets (
  id uuid primary key default gen_random_uuid(),
  hospital_id text references public.hospitals (registration_no) on delete cascade,
  doctor_id uuid references public.staff (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  template_id uuid references public.prescription_templates (id) on delete cascade,
  template_version_id uuid references public.prescription_template_versions (id) on delete set null,
  preset_key text not null,
  name text not null,
  description text,
  visibility text not null default 'doctor' check (visibility in ('system', 'hospital', 'doctor')),
  is_favorite boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescription_presets_scope_check check (
    (visibility = 'system' and hospital_id is null and doctor_id is null)
    or (visibility = 'hospital' and hospital_id is not null)
    or (visibility = 'doctor' and hospital_id is not null and doctor_id is not null)
  )
);

create table if not exists public.prescription_preset_values (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references public.prescription_presets (id) on delete cascade,
  field_id uuid not null references public.prescription_template_fields (id) on delete cascade,
  value jsonb not null,
  unique (preset_id, field_id)
);

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals (registration_no) on delete cascade,
  doctor_id uuid not null references public.staff (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  patient_id uuid not null references public.patients (id) on delete cascade,
  appointment_id text references public.appointments (id) on delete set null,
  template_id uuid references public.prescription_templates (id) on delete set null,
  template_version_id uuid references public.prescription_template_versions (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'issued', 'amended', 'cancelled')),
  clinical_summary text,
  follow_up_date date,
  template_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prescription_values (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  field_id uuid references public.prescription_template_fields (id) on delete set null,
  section_key text,
  field_key text not null,
  label text,
  value jsonb not null,
  rendered_value text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.prescription_audit_logs (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type in ('created', 'updated', 'issued', 'amended', 'cancelled', 'shared')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_prescription_templates_scope
  on public.prescription_templates (visibility, hospital_id, doctor_id);

create index if not exists idx_prescription_templates_department
  on public.prescription_templates (department_id, specialty_key);

create index if not exists idx_prescription_template_versions_template
  on public.prescription_template_versions (template_id, version_number desc);

create index if not exists idx_prescription_template_sections_version
  on public.prescription_template_sections (version_id, sort_order);

create index if not exists idx_prescription_template_fields_version
  on public.prescription_template_fields (version_id, section_id, sort_order);

create index if not exists idx_prescription_option_sets_scope
  on public.prescription_option_sets (visibility, hospital_id, doctor_id, category);

create index if not exists idx_prescription_option_items_set
  on public.prescription_option_items (option_set_id, sort_order);

create index if not exists idx_prescription_presets_scope
  on public.prescription_presets (visibility, hospital_id, doctor_id, template_id);

create index if not exists idx_prescriptions_hospital_doctor
  on public.prescriptions (hospital_id, doctor_id, created_at desc);

create index if not exists idx_prescriptions_patient
  on public.prescriptions (patient_id, created_at desc);

create index if not exists idx_prescriptions_appointment
  on public.prescriptions (appointment_id);

create index if not exists idx_prescription_values_prescription
  on public.prescription_values (prescription_id, sort_order);

create index if not exists idx_prescription_audit_logs_prescription
  on public.prescription_audit_logs (prescription_id, created_at desc);

alter table public.prescription_templates enable row level security;
alter table public.prescription_template_versions enable row level security;
alter table public.prescription_template_sections enable row level security;
alter table public.prescription_template_fields enable row level security;
alter table public.prescription_option_sets enable row level security;
alter table public.prescription_option_items enable row level security;
alter table public.prescription_presets enable row level security;
alter table public.prescription_preset_values enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_values enable row level security;
alter table public.prescription_audit_logs enable row level security;

create policy "Prescription templates read by scope" on public.prescription_templates
  for select
  using (
    visibility = 'system'
    or hospital_id = (select hospital_id from public.profiles where id = auth.uid())
  );

create policy "Prescription templates manage by doctor or hospital admin" on public.prescription_templates
  for all
  using (
    visibility <> 'system'
    and hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('doctor', 'hospital_admin')
    )
  )
  with check (
    visibility <> 'system'
    and hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('doctor', 'hospital_admin')
    )
  );

create policy "Prescription template versions read by template scope" on public.prescription_template_versions
  for select
  using (
    exists (
      select 1
      from public.prescription_templates t
      where t.id = prescription_template_versions.template_id
        and (t.visibility = 'system' or t.hospital_id = (select hospital_id from public.profiles where id = auth.uid()))
    )
  );

create policy "Prescription template versions manage by template scope" on public.prescription_template_versions
  for all
  using (
    exists (
      select 1
      from public.prescription_templates t
      join public.profiles p on p.id = auth.uid()
      where t.id = prescription_template_versions.template_id
        and t.visibility <> 'system'
        and t.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.prescription_templates t
      join public.profiles p on p.id = auth.uid()
      where t.id = prescription_template_versions.template_id
        and t.visibility <> 'system'
        and t.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  );

create policy "Prescription sections read by template scope" on public.prescription_template_sections
  for select
  using (
    exists (
      select 1
      from public.prescription_template_versions v
      join public.prescription_templates t on t.id = v.template_id
      where v.id = prescription_template_sections.version_id
        and (t.visibility = 'system' or t.hospital_id = (select hospital_id from public.profiles where id = auth.uid()))
    )
  );

create policy "Prescription sections manage by template scope" on public.prescription_template_sections
  for all
  using (
    exists (
      select 1
      from public.prescription_template_versions v
      join public.prescription_templates t on t.id = v.template_id
      join public.profiles p on p.id = auth.uid()
      where v.id = prescription_template_sections.version_id
        and t.visibility <> 'system'
        and t.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.prescription_template_versions v
      join public.prescription_templates t on t.id = v.template_id
      join public.profiles p on p.id = auth.uid()
      where v.id = prescription_template_sections.version_id
        and t.visibility <> 'system'
        and t.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  );

create policy "Prescription fields read by template scope" on public.prescription_template_fields
  for select
  using (
    exists (
      select 1
      from public.prescription_template_versions v
      join public.prescription_templates t on t.id = v.template_id
      where v.id = prescription_template_fields.version_id
        and (t.visibility = 'system' or t.hospital_id = (select hospital_id from public.profiles where id = auth.uid()))
    )
  );

create policy "Prescription fields manage by template scope" on public.prescription_template_fields
  for all
  using (
    exists (
      select 1
      from public.prescription_template_versions v
      join public.prescription_templates t on t.id = v.template_id
      join public.profiles p on p.id = auth.uid()
      where v.id = prescription_template_fields.version_id
        and t.visibility <> 'system'
        and t.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.prescription_template_versions v
      join public.prescription_templates t on t.id = v.template_id
      join public.profiles p on p.id = auth.uid()
      where v.id = prescription_template_fields.version_id
        and t.visibility <> 'system'
        and t.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  );

create policy "Prescription option sets read by scope" on public.prescription_option_sets
  for select
  using (
    visibility = 'system'
    or hospital_id = (select hospital_id from public.profiles where id = auth.uid())
  );

create policy "Prescription option sets manage by doctor or hospital admin" on public.prescription_option_sets
  for all
  using (
    visibility <> 'system'
    and hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('doctor', 'hospital_admin')
    )
  )
  with check (
    visibility <> 'system'
    and hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('doctor', 'hospital_admin')
    )
  );

create policy "Prescription option items read by option scope" on public.prescription_option_items
  for select
  using (
    exists (
      select 1
      from public.prescription_option_sets s
      where s.id = prescription_option_items.option_set_id
        and (s.visibility = 'system' or s.hospital_id = (select hospital_id from public.profiles where id = auth.uid()))
    )
  );

create policy "Prescription option items manage by option scope" on public.prescription_option_items
  for all
  using (
    exists (
      select 1
      from public.prescription_option_sets s
      join public.profiles p on p.id = auth.uid()
      where s.id = prescription_option_items.option_set_id
        and s.visibility <> 'system'
        and s.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.prescription_option_sets s
      join public.profiles p on p.id = auth.uid()
      where s.id = prescription_option_items.option_set_id
        and s.visibility <> 'system'
        and s.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  );

create policy "Prescription presets read by scope" on public.prescription_presets
  for select
  using (
    visibility = 'system'
    or hospital_id = (select hospital_id from public.profiles where id = auth.uid())
  );

create policy "Prescription presets manage by doctor or hospital admin" on public.prescription_presets
  for all
  using (
    visibility <> 'system'
    and hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('doctor', 'hospital_admin')
    )
  )
  with check (
    visibility <> 'system'
    and hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('doctor', 'hospital_admin')
    )
  );

create policy "Prescription preset values read by preset scope" on public.prescription_preset_values
  for select
  using (
    exists (
      select 1
      from public.prescription_presets pr
      where pr.id = prescription_preset_values.preset_id
        and (pr.visibility = 'system' or pr.hospital_id = (select hospital_id from public.profiles where id = auth.uid()))
    )
  );

create policy "Prescription preset values manage by preset scope" on public.prescription_preset_values
  for all
  using (
    exists (
      select 1
      from public.prescription_presets pr
      join public.profiles p on p.id = auth.uid()
      where pr.id = prescription_preset_values.preset_id
        and pr.visibility <> 'system'
        and pr.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.prescription_presets pr
      join public.profiles p on p.id = auth.uid()
      where pr.id = prescription_preset_values.preset_id
        and pr.visibility <> 'system'
        and pr.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  );

create policy "Prescriptions read by hospital scope" on public.prescriptions
  for select
  using (
    hospital_id = (select hospital_id from public.profiles where id = auth.uid())
  );

create policy "Prescriptions manage by doctor or hospital admin" on public.prescriptions
  for all
  using (
    hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('doctor', 'hospital_admin')
    )
  )
  with check (
    hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('doctor', 'hospital_admin')
    )
  );

create policy "Prescription values read by prescription scope" on public.prescription_values
  for select
  using (
    exists (
      select 1
      from public.prescriptions pr
      where pr.id = prescription_values.prescription_id
        and pr.hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    )
  );

create policy "Prescription values manage by prescription scope" on public.prescription_values
  for all
  using (
    exists (
      select 1
      from public.prescriptions pr
      join public.profiles p on p.id = auth.uid()
      where pr.id = prescription_values.prescription_id
        and pr.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.prescriptions pr
      join public.profiles p on p.id = auth.uid()
      where pr.id = prescription_values.prescription_id
        and pr.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  );

create policy "Prescription audit logs read by prescription scope" on public.prescription_audit_logs
  for select
  using (
    exists (
      select 1
      from public.prescriptions pr
      where pr.id = prescription_audit_logs.prescription_id
        and pr.hospital_id = (select hospital_id from public.profiles where id = auth.uid())
    )
  );

create policy "Prescription audit logs insert by prescription scope" on public.prescription_audit_logs
  for insert
  with check (
    exists (
      select 1
      from public.prescriptions pr
      join public.profiles p on p.id = auth.uid()
      where pr.id = prescription_audit_logs.prescription_id
        and pr.hospital_id = p.hospital_id
        and p.role in ('doctor', 'hospital_admin')
    )
  );
