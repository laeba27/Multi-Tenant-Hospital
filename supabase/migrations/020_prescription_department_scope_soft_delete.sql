-- =========================================================
-- Prescription system: department scope + soft delete + allow other
-- =========================================================
-- Add department scope support
alter table if exists public.prescription_option_sets
add column if not exists department_id uuid references public.departments (id) on delete set null;

alter table if exists public.prescription_presets
add column if not exists department_id uuid references public.departments (id) on delete set null;

-- Add soft delete columns
alter table if exists public.prescription_templates
add column if not exists deleted_at timestamptz;

alter table if exists public.prescription_template_versions
add column if not exists deleted_at timestamptz;

alter table if exists public.prescription_template_sections
add column if not exists deleted_at timestamptz;

alter table if exists public.prescription_template_fields
add column if not exists deleted_at timestamptz;

alter table if exists public.prescription_option_sets
add column if not exists deleted_at timestamptz;

alter table if exists public.prescription_option_items
add column if not exists deleted_at timestamptz;

alter table if exists public.prescription_presets
add column if not exists deleted_at timestamptz;

alter table if exists public.prescription_preset_values
add column if not exists deleted_at timestamptz;

alter table if exists public.prescriptions
add column if not exists deleted_at timestamptz;

alter table if exists public.prescription_values
add column if not exists deleted_at timestamptz;

-- Allow "other" input for option-backed fields
alter table if exists public.prescription_template_fields
add column if not exists allow_other boolean not null default false,
add column if not exists other_label text,
add column if not exists other_placeholder text;

-- Update visibility constraints for department scope
alter table if exists public.prescription_templates
drop constraint if exists prescription_templates_scope_check;

alter table if exists public.prescription_templates add constraint prescription_templates_scope_check check (
    (
        visibility = 'system'
        and hospital_id is null
        and doctor_id is null
        and department_id is null
    )
    or (
        visibility = 'hospital'
        and hospital_id is not null
    )
    or (
        visibility = 'department'
        and hospital_id is not null
        and department_id is not null
    )
    or (
        visibility = 'doctor'
        and hospital_id is not null
        and doctor_id is not null
    )
);

alter table if exists public.prescription_option_sets
drop constraint if exists prescription_option_sets_scope_check;

alter table if exists public.prescription_option_sets add constraint prescription_option_sets_scope_check check (
    (
        visibility = 'system'
        and hospital_id is null
        and doctor_id is null
        and department_id is null
    )
    or (
        visibility = 'hospital'
        and hospital_id is not null
    )
    or (
        visibility = 'department'
        and hospital_id is not null
        and department_id is not null
    )
    or (
        visibility = 'doctor'
        and hospital_id is not null
        and doctor_id is not null
    )
);

alter table if exists public.prescription_presets
drop constraint if exists prescription_presets_scope_check;

alter table if exists public.prescription_presets add constraint prescription_presets_scope_check check (
    (
        visibility = 'system'
        and hospital_id is null
        and doctor_id is null
        and department_id is null
    )
    or (
        visibility = 'hospital'
        and hospital_id is not null
    )
    or (
        visibility = 'department'
        and hospital_id is not null
        and department_id is not null
    )
    or (
        visibility = 'doctor'
        and hospital_id is not null
        and doctor_id is not null
    )
);

-- Indexes for new columns
create index if not exists idx_prescription_option_sets_department on public.prescription_option_sets (department_id);

create index if not exists idx_prescription_presets_department on public.prescription_presets (department_id);

create index if not exists idx_prescription_templates_deleted_at on public.prescription_templates (deleted_at);

create index if not exists idx_prescription_option_sets_deleted_at on public.prescription_option_sets (deleted_at);

create index if not exists idx_prescription_presets_deleted_at on public.prescription_presets (deleted_at);

create index if not exists idx_prescriptions_deleted_at on public.prescriptions (deleted_at);

-- Update RLS policies to include department scope and soft delete
-- Templates
drop policy if exists "Prescription templates read by scope" on public.prescription_templates;

