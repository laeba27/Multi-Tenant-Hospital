staff.id (doctor)
profiles.registration_no
appointments.id
hospitals.registration_no
# Prescription System Ideology & Design Philosophy

## 1. Core Vision

The prescription system is designed to be **flexible, scalable, and specialty-agnostic**, enabling doctors from different domains (dentists, neurologists, general physicians, etc.) to create and manage prescriptions tailored to their workflows without requiring database or code changes.

The goal is to move away from rigid, hardcoded prescription structures toward a **dynamic, template-driven architecture** that adapts to each doctor's needs.

---

## 2. Fundamental Principles

### 2.1 Dynamic Over Static

Traditional systems store prescriptions in fixed columns (e.g., complaints, advice, treatment).
This approach is not scalable across specialties.

Instead, this system:

* Uses **dynamic fields**
* Allows **custom sections and inputs**
* Avoids schema changes when requirements evolve

---

### 2.2 Separation of Concerns

The system is divided into three distinct layers:

#### A. Structure Layer (Templates)

Defines:

* What fields exist
* How the prescription is structured

#### B. Data Layer (Presets & Suggestions)

Defines:

* Reusable medical data
* Common treatments and inputs

#### C. Instance Layer (Prescriptions)

Stores:

* Actual patient-specific data
* Values filled during consultation

---

## 3. Template-Driven Architecture

### 3.1 What is a Template?

A template represents the **structure of a prescription**.

It consists of:

* Sections (e.g., Vitals, History, Advice)
* Fields (e.g., BP, Symptoms, Medicines)

### 3.2 Why Templates?

* Doctors across specialties require different formats
* Even within the same specialty, preferences vary
* Templates allow:

  * Adding/removing sections
  * Customizing fields
  * Reusing structures

---

## 4. Field-Based Data Storage

Instead of storing entire sections as JSON blobs, the system stores:

* Each field separately
* Each value mapped to a field

### Benefits:

* Highly scalable
* Easy to query and filter
* Supports unlimited customization
* Enables analytics in future

---

## 5. Dual Customization Model

The system supports **two types of customization**:

---

### 5.1 Structural Customization

Doctors can:

* Add/remove sections
* Add/remove fields
* Define field types (text, dropdown, multi-select, etc.)

This defines **how the prescription looks**.

---

### 5.2 Data Customization (Prefilled Content)

Doctors can:

* Save common cases (e.g., "Common Cold")
* Store medicines, precautions, advice
* Reuse them instantly

This defines **what gets filled**.

---

## 6. Presets (Reusable Clinical Data)

Presets are reusable, prefilled prescription data.

Example:

* “Common Cold”
* “Tooth Pain Basic”

### Purpose:

* Reduce repetitive typing
* Standardize treatments
* Improve efficiency

### Behavior:

* Applied on top of a template
* Auto-fills multiple fields at once
* Still editable by the doctor

---

## 7. Suggestions System

The system includes a **dropdown suggestion mechanism** for frequently used inputs.

Examples:

* Medicines
* Symptoms
* Precautions

### Features:

* Categorized (by department/hospital)
* Reusable across prescriptions
* Can include metadata (dosage, timing, notes)

---

## 8. Multi-Tenant Design

The system is built for multiple hospitals.

### Data Isolation:

* Each hospital has its own data
* Doctors can:

  * Use personal templates
  * Share templates within hospital

---

## 9. Template Sharing Model

| Type            | Description                             |
| --------------- | --------------------------------------- |
| Personal        | Created and used by a single doctor     |
| Hospital Shared | Accessible by all doctors in a hospital |
| Default         | System-provided base templates          |

---

## 10. Reusability & Efficiency

The system optimizes doctor workflow by enabling:

* Template reuse → structure reuse
* Preset reuse → data reuse
* Suggestions → faster input

---

## 11. Scalability Strategy

The design ensures:

* No schema changes for new specialties
* Unlimited fields and sections
* Extensible for future features like:

  * AI-assisted prescriptions
  * Analytics
  * Reporting

---

## 12. Future Readiness

This architecture is compatible with:

* Speech-to-text input systems
* AI-driven suggestions
* Automated prescription generation

---

## 13. Key Advantages

* Fully customizable
* Specialty-independent
* Scalable without migrations
* Efficient for doctors
* Structured yet flexible

---

## 14. Summary

This prescription system is built on the philosophy of:

> **“Define structure dynamically, reuse data intelligently, and store values in a scalable way.”**

It transforms prescriptions from static records into a **configurable, reusable, and intelligent system** adaptable to any medical domain.


-- =========================================================
-- PRESCRIPTION SYSTEM (SCALABLE + DYNAMIC) - FULL SCHEMA
-- Each table includes purpose and usage explanation
-- =========================================================


-- =========================================================
-- 1. PRESCRIPTION TEMPLATES
-- Defines the overall structure of a prescription
-- Can be doctor-specific or hospital-shared
-- =========================================================
create table public.prescription_templates (
  id uuid primary key default gen_random_uuid(),

  hospital_id text not null, -- tenant isolation
  doctor_id uuid null, -- null = global template, else doctor-specific

  name text not null, -- e.g. "Dental Basic", "Neurology OPD"
  department_id uuid,

  is_default boolean default false, -- system templates
  is_public boolean default false, -- share across hospital

  version int default 1,

  created_at timestamptz default now()
);


