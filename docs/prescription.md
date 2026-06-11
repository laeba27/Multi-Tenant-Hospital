# Prescription System Plan

## Goal
Build one prescription system that works for:

- dentists today
- neurologists or other specialists later
- doctor-specific customization
- hospital-shared templates
- reusable dropdown libraries
- reusable clinical presets for common cases

## Core design idea
Do not hardcode prescription columns per specialty.

Instead:

1. store a template
2. store sections inside the template
3. store dynamic fields inside each section
4. store reusable option libraries for dropdowns and suggestions
5. store reusable clinical presets
6. store actual prescription instances with a snapshot of the template version used

This keeps the system scalable and prevents future template edits from breaking old prescriptions.

## Main database structure

### `prescription_templates`
Owns the template identity.

- doctor-owned template
- hospital-shared template
- system default template
- current active version
- specialty / department targeting

### `prescription_template_versions`
Immutable version history for every template.

- each edit creates a new version
- old prescriptions continue to point to the old version
- snapshot json keeps the whole version portable

### `prescription_template_sections`
Logical groups like:

- History
- Examination
- Medications
- Advice
- Follow Up

### `prescription_template_fields`
Dynamic field definitions.

- text
- textarea
- number
- date
- select
- multi-select
- switch
- medication list

Each field stores:

- label
- field key
- validation rules
- default value
- required / removable / locked flags
- UI config
- optional link to an option set

### `prescription_option_sets` + `prescription_option_items`
Reusable dropdown libraries for:

- medicines
- cautions
- symptoms
- follow-up windows

Doctors should not type the same common values again and again.

### `prescription_presets` + `prescription_preset_values`
Reusable common-case presets.

Examples:

- common cold
- post extraction care
- RCT review visit

Preset applies values to the selected template and doctor edits only the differences.

### `prescriptions`
One prescription header row per issued draft / final prescription.

- patient
- appointment
- doctor
- template used
- template version used
- status
- summary
- follow up date
- template snapshot

### `prescription_values`
Stores actual dynamic field values for that prescription.

This keeps the instance flexible even if different templates have different fields.

### `prescription_audit_logs`
Audit trail for medical safety and debugging.

## Multi-tenant behavior

- `system` templates are global starters
- `hospital` templates can be reused by doctors in the same hospital
- `doctor` templates are personal unless explicitly shared

## UI pages

### Template workspace
Route:

`/dashboard/doctor/prescriptions`

Purpose:

- browse default / hospital / personal templates
- understand sections and fields
- manage dropdown libraries
- view reusable presets

### Prescription composer
Route:

`/dashboard/doctor/prescriptions/new?appointmentId=...`

Purpose:

- open from appointment board
- preload patient + appointment context
- show compact column-based prescription input
- reduce scroll
- apply presets quickly
- edit medications and advice fast

## Current implementation in repo

- migration: `supabase/migrations/016_create_prescription_system.sql`
- template studio page: `/dashboard/doctor/prescriptions`
- compact composer page: `/dashboard/doctor/prescriptions/new`

Right now the UI is connected to seeded template data so the screens are usable before database persistence is fully wired.

## Why this is scalable

- no specialty-specific hardcoded DB columns
- doctors can add or remove fields through template versions
- hospital can share standards across doctors
- presets handle repeated common cases
- old prescriptions remain stable because of version snapshots