create policy "Prescription templates read by scope" on public.prescription_templates for
select
    using (
        deleted_at is null
        and (
            visibility = 'system'
            or (
                hospital_id = (
                    select
                        hospital_id
                    from
                        public.profiles
                    where
                        id = auth.uid ()
                )
                and (
                    visibility <> 'department'
                    or exists (
                        select
                            1
                        from
                            public.staff s
                            join public.profiles p on p.registration_no = s.employee_registration_no
                        where
                            p.id = auth.uid ()
                            and s.department_id = prescription_templates.department_id
                    )
                    or exists (
                        select
                            1
                        from
                            public.profiles p
                        where
                            p.id = auth.uid ()
                            and p.role = 'hospital_admin'
                    )
                )
            )
        )
    );

drop policy if exists "Prescription templates manage by doctor or hospital admin" on public.prescription_templates;

create policy "Prescription templates manage by doctor or hospital admin" on public.prescription_templates for all using (
    deleted_at is null
    and visibility <> 'system'
    and hospital_id = (
        select
            hospital_id
        from
            public.profiles
        where
            id = auth.uid ()
    )
    and (
        exists (
            select
                1
            from
                public.profiles p
            where
                p.id = auth.uid ()
                and p.role = 'hospital_admin'
        )
        or exists (
            select
                1
            from
                public.staff s
                join public.profiles p on p.registration_no = s.employee_registration_no
            where
                p.id = auth.uid ()
                and (
                    (
                        prescription_templates.visibility = 'doctor'
                        and s.id = prescription_templates.doctor_id
                    )
                    or (
                        prescription_templates.visibility = 'department'
                        and s.department_id = prescription_templates.department_id
                    )
                    or (prescription_templates.visibility = 'hospital')
                )
        )
    )
)
with
    check (
        visibility <> 'system'
        and hospital_id = (
            select
                hospital_id
            from
                public.profiles
            where
                id = auth.uid ()
        )
        and (
            exists (
                select
                    1
                from
                    public.profiles p
                where
                    p.id = auth.uid ()
                    and p.role = 'hospital_admin'
            )
            or exists (
                select
                    1
                from
                    public.staff s
                    join public.profiles p on p.registration_no = s.employee_registration_no
                where
                    p.id = auth.uid ()
                    and (
                        (
                            prescription_templates.visibility = 'doctor'
                            and s.id = prescription_templates.doctor_id
                        )
                        or (
                            prescription_templates.visibility = 'department'
                            and s.department_id = prescription_templates.department_id
                        )
                        or (prescription_templates.visibility = 'hospital')
                    )
            )
        )
    );

-- Template versions
drop policy if exists "Prescription template versions read by template scope" on public.prescription_template_versions;

create policy "Prescription template versions read by template scope" on public.prescription_template_versions for
select
    using (
        deleted_at is null
        and exists (
            select
                1
            from
                public.prescription_templates t
            where
                t.id = prescription_template_versions.template_id
                and t.deleted_at is null
                and (
                    t.visibility = 'system'
                    or (
                        t.hospital_id = (
                            select
                                hospital_id
                            from
                                public.profiles
                            where
                                id = auth.uid ()
                        )
                        and (
                            t.visibility <> 'department'
                            or exists (
                                select
                                    1
                                from
                                    public.staff s
                                    join public.profiles p on p.registration_no = s.employee_registration_no
                                where
                                    p.id = auth.uid ()
                                    and s.department_id = t.department_id
                            )
                            or exists (
                                select
                                    1
                                from
                                    public.profiles p
                                where
                                    p.id = auth.uid ()
                                    and p.role = 'hospital_admin'
                            )
                        )
                    )
                )
        )
    );

drop policy if exists "Prescription template versions manage by template scope" on public.prescription_template_versions;