-- =========================================================
-- 2. TEMPLATE SECTIONS
-- Logical grouping of fields inside a template
-- Example: Vitals, History, Advice, Medicines
-- =========================================================
create table public.template_sections (
  id uuid primary key default gen_random_uuid(),

  template_id uuid not null, -- belongs to a template

  name text not null, -- section name
  order_index int, -- UI ordering

  is_required boolean default false, -- must appear
  is_removable boolean default true -- doctor can delete or not
);


-- =========================================================
-- 3. TEMPLATE FIELDS (CORE TABLE)
-- Defines individual input fields inside a section
-- Makes system dynamic (no hardcoded columns)
-- =========================================================
create table public.template_fields (
  id uuid primary key default gen_random_uuid(),

  section_id uuid not null, -- belongs to section

  label text not null, -- "Blood Pressure"
  field_key text not null, -- unique identifier like "bp"

  field_type text not null, 
  -- text | number | dropdown | multi-select | date | json

  is_required boolean default false,
  is_multiple boolean default false, -- allow multiple values

  suggestion_category text null, 
  -- connects to suggestions (e.g. medicines, symptoms)

  default_value jsonb null, -- prefilled default

  order_index int,

  created_at timestamptz default now()
);


-- =========================================================
-- 4. SUGGESTIONS
-- Used for dropdowns and reusable inputs
-- Example: medicines, precautions, symptoms
-- =========================================================
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),

  hospital_id text not null,
  department_id uuid,

  category text not null, -- grouping (medicines, precautions)
  name text not null, -- display value

  metadata jsonb null, 
  -- dosage, timing, notes etc

  usage_count int default 0, -- for ranking frequently used items

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- =========================================================
-- 5. MEDICINES
-- Structured medicine database (can be used in dropdowns)
-- =========================================================
create table public.medicines (
  id uuid primary key default gen_random_uuid(),

  hospital_id text not null,
  department_id uuid,

  name text not null,

  metadata jsonb null, 
  -- dosage, frequency, warnings

  created_at timestamptz default now()
);


-- =========================================================
-- 6. CLINICAL PRESETS
-- Reusable prefilled prescription data
-- Example: "Common Cold", "Tooth Pain"
-- =========================================================
create table public.clinical_presets (
  id uuid primary key default gen_random_uuid(),

  hospital_id text not null,
  doctor_id uuid not null,

  name text not null, -- preset name

  department_id uuid,
  template_id uuid, -- optional: tied to a template

  is_public boolean default false, -- shareable preset

  created_at timestamptz default now()
);


-- =========================================================
-- 7. CLINICAL PRESET VALUES
-- Stores actual values for each field in a preset
-- Enables auto-fill functionality
-- =========================================================
create table public.clinical_preset_values (
  id uuid primary key default gen_random_uuid(),

  preset_id uuid not null, -- belongs to preset
  field_id uuid not null, -- maps to template field

  value jsonb not null -- actual stored value
);


-- =========================================================
-- 8. PRESCRIPTIONS (HEADER)
-- Represents a single prescription instance
-- =========================================================
create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),

  hospital_id text not null,

  doctor_id uuid not null,
  patient_id text not null,

  appointment_id text,

  template_id uuid, -- which structure was used

  follow_up_date date,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- =========================================================
-- 9. PRESCRIPTION FIELD VALUES (MOST IMPORTANT)
-- Stores actual patient data dynamically
-- Each row = one field value
-- =========================================================
create table public.prescription_field_values (
  id uuid primary key default gen_random_uuid(),

  prescription_id uuid not null, -- belongs to prescription
  field_id uuid not null, -- which field

  value jsonb not null -- actual value entered
);


-- =========================================================
-- 10. SUGGESTION USAGE LOGS
-- Tracks frequently used suggestions per doctor
-- Helps in ranking and smart UX
-- =========================================================
create table public.suggestion_usage_logs (
  id uuid primary key default gen_random_uuid(),

  doctor_id uuid not null,
  suggestion_id uuid not null,

  usage_count int default 1,
  last_used_at timestamptz default now()
);


-- =========================================================
-- 11. TEMPLATE VERSIONS
-- Keeps history of template changes
-- Prevents breaking old prescriptions
-- =========================================================
create table public.template_versions (
  id uuid primary key default gen_random_uuid(),

  template_id uuid not null,

  version int not null,
  snapshot jsonb not null, -- full template backup

  created_at timestamptz default now()
);


-- =========================================================
-- 12. PRESCRIPTION LOGS (AUDIT TRAIL)
-- Tracks changes made to prescriptions
-- Useful for compliance and debugging
-- =========================================================
create table public.prescription_logs (
  id uuid primary key default gen_random_uuid(),

  prescription_id uuid not null,

  changed_by uuid,
  changes jsonb, -- what changed

  created_at timestamptz default now()
);


-- =========================================================
-- END RESULT
-- =========================================================
-- ✔ Fully dynamic prescription system
-- ✔ Supports all doctor specialties
-- ✔ Template-based structure
-- ✔ Preset-based auto-fill
-- ✔ Dropdown suggestions
-- ✔ Scalable & future-proof
-- =========================================================