create policy "Prescription template versions manage by template scope" on public.prescription_template_versions for all using (
    deleted_at is null
    and exists (
        select
            1
        from
            public.prescription_templates t
            join public.profiles p on p.id = auth.uid ()
        where
            t.id = prescription_template_versions.template_id
            and t.deleted_at is null
            and t.visibility <> 'system'
            and t.hospital_id = p.hospital_id
            and (
                p.role = 'hospital_admin'
                or exists (
                    select
                        1
                    from
                        public.staff s
                    where
                        s.employee_registration_no = p.registration_no
                        and (
                            (
                                t.visibility = 'doctor'
                                and s.id = t.doctor_id
                            )
                            or (
                                t.visibility = 'department'
                                and s.department_id = t.department_id
                            )
                            or (t.visibility = 'hospital')
                        )
                )
            )
    )
)
with
    check (
        exists (
            select
                1
            from
                public.prescription_templates t
                join public.profiles p on p.id = auth.uid ()
            where
                t.id = prescription_template_versions.template_id
                and t.deleted_at is null
                and t.visibility <> 'system'
                and t.hospital_id = p.hospital_id
                and (
                    p.role = 'hospital_admin'
                    or exists (
                        select
                            1
                        from
                            public.staff s
                        where
                            s.employee_registration_no = p.registration_no
                            and (
                                (
                                    t.visibility = 'doctor'
                                    and s.id = t.doctor_id
                                )
                                or (
                                    t.visibility = 'department'
                                    and s.department_id = t.department_id
                                )
                                or (t.visibility = 'hospital')
                            )
                    )
                )
        )
    );

-- Sections
drop policy if exists "Prescription sections read by template scope" on public.prescription_template_sections;

create policy "Prescription sections read by template scope" on public.prescription_template_sections for
select
    using (
        deleted_at is null
        and exists (
            select
                1
            from
                public.prescription_template_versions v
                join public.prescription_templates t on t.id = v.template_id
            where
                v.id = prescription_template_sections.version_id
                and v.deleted_at is null
                and t.deleted_at is null
                and (
                    t.visibility = 'system'
                    or (
                        t.hospital_id = (
                            select
                                hospital_id
                            from
                                public.profiles
                            where
                                id = auth.uid ()
                        )
                        and (
                            t.visibility <> 'department'
                            or exists (
                                select
                                    1
                                from
                                    public.staff s
                                    join public.profiles p on p.registration_no = s.employee_registration_no
                                where
                                    p.id = auth.uid ()
                                    and s.department_id = t.department_id
                            )
                            or exists (
                                select
                                    1
                                from
                                    public.profiles p
                                where
                                    p.id = auth.uid ()
                                    and p.role = 'hospital_admin'
                            )
                        )
                    )
                )
        )
    );

drop policy if exists "Prescription sections manage by template scope" on public.prescription_template_sections;

create policy "Prescription sections manage by template scope" on public.prescription_template_sections for all using (
    deleted_at is null
    and exists (
        select
            1
        from
            public.prescription_template_versions v
            join public.prescription_templates t on t.id = v.template_id
            join public.profiles p on p.id = auth.uid ()
        where
            v.id = prescription_template_sections.version_id
            and v.deleted_at is null
            and t.deleted_at is null
            and t.visibility <> 'system'
            and t.hospital_id = p.hospital_id
            and (
                p.role = 'hospital_admin'
                or exists (
                    select
                        1
                    from
                        public.staff s
                    where
                        s.employee_registration_no = p.registration_no
                        and (
                            (
                                t.visibility = 'doctor'
                                and s.id = t.doctor_id
                            )
                            or (
                                t.visibility = 'department'
                                and s.department_id = t.department_id
                            )
                            or (t.visibility = 'hospital')
                        )
                )
            )
    )
)
with
    check (
        exists (
            select
                1
            from
                public.prescription_template_versions v
                join public.prescription_templates t on t.id = v.template_id
                join public.profiles p on p.id = auth.uid ()
            where
                v.id = prescription_template_sections.version_id
                and v.deleted_at is null
                and t.deleted_at is null
                and t.visibility <> 'system'
                and t.hospital_id = p.hospital_id
                and (
                    p.role = 'hospital_admin'
                    or exists (
                        select
                            1
                        from
                            public.staff s
                        where
                            s.employee_registration_no = p.registration_no
                            and (
                                (
                                    t.visibility = 'doctor'
                                    and s.id = t.doctor_id
                                )
                                or (
                                    t.visibility = 'department'
                                    and s.department_id = t.department_id
                                )
                                or (t.visibility = 'hospital')
                            )
                    )
                )
        )
    );

-- Fields
drop policy if exists "Prescription fields read by template scope" on public.prescription_template_fields;

create policy "Prescription fields read by template scope" on public.prescription_template_fields for
select
    using (
        deleted_at is null
        and exists (
            select
                1
            from
                public.prescription_template_versions v
                join public.prescription_templates t on t.id = v.template_id
            where
                v.id = prescription_template_fields.version_id
                and v.deleted_at is null
                and t.deleted_at is null
                and (
                    t.visibility = 'system'
                    or (
                        t.hospital_id = (
                            select
                                hospital_id
                            from
                                public.profiles
                            where
                                id = auth.uid ()
                        )
                        and (
                            t.visibility <> 'department'
                            or exists (
                                select
                                    1
                                from
                                    public.staff s
                                    join public.profiles p on p.registration_no = s.employee_registration_no
                                where
                                    p.id = auth.uid ()
                                    and s.department_id = t.department_id
                            )
                            or exists (
                                select
                                    1
                                from
                                    public.profiles p
                                where
                                    p.id = auth.uid ()
                                    and p.role = 'hospital_admin'
                            )
                        )
                    )
                )
        )
    );

drop policy if exists "Prescription fields manage by template scope" on public.prescription_template_fields;

create policy "Prescription fields manage by template scope" on public.prescription_template_fields for all using (
    deleted_at is null
    and exists (
        select
            1
        from
            public.prescription_template_versions v
            join public.prescription_templates t on t.id = v.template_id
            join public.profiles p on p.id = auth.uid ()
        where
            v.id = prescription_template_fields.version_id
            and v.deleted_at is null
            and t.deleted_at is null
            and t.visibility <> 'system'
            and t.hospital_id = p.hospital_id
            and (
                p.role = 'hospital_admin'
                or exists (
                    select
                        1
                    from
                        public.staff s
                    where
                        s.employee_registration_no = p.registration_no
                        and (
                            (
                                t.visibility = 'doctor'
                                and s.id = t.doctor_id
                            )
                            or (
                                t.visibility = 'department'
                                and s.department_id = t.department_id
                            )
                            or (t.visibility = 'hospital')
                        )
                )
            )
    )
)
with
    check (
        exists (
            select
                1
            from
                public.prescription_template_versions v
                join public.prescription_templates t on t.id = v.template_id
                join public.profiles p on p.id = auth.uid ()
            where
                v.id = prescription_template_fields.version_id
                and v.deleted_at is null
                and t.deleted_at is null
                and t.visibility <> 'system'
                and t.hospital_id = p.hospital_id
                and (
                    p.role = 'hospital_admin'
                    or exists (
                        select
                            1
                        from
                            public.staff s
                        where
                            s.employee_registration_no = p.registration_no
                            and (
                                (
                                    t.visibility = 'doctor'
                                    and s.id = t.doctor_id
                                )
                                or (
                                    t.visibility = 'department'
                                    and s.department_id = t.department_id
                                )
                                or (t.visibility = 'hospital')
                            )
                    )
                )
        )
    );

-- Option sets
drop policy if exists "Prescription option sets read by scope" on public.prescription_option_sets;

create policy "Prescription option sets read by scope" on public.prescription_option_sets for
select
    using (
        deleted_at is null
        and (
            visibility = 'system'
            or (
                hospital_id = (
                    select
                        hospital_id
                    from
                        public.profiles
                    where
                        id = auth.uid ()
                )
                and (
                    visibility <> 'department'
                    or exists (
                        select
                            1
                        from
                            public.staff s
                            join public.profiles p on p.registration_no = s.employee_registration_no
                        where
                            p.id = auth.uid ()
                            and s.department_id = prescription_option_sets.department_id
                    )
                    or exists (
                        select
                            1
                        from
                            public.profiles p
                        where
                            p.id = auth.uid ()
                            and p.role = 'hospital_admin'
                    )
                )
            )
        )
    );

drop policy if exists "Prescription option sets manage by doctor or hospital admin" on public.prescription_option_sets;

create policy "Prescription option sets manage by doctor or hospital admin" on public.prescription_option_sets for all using (
    deleted_at is null
    and visibility <> 'system'
    and hospital_id = (
        select
            hospital_id
        from
            public.profiles
        where
            id = auth.uid ()
    )
    and (
        exists (
            select
                1
            from
                public.profiles p
            where
                p.id = auth.uid ()
                and p.role = 'hospital_admin'
        )
        or exists (
            select
                1
            from
                public.staff s
                join public.profiles p on p.registration_no = s.employee_registration_no
            where
                p.id = auth.uid ()
                and (
                    (
                        prescription_option_sets.visibility = 'doctor'
                        and s.id = prescription_option_sets.doctor_id
                    )
                    or (
                        prescription_option_sets.visibility = 'department'
                        and s.department_id = prescription_option_sets.department_id
                    )
                    or (prescription_option_sets.visibility = 'hospital')
                )
        )
    )
)
with
    check (
        visibility <> 'system'
        and hospital_id = (
            select
                hospital_id
            from
                public.profiles
            where
                id = auth.uid ()
        )
        and (
            exists (
                select
                    1
                from
                    public.profiles p
                where
                    p.id = auth.uid ()
                    and p.role = 'hospital_admin'
            )
            or exists (
                select
                    1
                from
                    public.staff s
                    join public.profiles p on p.registration_no = s.employee_registration_no
                where
                    p.id = auth.uid ()
                    and (
                        (
                            prescription_option_sets.visibility = 'doctor'
                            and s.id = prescription_option_sets.doctor_id
                        )
                        or (
                            prescription_option_sets.visibility = 'department'
                            and s.department_id = prescription_option_sets.department_id
                        )
                        or (prescription_option_sets.visibility = 'hospital')
                    )
            )
        )
    );

-- Option items
drop policy if exists "Prescription option items read by option scope" on public.prescription_option_items;

create policy "Prescription option items read by option scope" on public.prescription_option_items for
select
    using (
        deleted_at is null
        and exists (
            select
                1
            from
                public.prescription_option_sets s
            where
                s.id = prescription_option_items.option_set_id
                and s.deleted_at is null
                and (
                    s.visibility = 'system'
                    or (
                        s.hospital_id = (
                            select
                                hospital_id
                            from
                                public.profiles
                            where
                                id = auth.uid ()
                        )
                        and (
                            s.visibility <> 'department'
                            or exists (
                                select
                                    1
                                from
                                    public.staff st
                                    join public.profiles p on p.registration_no = st.employee_registration_no
                                where
                                    p.id = auth.uid ()
                                    and st.department_id = s.department_id
                            )
                            or exists (
                                select
                                    1
                                from
                                    public.profiles p
                                where
                                    p.id = auth.uid ()
                                    and p.role = 'hospital_admin'
                            )
                        )
                    )
                )
        )
    );

drop policy if exists "Prescription option items manage by option scope" on public.prescription_option_items;

create policy "Prescription option items manage by option scope" on public.prescription_option_items for all using (
    deleted_at is null
    and exists (
        select
            1
        from
            public.prescription_option_sets s
            join public.profiles p on p.id = auth.uid ()
        where
            s.id = prescription_option_items.option_set_id
            and s.deleted_at is null
            and s.visibility <> 'system'
            and s.hospital_id = p.hospital_id
            and (
                p.role = 'hospital_admin'
                or exists (
                    select
                        1
                    from
                        public.staff st
                    where
                        st.employee_registration_no = p.registration_no
                        and (
                            (
                                s.visibility = 'doctor'
                                and st.id = s.doctor_id
                            )
                            or (
                                s.visibility = 'department'
                                and st.department_id = s.department_id
                            )
                            or (s.visibility = 'hospital')
                        )
                )
            )
    )
)
with
    check (
        exists (
            select
                1
            from
                public.prescription_option_sets s
                join public.profiles p on p.id = auth.uid ()
            where
                s.id = prescription_option_items.option_set_id
                and s.deleted_at is null
                and s.visibility <> 'system'
                and s.hospital_id = p.hospital_id
                and (
                    p.role = 'hospital_admin'
                    or exists (
                        select
                            1
                        from
                            public.staff st
                        where
                            st.employee_registration_no = p.registration_no
                            and (
                                (
                                    s.visibility = 'doctor'
                                    and st.id = s.doctor_id
                                )
                                or (
                                    s.visibility = 'department'
                                    and st.department_id = s.department_id
                                )
                                or (s.visibility = 'hospital')
                            )
                    )
                )
        )
    );

-- Presets
drop policy if exists "Prescription presets read by scope" on public.prescription_presets;

create policy "Prescription presets read by scope" on public.prescription_presets for
select
    using (
        deleted_at is null
        and (
            visibility = 'system'
            or (
                hospital_id = (
                    select
                        hospital_id
                    from
                        public.profiles
                    where
                        id = auth.uid ()
                )
                and (
                    visibility <> 'department'
                    or exists (
                        select
                            1
                        from
                            public.staff s
                            join public.profiles p on p.registration_no = s.employee_registration_no
                        where
                            p.id = auth.uid ()
                            and s.department_id = prescription_presets.department_id
                    )
                    or exists (
                        select
                            1
                        from
                            public.profiles p
                        where
                            p.id = auth.uid ()
                            and p.role = 'hospital_admin'
                    )
                )
            )
        )
    );

drop policy if exists "Prescription presets manage by doctor or hospital admin" on public.prescription_presets;

create policy "Prescription presets manage by doctor or hospital admin" on public.prescription_presets for all using (
    deleted_at is null
    and visibility <> 'system'
    and hospital_id = (
        select
            hospital_id
        from
            public.profiles
        where
            id = auth.uid ()
    )
    and (
        exists (
            select
                1
            from
                public.profiles p
            where
                p.id = auth.uid ()
                and p.role = 'hospital_admin'
        )
        or exists (
            select
                1
            from
                public.staff s
                join public.profiles p on p.registration_no = s.employee_registration_no
            where
                p.id = auth.uid ()
                and (
                    (
                        prescription_presets.visibility = 'doctor'
                        and s.id = prescription_presets.doctor_id
                    )
                    or (
                        prescription_presets.visibility = 'department'
                        and s.department_id = prescription_presets.department_id
                    )
                    or (prescription_presets.visibility = 'hospital')
                )
        )
    )
)
with
    check (
        visibility <> 'system'
        and hospital_id = (
            select
                hospital_id
            from
                public.profiles
            where
                id = auth.uid ()
        )
        and (
            exists (
                select
                    1
                from
                    public.profiles p
                where
                    p.id = auth.uid ()
                    and p.role = 'hospital_admin'
            )
            or exists (
                select
                    1
                from
                    public.staff s
                    join public.profiles p on p.registration_no = s.employee_registration_no
                where
                    p.id = auth.uid ()
                    and (
                        (
                            prescription_presets.visibility = 'doctor'
                            and s.id = prescription_presets.doctor_id
                        )
                        or (
                            prescription_presets.visibility = 'department'
                            and s.department_id = prescription_presets.department_id
                        )
                        or (prescription_presets.visibility = 'hospital')
                    )
            )
        )
    );

-- Preset values
drop policy if exists "Prescription preset values read by preset scope" on public.prescription_preset_values;

create policy "Prescription preset values read by preset scope" on public.prescription_preset_values for
select
    using (
        deleted_at is null
        and exists (
            select
                1
            from
                public.prescription_presets pr
            where
                pr.id = prescription_preset_values.preset_id
                and pr.deleted_at is null
                and (
                    pr.visibility = 'system'
                    or (
                        pr.hospital_id = (
                            select
                                hospital_id
                            from
                                public.profiles
                            where
                                id = auth.uid ()
                        )
                        and (
                            pr.visibility <> 'department'
                            or exists (
                                select
                                    1
                                from
                                    public.staff s
                                    join public.profiles p on p.registration_no = s.employee_registration_no
                                where
                                    p.id = auth.uid ()
                                    and s.department_id = pr.department_id
                            )
                            or exists (
                                select
                                    1
                                from
                                    public.profiles p
                                where
                                    p.id = auth.uid ()
                                    and p.role = 'hospital_admin'
                            )
                        )
                    )
                )
        )
    );

drop policy if exists "Prescription preset values manage by preset scope" on public.prescription_preset_values;

create policy "Prescription preset values manage by preset scope" on public.prescription_preset_values for all using (
    deleted_at is null
    and exists (
        select
            1
        from
            public.prescription_presets pr
            join public.profiles p on p.id = auth.uid ()
        where
            pr.id = prescription_preset_values.preset_id
            and pr.deleted_at is null
            and pr.visibility <> 'system'
            and pr.hospital_id = p.hospital_id
            and (
                p.role = 'hospital_admin'
                or exists (
                    select
                        1
                    from
                        public.staff s
                    where
                        s.employee_registration_no = p.registration_no
                        and (
                            (
                                pr.visibility = 'doctor'
                                and s.id = pr.doctor_id
                            )
                            or (
                                pr.visibility = 'department'
                                and s.department_id = pr.department_id
                            )
                            or (pr.visibility = 'hospital')
                        )
                )
            )
    )
)
with
    check (
        exists (
            select
                1
            from
                public.prescription_presets pr
                join public.profiles p on p.id = auth.uid ()
            where
                pr.id = prescription_preset_values.preset_id
                and pr.deleted_at is null
                and pr.visibility <> 'system'
                and pr.hospital_id = p.hospital_id
                and (
                    p.role = 'hospital_admin'
                    or exists (
                        select
                            1
                        from
                            public.staff s
                        where
                            s.employee_registration_no = p.registration_no
                            and (
                                (
                                    pr.visibility = 'doctor'
                                    and s.id = pr.doctor_id
                                )
                                or (
                                    pr.visibility = 'department'
                                    and s.department_id = pr.department_id
                                )
                                or (pr.visibility = 'hospital')
                            )
                    )
                )
        )
    );

-- Prescriptions
drop policy if exists "Prescriptions read by hospital scope" on public.prescriptions;

create policy "Prescriptions read by hospital scope" on public.prescriptions for
select
    using (
        deleted_at is null
        and hospital_id = (
            select
                hospital_id
            from
                public.profiles
            where
                id = auth.uid ()
        )
    );

drop policy if exists "Prescriptions manage by doctor or hospital admin" on public.prescriptions;

create policy "Prescriptions manage by doctor or hospital admin" on public.prescriptions for all using (
    deleted_at is null
    and hospital_id = (
        select
            hospital_id
        from
            public.profiles
        where
            id = auth.uid ()
    )
    and exists (
        select
            1
        from
            public.profiles p
        where
            p.id = auth.uid ()
            and p.role in ('doctor', 'hospital_admin')
    )
)
with
    check (
        hospital_id = (
            select
                hospital_id
            from
                public.profiles
            where
                id = auth.uid ()
        )
        and exists (
            select
                1
            from
                public.profiles p
            where
                p.id = auth.uid ()
                and p.role in ('doctor', 'hospital_admin')
        )
    );

-- Prescription values
drop policy if exists "Prescription values read by prescription scope" on public.prescription_values;

create policy "Prescription values read by prescription scope" on public.prescription_values for
select
    using (
        deleted_at is null
        and exists (
            select
                1
            from
                public.prescriptions pr
            where
                pr.id = prescription_values.prescription_id
                and pr.deleted_at is null
                and pr.hospital_id = (
                    select
                        hospital_id
                    from
                        public.profiles
                    where
                        id = auth.uid ()
                )
        )
    );

drop policy if exists "Prescription values manage by prescription scope" on public.prescription_values;

create policy "Prescription values manage by prescription scope" on public.prescription_values for all using (
    deleted_at is null
    and exists (
        select
            1
        from
            public.prescriptions pr
            join public.profiles p on p.id = auth.uid ()
        where
            pr.id = prescription_values.prescription_id
            and pr.deleted_at is null
            and pr.hospital_id = p.hospital_id
            and p.role in ('doctor', 'hospital_admin')
    )
)
with
    check (
        exists (
            select
                1
            from
                public.prescriptions pr
                join public.profiles p on p.id = auth.uid ()
            where
                pr.id = prescription_values.prescription_id
                and pr.deleted_at is null
                and pr.hospital_id = p.hospital_id
                and p.role in ('doctor', 'hospital_admin')
        )
    );

-- Audit logs
drop policy if exists "Prescription audit logs read by prescription scope" on public.prescription_audit_logs;

create policy "Prescription audit logs read by prescription scope" on public.prescription_audit_logs for
select
    using (
        exists (
            select
                1
            from
                public.prescriptions pr
            where
                pr.id = prescription_audit_logs.prescription_id
                and pr.deleted_at is null
                and pr.hospital_id = (
                    select
                        hospital_id
                    from
                        public.profiles
                    where
                        id = auth.uid ()
                )
        )
    );

-- Keep existing insert policy for audit logs as-is