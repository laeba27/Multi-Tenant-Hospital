--
-- PostgreSQL database dump
--

\restrict ecMyHfA1bSiTFYZMcFQfaGBwvbgyUF5KWONdBgbw9MFQHkHlOzw9hf7DP7HxNZe

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'admin',
    'doctor',
    'staff',
    'patient',
    'receptionist'
);


--
-- Name: create_dental_prescription_template(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_dental_prescription_template(p_doctor_id uuid, p_hospital_id text, p_created_by uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_template_id UUID;
  v_version_id UUID;
  v_section_id UUID;
  v_field_id UUID;
BEGIN
  -- Create the template
  INSERT INTO prescription_templates (
    hospital_id,
    doctor_id,
    created_by,
    template_key,
    name,
    description,
    visibility,
    status,
    is_default,
    current_version,
    layout_config
  ) VALUES (
    p_hospital_id,
    p_doctor_id,
    p_created_by,
    'dental_prescription_' || p_doctor_id,
    'Dental Prescription Template',
    'Complete dental prescription format',
    'doctor',
    'active',
    true,
    1,
    '{
      "sections": [
        {
          "key": "vitals",
          "title": "Vitals",
          "description": "Patient vital signs",
          "color": "bg-blue-50 border-blue-200",
          "is_enabled": true,
          "sort_order": 0
        },
        {
          "key": "chief_complaints",
          "title": "Chief Complaints",
          "description": "Patient reported issues",
          "color": "bg-rose-50 border-rose-200",
          "is_enabled": true,
          "is_required": true,
          "sort_order": 1
        },
        {
          "key": "history_present_illness",
          "title": "History of Present Illness",
          "description": "Detailed illness history",
          "color": "bg-amber-50 border-amber-200",
          "is_enabled": true,
          "sort_order": 2
        },
        {
          "key": "medical_history",
          "title": "Medical History & Medication",
          "description": "Past medical history and current medications",
          "color": "bg-purple-50 border-purple-200",
          "is_enabled": true,
          "sort_order": 3
        },
        {
          "key": "on_examination",
          "title": "On Examination",
          "description": "Clinical examination findings",
          "color": "bg-green-50 border-green-200",
          "is_enabled": true,
          "sort_order": 4
        },
        {
          "key": "investigation",
          "title": "Investigation",
          "description": "Diagnostic investigations advised",
          "color": "bg-cyan-50 border-cyan-200",
          "is_enabled": true,
          "sort_order": 5
        },
        {
          "key": "advice",
          "title": "Advice",
          "description": "Patient advice and instructions",
          "color": "bg-indigo-50 border-indigo-200",
          "is_enabled": true,
          "sort_order": 6
        },
        {
          "key": "treatment",
          "title": "Treatment",
          "description": "Treatment details",
          "color": "bg-emerald-50 border-emerald-200",
          "is_enabled": true,
          "sort_order": 7
        },
        {
          "key": "prescribed_medicines",
          "title": "Prescribed Medicines",
          "description": "Medication prescriptions",
          "color": "bg-red-50 border-red-200",
          "is_enabled": true,
          "is_required": true,
          "sort_order": 8
        },
        {
          "key": "additional_notes",
          "title": "Additional Notes & Precautions",
          "description": "Final notes and follow-up",
          "color": "bg-slate-50 border-slate-200",
          "is_enabled": true,
          "sort_order": 9
        }
      ]
    }'::jsonb
  )
  RETURNING id INTO v_template_id;

  -- Create version 1
  INSERT INTO prescription_template_versions (
    template_id,
    version_number,
    version_label,
    change_summary,
    created_by,
    published_at,
    snapshot
  ) VALUES (
    v_template_id,
    1,
    'Initial Version',
    'Initial dental prescription template',
    p_created_by,
    NOW(),
    '{
      "sections": [
        {
          "key": "vitals",
          "title": "Vitals",
          "description": "Patient vital signs",
          "color": "bg-blue-50 border-blue-200",
          "is_enabled": true,
          "sort_order": 0,
          "fields": [
            {"key": "blood_pressure", "label": "Blood Pressure", "type": "text", "placeholder": "120/80 mmHg"},
            {"key": "pulse", "label": "Pulse", "type": "text", "placeholder": "72 bpm"},
            {"key": "temperature", "label": "Temperature", "type": "text", "placeholder": "98.6°F"},
            {"key": "spo2", "label": "SpO2", "type": "text", "placeholder": "98%"}
          ]
        },
        {
          "key": "chief_complaints",
          "title": "Chief Complaints",
          "description": "Patient reported issues",
          "color": "bg-rose-50 border-rose-200",
          "is_enabled": true,
          "is_required": true,
          "sort_order": 1,
          "fields": [
            {"key": "complaint", "label": "Complaint", "type": "select", "options": ["Tooth Pain", "Sensitivity", "Gum Bleeding", "Gum Swelling", "Bad Breath", "Tooth Mobility", "Fractured Tooth", "Discolored Tooth", "Missing Tooth", "Wisdom Tooth Pain", "Jaw Pain", "Mouth Ulcer", "Dry Mouth", "Teeth Grinding", "Bite Problem"]},
            {"key": "location", "label": "Location", "type": "select", "options": ["Upper Left", "Upper Right", "Lower Left", "Lower Right", "Front", "General", "Multiple Areas"]},
            {"key": "duration", "label": "Duration", "type": "text", "placeholder": "e.g., 3 days, 1 week"}
          ]
        },
        {
          "key": "history_present_illness",
          "title": "History of Present Illness",
          "description": "Detailed illness history",
          "color": "bg-amber-50 border-amber-200",
          "is_enabled": true,
          "sort_order": 2,
          "fields": [
            {"key": "hpi", "label": "History", "type": "textarea", "placeholder": "Describe the illness progression..."},
            {"key": "since_when", "label": "Since When", "type": "text", "placeholder": "Since 3 days"},
            {"key": "what_happened", "label": "What Happened", "type": "text", "placeholder": "Event description"}
          ]
        },
        {
          "key": "medical_history",
          "title": "Medical History & Medication",
          "description": "Past medical history and current medications",
          "color": "bg-purple-50 border-purple-200",
          "is_enabled": true,
          "sort_order": 3,
          "fields": [
            {"key": "medical_history", "label": "Medical History", "type": "textarea", "placeholder": "Any chronic conditions, surgeries..."},
            {"key": "current_medications", "label": "Current Medications", "type": "textarea", "placeholder": "List ongoing medicines..."},
            {"key": "allergies", "label": "Allergies", "type": "textarea", "placeholder": "Any known allergies..."}
          ]
        },
        {
          "key": "on_examination",
          "title": "On Examination",
          "description": "Clinical examination findings",
          "color": "bg-green-50 border-green-200",
          "is_enabled": true,
          "sort_order": 4,
          "fields": [
            {"key": "examination", "label": "Examination Findings", "type": "textarea", "placeholder": "Clinical observations..."},
            {"key": "tooth_number", "label": "Tooth Number(s)", "type": "text", "placeholder": "e.g., 16, 26, 36, 46"},
            {"key": "exam_notes", "label": "Additional Notes", "type": "textarea", "placeholder": "Extra findings..."}
          ]
        },
        {
          "key": "investigation",
          "title": "Investigation",
          "description": "Diagnostic investigations advised",
          "color": "bg-cyan-50 border-cyan-200",
          "is_enabled": true,
          "sort_order": 5,
          "fields": [
            {"key": "investigation_type", "label": "Investigation", "type": "textarea", "placeholder": "X-ray, CBCT, Blood tests..."},
            {"key": "inv_tooth_number", "label": "Tooth Number(s)", "type": "text", "placeholder": "e.g., 16, 26"},
            {"key": "inv_notes", "label": "Additional Notes", "type": "textarea", "placeholder": "Special instructions..."}
          ]
        },
        {
          "key": "advice",
          "title": "Advice",
          "description": "Patient advice and instructions",
          "color": "bg-indigo-50 border-indigo-200",
          "is_enabled": true,
          "sort_order": 6,
          "fields": [
            {"key": "advice", "label": "Advice", "type": "textarea", "placeholder": "Patient instructions..."},
            {"key": "advice_tooth_number", "label": "Tooth Number(s)", "type": "text", "placeholder": "e.g., 16"},
            {"key": "advice_notes", "label": "Additional Notes", "type": "textarea", "placeholder": "Extra advice..."}
          ]
        },
        {
          "key": "treatment",
          "title": "Treatment",
          "description": "Treatment details",
          "color": "bg-emerald-50 border-emerald-200",
          "is_enabled": true,
          "sort_order": 7,
          "fields": [
            {"key": "treatment_name", "label": "Treatment Name", "type": "textarea", "placeholder": "Procedure name..."},
            {"key": "treatment_tooth_number", "label": "Tooth Number(s)", "type": "text", "placeholder": "e.g., 16, 26"},
            {"key": "treatment_notes", "label": "Additional Notes", "type": "textarea", "placeholder": "Treatment details..."}
          ]
        },
        {
          "key": "prescribed_medicines",
          "title": "Prescribed Medicines",
          "description": "Medication prescriptions",
          "color": "bg-red-50 border-red-200",
          "is_enabled": true,
          "is_required": true,
          "sort_order": 8,
          "fields": [
            {"key": "medications", "label": "Medications", "type": "medication_list"}
          ]
        },
        {
          "key": "additional_notes",
          "title": "Additional Notes & Precautions",
          "description": "Final notes and follow-up",
          "color": "bg-slate-50 border-slate-200",
          "is_enabled": true,
          "sort_order": 9,
          "fields": [
            {"key": "notes", "label": "Additional Notes", "type": "textarea", "placeholder": "Any additional notes..."},
            {"key": "precautions", "label": "Precautions", "type": "textarea", "placeholder": "Patient precautions..."},
            {"key": "follow_up_date", "label": "Follow-up Date", "type": "date"}
          ]
        }
      ]
    }'::jsonb
  )
  RETURNING id INTO v_version_id;

  -- Create sections and fields
  -- Vitals
  INSERT INTO prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'vitals', 'Vitals', 'Patient vital signs', 0, 1, false, true, '{"is_enabled": true, "color": "bg-blue-50 border-blue-200"}')
  RETURNING id INTO v_section_id;

  INSERT INTO prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'blood_pressure', 'Blood Pressure', 'text', '120/80 mmHg', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'pulse', 'Pulse', 'text', '72 bpm', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'temperature', 'Temperature', 'text', '98.6°F', 2, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'spo2', 'SpO2', 'text', '98%', 3, 1, false, true, '{}'::jsonb);

  -- Chief Complaints
  INSERT INTO prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'chief_complaints', 'Chief Complaints', 'Patient reported issues', 1, 1, true, false, '{"is_enabled": true, "color": "bg-rose-50 border-rose-200"}')
  RETURNING id INTO v_section_id;

  INSERT INTO prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'complaint', 'Complaint', 'select', 'Select complaint', 0, 1, true, false, '{"options": ["Tooth Pain", "Sensitivity", "Gum Bleeding", "Gum Swelling", "Bad Breath", "Tooth Mobility", "Fractured Tooth", "Discolored Tooth", "Missing Tooth", "Wisdom Tooth Pain", "Jaw Pain", "Mouth Ulcer", "Dry Mouth", "Teeth Grinding", "Bite Problem"]}'::jsonb),
    (v_version_id, v_section_id, 'location', 'Location', 'select', 'Select location', 1, 1, false, true, '{"options": ["Upper Left", "Upper Right", "Lower Left", "Lower Right", "Front", "General", "Multiple Areas"]}'::jsonb),
    (v_version_id, v_section_id, 'duration', 'Duration', 'text', 'e.g., 3 days, 1 week', 2, 1, false, true, '{}'::jsonb);

  -- History of Present Illness
  INSERT INTO prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'history_present_illness', 'History of Present Illness', 'Detailed illness history', 2, 1, false, true, '{"is_enabled": true, "color": "bg-amber-50 border-amber-200"}')
  RETURNING id INTO v_section_id;

  INSERT INTO prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'hpi', 'History', 'textarea', 'Describe the illness progression...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'since_when', 'Since When', 'text', 'Since 3 days', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'what_happened', 'What Happened', 'text', 'Event description', 2, 1, false, true, '{}'::jsonb);

  -- Medical History
  INSERT INTO prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'medical_history', 'Medical History & Medication', 'Past medical history and current medications', 3, 1, false, true, '{"is_enabled": true, "color": "bg-purple-50 border-purple-200"}')
  RETURNING id INTO v_section_id;

  INSERT INTO prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'medical_history', 'Medical History', 'textarea', 'Any chronic conditions, surgeries...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'current_medications', 'Current Medications', 'textarea', 'List ongoing medicines...', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'allergies', 'Allergies', 'textarea', 'Any known allergies...', 2, 1, false, true, '{}'::jsonb);

  -- On Examination
  INSERT INTO prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'on_examination', 'On Examination', 'Clinical examination findings', 4, 1, false, true, '{"is_enabled": true, "color": "bg-green-50 border-green-200"}')
  RETURNING id INTO v_section_id;

  INSERT INTO prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'examination', 'Examination Findings', 'textarea', 'Clinical observations...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'tooth_number', 'Tooth Number(s)', 'text', 'e.g., 16, 26, 36, 46', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'exam_notes', 'Additional Notes', 'textarea', 'Extra findings...', 2, 1, false, true, '{}'::jsonb);

  -- Investigation
  INSERT INTO prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'investigation', 'Investigation', 'Diagnostic investigations advised', 5, 1, false, true, '{"is_enabled": true, "color": "bg-cyan-50 border-cyan-200"}')
  RETURNING id INTO v_section_id;

  INSERT INTO prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'investigation_type', 'Investigation', 'textarea', 'X-ray, CBCT, Blood tests...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'inv_tooth_number', 'Tooth Number(s)', 'text', 'e.g., 16, 26', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'inv_notes', 'Additional Notes', 'textarea', 'Special instructions...', 2, 1, false, true, '{}'::jsonb);

  -- Advice
  INSERT INTO prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'advice', 'Advice', 'Patient advice and instructions', 6, 1, false, true, '{"is_enabled": true, "color": "bg-indigo-50 border-indigo-200"}')
  RETURNING id INTO v_section_id;

  INSERT INTO prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'advice', 'Advice', 'textarea', 'Patient instructions...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'advice_tooth_number', 'Tooth Number(s)', 'text', 'e.g., 16', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'advice_notes', 'Additional Notes', 'textarea', 'Extra advice...', 2, 1, false, true, '{}'::jsonb);

  -- Treatment
  INSERT INTO prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'treatment', 'Treatment', 'Treatment details', 7, 1, false, true, '{"is_enabled": true, "color": "bg-emerald-50 border-emerald-200"}')
  RETURNING id INTO v_section_id;

  INSERT INTO prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'treatment_name', 'Treatment Name', 'textarea', 'Procedure name...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'treatment_tooth_number', 'Tooth Number(s)', 'text', 'e.g., 16, 26', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'treatment_notes', 'Additional Notes', 'textarea', 'Treatment details...', 2, 1, false, true, '{}'::jsonb);

  -- Prescribed Medicines
  INSERT INTO prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'prescribed_medicines', 'Prescribed Medicines', 'Medication prescriptions', 8, 1, true, false, '{"is_enabled": true, "color": "bg-red-50 border-red-200"}')
  RETURNING id INTO v_section_id;

  INSERT INTO prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'medications', 'Medications', 'medication_list', '', 0, 1, true, false, '{}'::jsonb);

  -- Additional Notes
  INSERT INTO prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'additional_notes', 'Additional Notes & Precautions', 'Final notes and follow-up', 9, 1, false, true, '{"is_enabled": true, "color": "bg-slate-50 border-slate-200"}')
  RETURNING id INTO v_section_id;

  INSERT INTO prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'notes', 'Additional Notes', 'textarea', 'Any additional notes...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'precautions', 'Precautions', 'textarea', 'Patient precautions...', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'follow_up_date', 'Follow-up Date', 'date', '', 2, 1, false, true, '{}'::jsonb);

  RETURN v_template_id;
END;
$$;


--
-- Name: enforce_patient_appointment_cancel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_patient_appointment_cancel() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  actor_role text;
begin
  select role into actor_role from public.profiles where id = auth.uid();

  -- Staff, doctors and admins go through the server actions (service-role
  -- client, auth.uid() is null there) -- leave those writes untouched.
  if actor_role is distinct from 'patient' then
    return new;
  end if;

  -- A patient may only flip status to 'cancelled'. Everything else must be
  -- byte-identical to the row they started from.
  if new.status is distinct from 'cancelled' then
    raise exception 'A patient may only cancel an appointment.';
  end if;

  if (new.appointment_date, new.appointment_slot, new.doctor_id, new.department_id,
      new.hospital_id, new.patient_id, new.appointment_type, new.treatment_id,
      new.treatment_details, new.amount_due, new.payment_status,
      new.consultation_fee_snapshot, new.booked_by, new.booked_by_type)
     is distinct from
     (old.appointment_date, old.appointment_slot, old.doctor_id, old.department_id,
      old.hospital_id, old.patient_id, old.appointment_type, old.treatment_id,
      old.treatment_details, old.amount_due, old.payment_status,
      old.consultation_fee_snapshot, old.booked_by, old.booked_by_type)
  then
    raise exception 'A patient may only change the status of their appointment.';
  end if;

  new.updated_at := now();
  return new;
end $$;


--
-- Name: enforce_slot_capacity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_slot_capacity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  cap integer;
  taken integer;
begin
  -- Only guard rows that actually occupy a place.
  if new.status not in ('scheduled', 'pending_confirmation') then
    return new;
  end if;
  if new.doctor_id is null or new.appointment_slot is null then
    return new;
  end if;

  select coalesce(max_patients_per_slot, 1) into cap
  from public.staff where id = new.doctor_id;

  if cap is null then
    return new;
  end if;

  select count(*) into taken
  from public.appointments a
  where a.doctor_id = new.doctor_id
    and a.appointment_date = new.appointment_date
    and a.appointment_slot = new.appointment_slot
    and a.status in ('scheduled', 'pending_confirmation')
    and (tg_op = 'INSERT' or a.id <> new.id);

  if taken >= cap then
    raise exception
      'That time slot is full (% of % places taken). Please choose another.', taken, cap
      using errcode = 'check_violation';
  end if;

  return new;
end $$;


--
-- Name: sync_appointment_payment_from_invoice(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_appointment_payment_from_invoice() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.appointment_id is null then
    return new;
  end if;

  update public.appointments
  set
    payment_status = new.payment_status,
    amount_due = case
      when new.due_amount > 0 then new.due_amount
      else new.total_amount
    end,
    updated_at = now()
  where id = new.appointment_id;

  return new;
end $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id text NOT NULL,
    hospital_id text NOT NULL,
    department_id uuid,
    doctor_id uuid,
    appointment_type text DEFAULT 'consultation'::text,
    treatment_id uuid,
    treatment_details jsonb,
    appointment_date date NOT NULL,
    appointment_slot text NOT NULL,
    booked_by uuid,
    booked_by_type text DEFAULT 'staff'::text NOT NULL,
    consultation_fee_snapshot numeric,
    status text DEFAULT 'scheduled'::text,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    patient_id text,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    amount_due numeric(10,2) DEFAULT 0 NOT NULL,
    confirmed_by uuid,
    confirmed_at timestamp with time zone,
    cancellation_reason text,
    CONSTRAINT appointments_booked_by_type_check CHECK ((booked_by_type = ANY (ARRAY['staff'::text, 'patient'::text]))),
    CONSTRAINT appointments_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'partially_paid'::text, 'paid'::text]))),
    CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['pending_confirmation'::text, 'scheduled'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id uuid NOT NULL,
    name text NOT NULL,
    code text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text NOT NULL,
    storage_key text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    profile_id uuid,
    hospital_id text,
    patient_id text,
    appointment_id text,
    notice_id uuid,
    uploaded_by uuid,
    uploaded_by_role text DEFAULT 'staff'::text NOT NULL,
    title text,
    description text,
    document_type text,
    is_public boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT documents_medical_never_public CHECK ((NOT (is_public AND (scope = ANY (ARRAY['prescription'::text, 'medical_report'::text]))))),
    CONSTRAINT documents_scope_check CHECK ((scope = ANY (ARRAY['avatar'::text, 'hospital_media'::text, 'notice_media'::text, 'prescription'::text, 'medical_report'::text]))),
    CONSTRAINT documents_scope_owner CHECK ((((scope = 'avatar'::text) AND (profile_id IS NOT NULL)) OR ((scope = 'hospital_media'::text) AND (hospital_id IS NOT NULL)) OR ((scope = 'notice_media'::text) AND (hospital_id IS NOT NULL)) OR ((scope = 'prescription'::text) AND (patient_id IS NOT NULL) AND (hospital_id IS NOT NULL)) OR ((scope = 'medical_report'::text) AND (patient_id IS NOT NULL) AND (hospital_id IS NOT NULL)))),
    CONSTRAINT documents_size_bytes_check CHECK ((size_bytes > 0)),
    CONSTRAINT documents_uploaded_by_role_check CHECK ((uploaded_by_role = ANY (ARRAY['patient'::text, 'staff'::text])))
);


--
-- Name: email_verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verification_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    email text NOT NULL,
    code_hash text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: finance_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id text NOT NULL,
    direction text NOT NULL,
    category text NOT NULL,
    party text,
    amount numeric NOT NULL,
    payment_method text,
    reference text,
    notes text,
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT finance_transactions_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT finance_transactions_direction_check CHECK ((direction = ANY (ARRAY['incoming'::text, 'outgoing'::text]))),
    CONSTRAINT finance_transactions_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text, 'cheque'::text, 'card'::text, 'upi'::text, 'other'::text])))
);


--
-- Name: hospitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hospitals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_no text NOT NULL,
    name character varying(255) NOT NULL,
    license_number character varying(64) NOT NULL,
    address text NOT NULL,
    city character varying(64) NOT NULL,
    state character varying(64) NOT NULL,
    postal_code character varying(20) NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255) NOT NULL,
    administrator_name character varying(255) NOT NULL,
    hospital_type character varying(64),
    website text,
    total_beds integer,
    icu_beds integer,
    emergency_services boolean DEFAULT false,
    inpatient_services boolean DEFAULT false,
    ambulance_services boolean DEFAULT false,
    feedback_enabled boolean DEFAULT false,
    account_status character varying(32) DEFAULT 'Active'::character varying,
    logo_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT hospitals_icu_beds_check CHECK ((icu_beds >= 0)),
    CONSTRAINT hospitals_total_beds_check CHECK ((total_beds >= 0))
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id uuid NOT NULL,
    department_id uuid,
    item_name text NOT NULL,
    item_code text,
    category text,
    description text,
    quantity integer DEFAULT 0 NOT NULL,
    minimum_quantity integer DEFAULT 0,
    unit text,
    purchase_price numeric,
    supplier_name text,
    purchase_date date,
    expiry_date date,
    location text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoice_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id text NOT NULL,
    hospital_id text NOT NULL,
    payment_method text NOT NULL,
    amount numeric NOT NULL,
    reference_id text,
    paid_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    hospital_id text NOT NULL,
    appointment_id text,
    subtotal numeric DEFAULT 0,
    discount_type text,
    discount_value numeric,
    discount_amount numeric DEFAULT 0,
    tax_amount numeric DEFAULT 0,
    total_amount numeric NOT NULL,
    paid_amount numeric DEFAULT 0,
    due_amount numeric DEFAULT 0,
    payment_status text DEFAULT 'unpaid'::text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    patient_id text
);


--
-- Name: issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id text,
    raised_by uuid,
    title text NOT NULL,
    description text,
    category text DEFAULT 'general'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    admin_response text,
    responded_by uuid,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT issues_category_check CHECK ((category = ANY (ARRAY['general'::text, 'technical'::text, 'billing'::text, 'access'::text, 'feature_request'::text, 'other'::text]))),
    CONSTRAINT issues_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT issues_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
);


--
-- Name: notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id text NOT NULL,
    created_by uuid,
    title text NOT NULL,
    body text,
    category text DEFAULT 'general'::text NOT NULL,
    audience text,
    is_pinned boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    audience_roles text[] DEFAULT ARRAY['all'::text] NOT NULL,
    CONSTRAINT notices_audience_check CHECK ((audience = ANY (ARRAY['all'::text, 'doctors'::text, 'nurses'::text, 'admins'::text]))),
    CONSTRAINT notices_audience_roles_valid CHECK (((array_length(audience_roles, 1) >= 1) AND (audience_roles <@ ARRAY['all'::text, 'staff'::text, 'patient'::text, 'doctor'::text, 'nurse'::text, 'receptionist'::text, 'lab_technician'::text, 'pharmacist'::text, 'hospital_admin'::text, 'other'::text]))),
    CONSTRAINT notices_category_check CHECK ((category = ANY (ARRAY['general'::text, 'urgent'::text, 'schedule'::text, 'policy'::text, 'event'::text, 'health_alert'::text, 'advisory'::text, 'closure'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_id uuid,
    recipient_role text,
    hospital_id text,
    kind text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    entity_type text,
    entity_id text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_has_target CHECK (((recipient_id IS NOT NULL) OR ((recipient_role IS NOT NULL) AND (hospital_id IS NOT NULL)))),
    CONSTRAINT notifications_kind_check CHECK ((kind = ANY (ARRAY['appointment_requested'::text, 'appointment_confirmed'::text, 'appointment_cancelled'::text, 'appointment_rescheduled'::text])))
);


--
-- Name: patient_notices; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.patient_notices AS
 SELECT id,
    hospital_id,
    created_by,
    title,
    body,
    category,
    is_pinned,
    published_at,
    expires_at,
    created_at,
    updated_at
   FROM public.notices
  WHERE (audience_roles && ARRAY['all'::text, 'patient'::text]);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    profile_id uuid NOT NULL,
    hospital_id text NOT NULL,
    height numeric,
    weight numeric,
    marital_status text,
    emergency_contact_name text,
    emergency_contact_mobile text,
    insurance_provider text,
    insurance_number text,
    allergies text,
    chronic_conditions text,
    medical_notes text,
    registered_by uuid,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    registration_no text NOT NULL,
    id text NOT NULL
);


--
-- Name: prescription_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prescription_id uuid NOT NULL,
    actor_id uuid,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prescription_audit_logs_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'updated'::text, 'issued'::text, 'amended'::text, 'cancelled'::text, 'shared'::text])))
);


--
-- Name: prescription_option_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_option_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    option_set_id uuid NOT NULL,
    item_key text NOT NULL,
    label text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    synonyms jsonb DEFAULT '[]'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prescription_option_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_option_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id text,
    doctor_id uuid,
    created_by uuid,
    set_key text NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    visibility text DEFAULT 'doctor'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prescription_option_sets_scope_check CHECK ((((visibility = 'system'::text) AND (hospital_id IS NULL) AND (doctor_id IS NULL)) OR ((visibility = 'hospital'::text) AND (hospital_id IS NOT NULL)) OR ((visibility = 'doctor'::text) AND (hospital_id IS NOT NULL) AND (doctor_id IS NOT NULL)))),
    CONSTRAINT prescription_option_sets_visibility_check CHECK ((visibility = ANY (ARRAY['system'::text, 'hospital'::text, 'doctor'::text])))
);


--
-- Name: prescription_preset_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_preset_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    preset_id uuid NOT NULL,
    field_id uuid NOT NULL,
    value jsonb NOT NULL
);


--
-- Name: prescription_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_presets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id text,
    doctor_id uuid,
    created_by uuid,
    template_id uuid,
    template_version_id uuid,
    preset_key text NOT NULL,
    name text NOT NULL,
    description text,
    visibility text DEFAULT 'doctor'::text NOT NULL,
    is_favorite boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prescription_presets_scope_check CHECK ((((visibility = 'system'::text) AND (hospital_id IS NULL) AND (doctor_id IS NULL)) OR ((visibility = 'hospital'::text) AND (hospital_id IS NOT NULL)) OR ((visibility = 'doctor'::text) AND (hospital_id IS NOT NULL) AND (doctor_id IS NOT NULL)))),
    CONSTRAINT prescription_presets_visibility_check CHECK ((visibility = ANY (ARRAY['system'::text, 'hospital'::text, 'doctor'::text])))
);


--
-- Name: prescription_template_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_template_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version_id uuid NOT NULL,
    section_id uuid NOT NULL,
    option_set_id uuid,
    field_key text NOT NULL,
    label text NOT NULL,
    helper_text text,
    field_type text NOT NULL,
    value_mode text DEFAULT 'scalar'::text NOT NULL,
    placeholder text,
    unit_label text,
    sort_order integer DEFAULT 0 NOT NULL,
    width integer DEFAULT 1 NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_removable boolean DEFAULT true NOT NULL,
    is_repeatable boolean DEFAULT false NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    default_value jsonb,
    validation_rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    ui_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT prescription_template_fields_field_type_check CHECK ((field_type = ANY (ARRAY['text'::text, 'textarea'::text, 'number'::text, 'date'::text, 'datetime'::text, 'select'::text, 'multi_select'::text, 'checkbox'::text, 'radio'::text, 'switch'::text, 'json'::text, 'medication_list'::text]))),
    CONSTRAINT prescription_template_fields_value_mode_check CHECK ((value_mode = ANY (ARRAY['scalar'::text, 'array'::text, 'object'::text])))
);


--
-- Name: prescription_template_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_template_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version_id uuid NOT NULL,
    section_key text NOT NULL,
    title text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    column_span integer DEFAULT 1 NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_removable boolean DEFAULT true NOT NULL,
    ui_config jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: prescription_template_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_template_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    version_number integer NOT NULL,
    version_label text,
    change_summary text,
    created_by uuid,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    snapshot jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: prescription_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id text,
    doctor_id uuid,
    created_by uuid,
    source_template_id uuid,
    template_key text NOT NULL,
    name text NOT NULL,
    description text,
    specialty_key text,
    department_id uuid,
    visibility text DEFAULT 'doctor'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    current_version integer DEFAULT 1 NOT NULL,
    layout_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prescription_templates_scope_check CHECK ((((visibility = 'system'::text) AND (hospital_id IS NULL) AND (doctor_id IS NULL)) OR ((visibility = 'hospital'::text) AND (hospital_id IS NOT NULL)) OR ((visibility = 'doctor'::text) AND (hospital_id IS NOT NULL) AND (doctor_id IS NOT NULL)))),
    CONSTRAINT prescription_templates_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]))),
    CONSTRAINT prescription_templates_visibility_check CHECK ((visibility = ANY (ARRAY['system'::text, 'hospital'::text, 'doctor'::text])))
);


--
-- Name: prescription_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prescription_id uuid NOT NULL,
    field_id uuid,
    section_key text,
    field_key text NOT NULL,
    label text,
    value jsonb NOT NULL,
    rendered_value text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id text NOT NULL,
    doctor_id uuid NOT NULL,
    created_by uuid,
    patient_id text NOT NULL,
    appointment_id text,
    template_id uuid,
    template_version_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    clinical_summary text,
    follow_up_date date,
    template_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    issued_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prescriptions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'amended'::text, 'cancelled'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    registration_no text NOT NULL,
    name text NOT NULL,
    email text,
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
    must_change_password boolean DEFAULT false NOT NULL,
    must_complete_profile boolean DEFAULT false NOT NULL,
    email_verified boolean DEFAULT false NOT NULL
);


--
-- Name: rbac; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rbac (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id text NOT NULL,
    target_type text NOT NULL,
    staff_id uuid,
    role text,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_allowed boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT rbac_target_type_check CHECK ((target_type = ANY (ARRAY['all'::text, 'role'::text, 'user'::text])))
);


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id text NOT NULL,
    department_id uuid,
    role text NOT NULL,
    employee_registration_no text NOT NULL,
    name text NOT NULL,
    gender text,
    date_of_birth date,
    specialization text,
    qualification text,
    years_of_experience integer,
    shift text,
    salary numeric,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    shift_name text,
    shift_start_time time without time zone,
    shift_end_time time without time zone,
    address text,
    emergency_contact text,
    joining_date date,
    employment_type text,
    license_number text,
    license_expiry date,
    max_patients_per_day integer,
    consultation_fee numeric,
    avatar_url text,
    notes text,
    updated_at timestamp with time zone DEFAULT now(),
    work_days jsonb,
    slot_duration_minutes integer DEFAULT 60 NOT NULL,
    max_patients_per_slot integer DEFAULT 1 NOT NULL,
    break_start_time time without time zone,
    break_end_time time without time zone,
    CONSTRAINT staff_break_valid CHECK ((((break_start_time IS NULL) AND (break_end_time IS NULL)) OR ((break_start_time IS NOT NULL) AND (break_end_time IS NOT NULL) AND (break_end_time > break_start_time)))),
    CONSTRAINT staff_max_patients_per_slot_check CHECK ((max_patients_per_slot >= 1)),
    CONSTRAINT staff_role_check CHECK ((role = ANY (ARRAY['doctor'::text, 'nurse'::text, 'receptionist'::text, 'lab_technician'::text, 'pharmacist'::text, 'admin'::text, 'other'::text]))),
    CONSTRAINT staff_slot_duration_minutes_check CHECK ((slot_duration_minutes = ANY (ARRAY[15, 20, 30, 45, 60, 90, 120])))
);


--
-- Name: staff_unavailability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_unavailability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id text NOT NULL,
    staff_id uuid,
    kind text DEFAULT 'leave'::text NOT NULL,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    starts_at_time time without time zone,
    ends_at_time time without time zone,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT staff_unavailability_dates CHECK ((ends_on >= starts_on)),
    CONSTRAINT staff_unavailability_kind_check CHECK ((kind = ANY (ARRAY['leave'::text, 'holiday'::text, 'unavailable'::text]))),
    CONSTRAINT staff_unavailability_times CHECK ((((starts_at_time IS NULL) AND (ends_at_time IS NULL)) OR ((starts_at_time IS NOT NULL) AND (ends_at_time IS NOT NULL) AND (ends_at_time > starts_at_time))))
);


--
-- Name: treatments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hospital_id uuid NOT NULL,
    treatment_name text NOT NULL,
    treatment_code text,
    description text,
    department_id uuid,
    base_price numeric NOT NULL,
    duration_minutes integer,
    preparation_instructions text,
    post_treatment_instructions text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: departments departments_hospital_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_hospital_id_name_key UNIQUE (hospital_id, name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents documents_storage_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_storage_key_key UNIQUE (storage_key);


--
-- Name: email_verification_codes email_verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_codes
    ADD CONSTRAINT email_verification_codes_pkey PRIMARY KEY (id);


--
-- Name: finance_transactions finance_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_pkey PRIMARY KEY (id);


--
-- Name: hospitals hospitals_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_email_key UNIQUE (email);


--
-- Name: hospitals hospitals_license_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_license_number_key UNIQUE (license_number);


--
-- Name: hospitals hospitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_pkey PRIMARY KEY (id);


--
-- Name: hospitals hospitals_registration_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_registration_no_key UNIQUE (registration_no);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: invoice_payments invoice_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: issues issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (id);


--
-- Name: notices notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: patients patients_profile_hospital_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_profile_hospital_unique UNIQUE (profile_id, hospital_id);


--
-- Name: prescription_audit_logs prescription_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_audit_logs
    ADD CONSTRAINT prescription_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: prescription_option_items prescription_option_items_option_set_id_item_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_option_items
    ADD CONSTRAINT prescription_option_items_option_set_id_item_key_key UNIQUE (option_set_id, item_key);


--
-- Name: prescription_option_items prescription_option_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_option_items
    ADD CONSTRAINT prescription_option_items_pkey PRIMARY KEY (id);


--
-- Name: prescription_option_sets prescription_option_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_option_sets
    ADD CONSTRAINT prescription_option_sets_pkey PRIMARY KEY (id);


--
-- Name: prescription_preset_values prescription_preset_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_preset_values
    ADD CONSTRAINT prescription_preset_values_pkey PRIMARY KEY (id);


--
-- Name: prescription_preset_values prescription_preset_values_preset_id_field_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_preset_values
    ADD CONSTRAINT prescription_preset_values_preset_id_field_id_key UNIQUE (preset_id, field_id);


--
-- Name: prescription_presets prescription_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_presets
    ADD CONSTRAINT prescription_presets_pkey PRIMARY KEY (id);


--
-- Name: prescription_template_fields prescription_template_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_fields
    ADD CONSTRAINT prescription_template_fields_pkey PRIMARY KEY (id);


--
-- Name: prescription_template_fields prescription_template_fields_version_id_field_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_fields
    ADD CONSTRAINT prescription_template_fields_version_id_field_key_key UNIQUE (version_id, field_key);


--
-- Name: prescription_template_sections prescription_template_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_sections
    ADD CONSTRAINT prescription_template_sections_pkey PRIMARY KEY (id);


--
-- Name: prescription_template_sections prescription_template_sections_version_id_section_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_sections
    ADD CONSTRAINT prescription_template_sections_version_id_section_key_key UNIQUE (version_id, section_key);


--
-- Name: prescription_template_versions prescription_template_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_versions
    ADD CONSTRAINT prescription_template_versions_pkey PRIMARY KEY (id);


--
-- Name: prescription_template_versions prescription_template_versions_template_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_versions
    ADD CONSTRAINT prescription_template_versions_template_id_version_number_key UNIQUE (template_id, version_number);


--
-- Name: prescription_templates prescription_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_templates
    ADD CONSTRAINT prescription_templates_pkey PRIMARY KEY (id);


--
-- Name: prescription_values prescription_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_values
    ADD CONSTRAINT prescription_values_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_registration_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_registration_no_key UNIQUE (registration_no);


--
-- Name: rbac rbac_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rbac
    ADD CONSTRAINT rbac_pkey PRIMARY KEY (id);


--
-- Name: staff staff_hospital_id_employee_registration_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_hospital_id_employee_registration_no_key UNIQUE (hospital_id, employee_registration_no);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: staff_unavailability staff_unavailability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_unavailability
    ADD CONSTRAINT staff_unavailability_pkey PRIMARY KEY (id);


--
-- Name: treatments treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_pkey PRIMARY KEY (id);


--
-- Name: idx_appointments_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_pending ON public.appointments USING btree (hospital_id, created_at DESC) WHERE (status = 'pending_confirmation'::text);


--
-- Name: idx_documents_hospital; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_hospital ON public.documents USING btree (hospital_id, scope, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_documents_notice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_notice ON public.documents USING btree (notice_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_documents_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_patient ON public.documents USING btree (patient_id, scope, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_documents_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_profile ON public.documents USING btree (profile_id, scope) WHERE (deleted_at IS NULL);


--
-- Name: idx_evc_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evc_expires ON public.email_verification_codes USING btree (expires_at);


--
-- Name: idx_evc_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evc_profile ON public.email_verification_codes USING btree (profile_id);


--
-- Name: idx_finance_tx_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_direction ON public.finance_transactions USING btree (hospital_id, direction);


--
-- Name: idx_finance_tx_hospital; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_hospital ON public.finance_transactions USING btree (hospital_id, transaction_date DESC);


--
-- Name: idx_hospitals_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hospitals_email ON public.hospitals USING btree (email);


--
-- Name: idx_hospitals_registration_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hospitals_registration_no ON public.hospitals USING btree (registration_no);


--
-- Name: idx_issues_hospital; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_hospital ON public.issues USING btree (hospital_id, created_at DESC);


--
-- Name: idx_issues_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_status ON public.issues USING btree (status, priority);


--
-- Name: idx_notices_audience; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notices_audience ON public.notices USING gin (audience_roles);


--
-- Name: idx_notices_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notices_expiry ON public.notices USING btree (expires_at);


--
-- Name: idx_notices_hospital; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notices_hospital ON public.notices USING btree (hospital_id, is_pinned DESC, published_at DESC);


--
-- Name: idx_notifications_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_entity ON public.notifications USING btree (entity_type, entity_id);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id, created_at DESC) WHERE (recipient_id IS NOT NULL);


--
-- Name: idx_notifications_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_role ON public.notifications USING btree (hospital_id, recipient_role, created_at DESC) WHERE (recipient_role IS NOT NULL);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (recipient_id) WHERE ((recipient_id IS NOT NULL) AND (read_at IS NULL));


--
-- Name: idx_patients_hospital_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_hospital_id ON public.patients USING btree (hospital_id);


--
-- Name: idx_patients_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_profile_id ON public.patients USING btree (profile_id);


--
-- Name: idx_prescription_audit_logs_prescription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_audit_logs_prescription ON public.prescription_audit_logs USING btree (prescription_id, created_at DESC);


--
-- Name: idx_prescription_option_items_set; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_option_items_set ON public.prescription_option_items USING btree (option_set_id, sort_order);


--
-- Name: idx_prescription_option_sets_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_option_sets_scope ON public.prescription_option_sets USING btree (visibility, hospital_id, doctor_id, category);


--
-- Name: idx_prescription_presets_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_presets_scope ON public.prescription_presets USING btree (visibility, hospital_id, doctor_id, template_id);


--
-- Name: idx_prescription_template_fields_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_template_fields_version ON public.prescription_template_fields USING btree (version_id, section_id, sort_order);


--
-- Name: idx_prescription_template_sections_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_template_sections_version ON public.prescription_template_sections USING btree (version_id, sort_order);


--
-- Name: idx_prescription_template_versions_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_template_versions_template ON public.prescription_template_versions USING btree (template_id, version_number DESC);


--
-- Name: idx_prescription_templates_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_templates_department ON public.prescription_templates USING btree (department_id, specialty_key);


--
-- Name: idx_prescription_templates_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_templates_scope ON public.prescription_templates USING btree (visibility, hospital_id, doctor_id);


--
-- Name: idx_prescription_values_prescription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_values_prescription ON public.prescription_values USING btree (prescription_id, sort_order);


--
-- Name: idx_prescriptions_appointment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_appointment ON public.prescriptions USING btree (appointment_id);


--
-- Name: idx_prescriptions_hospital_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_hospital_doctor ON public.prescriptions USING btree (hospital_id, doctor_id, created_at DESC);


--
-- Name: idx_prescriptions_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_patient ON public.prescriptions USING btree (patient_id, created_at DESC);


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);


--
-- Name: idx_profiles_hospital_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_hospital_id ON public.profiles USING btree (hospital_id);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: idx_unavailability_hospital_wide; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unavailability_hospital_wide ON public.staff_unavailability USING btree (hospital_id, starts_on, ends_on) WHERE (staff_id IS NULL);


--
-- Name: idx_unavailability_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unavailability_lookup ON public.staff_unavailability USING btree (hospital_id, staff_id, starts_on, ends_on);


--
-- Name: appointments trg_enforce_patient_appointment_cancel; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_patient_appointment_cancel BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.enforce_patient_appointment_cancel();


--
-- Name: appointments trg_enforce_slot_capacity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_slot_capacity BEFORE INSERT OR UPDATE OF doctor_id, appointment_date, appointment_slot, status ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.enforce_slot_capacity();


--
-- Name: invoices trg_sync_appointment_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_appointment_payment AFTER INSERT OR UPDATE OF payment_status, paid_amount, total_amount, due_amount ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_payment_from_invoice();


--
-- Name: appointments appointments_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_department_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_department_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: appointments appointments_doctor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: appointments appointments_hospital_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_hospital_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: departments departments_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;


--
-- Name: documents documents_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: documents documents_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: documents documents_notice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_notice_id_fkey FOREIGN KEY (notice_id) REFERENCES public.notices(id) ON DELETE CASCADE;


--
-- Name: documents documents_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: documents documents_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: email_verification_codes email_verification_codes_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verification_codes
    ADD CONSTRAINT email_verification_codes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: finance_transactions finance_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: finance_transactions finance_transactions_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: inventory inventory_department_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_department_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: inventory inventory_hospital_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_hospital_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;


--
-- Name: invoice_payments invoice_payments_invoice_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_invoice_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_appointment_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_appointment_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_hospital_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_hospital_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: invoices invoices_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: issues issues_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE SET NULL;


--
-- Name: issues issues_raised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: issues issues_responded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notices notices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notices notices_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: notifications notifications_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: patients patients_hospital_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_hospital_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: patients patients_profile_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_profile_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: patients patients_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: prescription_audit_logs prescription_audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_audit_logs
    ADD CONSTRAINT prescription_audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: prescription_audit_logs prescription_audit_logs_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_audit_logs
    ADD CONSTRAINT prescription_audit_logs_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;


--
-- Name: prescription_option_items prescription_option_items_option_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_option_items
    ADD CONSTRAINT prescription_option_items_option_set_id_fkey FOREIGN KEY (option_set_id) REFERENCES public.prescription_option_sets(id) ON DELETE CASCADE;


--
-- Name: prescription_option_sets prescription_option_sets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_option_sets
    ADD CONSTRAINT prescription_option_sets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: prescription_option_sets prescription_option_sets_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_option_sets
    ADD CONSTRAINT prescription_option_sets_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: prescription_option_sets prescription_option_sets_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_option_sets
    ADD CONSTRAINT prescription_option_sets_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: prescription_preset_values prescription_preset_values_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_preset_values
    ADD CONSTRAINT prescription_preset_values_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.prescription_template_fields(id) ON DELETE CASCADE;


--
-- Name: prescription_preset_values prescription_preset_values_preset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_preset_values
    ADD CONSTRAINT prescription_preset_values_preset_id_fkey FOREIGN KEY (preset_id) REFERENCES public.prescription_presets(id) ON DELETE CASCADE;


--
-- Name: prescription_presets prescription_presets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_presets
    ADD CONSTRAINT prescription_presets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: prescription_presets prescription_presets_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_presets
    ADD CONSTRAINT prescription_presets_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: prescription_presets prescription_presets_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_presets
    ADD CONSTRAINT prescription_presets_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: prescription_presets prescription_presets_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_presets
    ADD CONSTRAINT prescription_presets_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.prescription_templates(id) ON DELETE CASCADE;


--
-- Name: prescription_presets prescription_presets_template_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_presets
    ADD CONSTRAINT prescription_presets_template_version_id_fkey FOREIGN KEY (template_version_id) REFERENCES public.prescription_template_versions(id) ON DELETE SET NULL;


--
-- Name: prescription_template_fields prescription_template_fields_option_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_fields
    ADD CONSTRAINT prescription_template_fields_option_set_id_fkey FOREIGN KEY (option_set_id) REFERENCES public.prescription_option_sets(id) ON DELETE SET NULL;


--
-- Name: prescription_template_fields prescription_template_fields_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_fields
    ADD CONSTRAINT prescription_template_fields_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.prescription_template_sections(id) ON DELETE CASCADE;


--
-- Name: prescription_template_fields prescription_template_fields_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_fields
    ADD CONSTRAINT prescription_template_fields_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.prescription_template_versions(id) ON DELETE CASCADE;


--
-- Name: prescription_template_sections prescription_template_sections_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_sections
    ADD CONSTRAINT prescription_template_sections_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.prescription_template_versions(id) ON DELETE CASCADE;


--
-- Name: prescription_template_versions prescription_template_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_versions
    ADD CONSTRAINT prescription_template_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: prescription_template_versions prescription_template_versions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_template_versions
    ADD CONSTRAINT prescription_template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.prescription_templates(id) ON DELETE CASCADE;


--
-- Name: prescription_templates prescription_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_templates
    ADD CONSTRAINT prescription_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: prescription_templates prescription_templates_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_templates
    ADD CONSTRAINT prescription_templates_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: prescription_templates prescription_templates_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_templates
    ADD CONSTRAINT prescription_templates_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: prescription_templates prescription_templates_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_templates
    ADD CONSTRAINT prescription_templates_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: prescription_templates prescription_templates_source_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_templates
    ADD CONSTRAINT prescription_templates_source_template_id_fkey FOREIGN KEY (source_template_id) REFERENCES public.prescription_templates(id) ON DELETE SET NULL;


--
-- Name: prescription_values prescription_values_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_values
    ADD CONSTRAINT prescription_values_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.prescription_template_fields(id) ON DELETE SET NULL;


--
-- Name: prescription_values prescription_values_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_values
    ADD CONSTRAINT prescription_values_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: prescriptions prescriptions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: prescriptions prescriptions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id) ON DELETE RESTRICT;


--
-- Name: prescriptions prescriptions_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.prescription_templates(id) ON DELETE SET NULL;


--
-- Name: prescriptions prescriptions_template_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_template_version_id_fkey FOREIGN KEY (template_version_id) REFERENCES public.prescription_template_versions(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: staff staff_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: staff staff_employee_registration_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_employee_registration_no_fkey FOREIGN KEY (employee_registration_no) REFERENCES public.profiles(registration_no) ON DELETE CASCADE;


--
-- Name: staff staff_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: staff_unavailability staff_unavailability_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_unavailability
    ADD CONSTRAINT staff_unavailability_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: staff_unavailability staff_unavailability_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_unavailability
    ADD CONSTRAINT staff_unavailability_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(registration_no) ON DELETE CASCADE;


--
-- Name: staff_unavailability staff_unavailability_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_unavailability
    ADD CONSTRAINT staff_unavailability_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: treatments treatments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: treatments treatments_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;


--
-- Name: finance_transactions Finance manage by hospital admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Finance manage by hospital admin" ON public.finance_transactions USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'hospital_admin'::text) AND (p.hospital_id = finance_transactions.hospital_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'hospital_admin'::text) AND (p.hospital_id = finance_transactions.hospital_id)))));


--
-- Name: finance_transactions Finance manage by super admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Finance manage by super admin" ON public.finance_transactions USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text)))));


--
-- Name: finance_transactions Finance read by hospital admin or super admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Finance read by hospital admin or super admin" ON public.finance_transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ((p.role = 'super_admin'::text) OR ((p.role = 'hospital_admin'::text) AND (p.hospital_id = finance_transactions.hospital_id)))))));


--
-- Name: staff_unavailability Hospital admins manage unavailability; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hospital admins manage unavailability" ON public.staff_unavailability TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND ((pr.role = 'super_admin'::text) OR ((pr.role = 'hospital_admin'::text) AND (pr.hospital_id = staff_unavailability.hospital_id))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND ((pr.role = 'super_admin'::text) OR ((pr.role = 'hospital_admin'::text) AND (pr.hospital_id = staff_unavailability.hospital_id)))))));


--
-- Name: staff_unavailability Hospital members read unavailability; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hospital members read unavailability" ON public.staff_unavailability FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.hospital_id = staff_unavailability.hospital_id)))) OR (EXISTS ( SELECT 1
   FROM public.patients p
  WHERE ((p.profile_id = auth.uid()) AND (p.hospital_id = staff_unavailability.hospital_id)))) OR (EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super_admin'::text))))));


--
-- Name: issues Issues insert by hospital admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Issues insert by hospital admin" ON public.issues FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'hospital_admin'::text) AND (p.hospital_id = issues.hospital_id)))));


--
-- Name: issues Issues manage by super admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Issues manage by super admin" ON public.issues FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'super_admin'::text)))));


--
-- Name: issues Issues read by hospital admin or super admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Issues read by hospital admin or super admin" ON public.issues FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ((p.role = 'super_admin'::text) OR ((p.role = 'hospital_admin'::text) AND (p.hospital_id = issues.hospital_id)))))));


--
-- Name: notices Notices manage by hospital admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notices manage by hospital admin" ON public.notices TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ((p.role = 'super_admin'::text) OR ((p.role = 'hospital_admin'::text) AND (p.hospital_id = notices.hospital_id))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND ((p.role = 'super_admin'::text) OR ((p.role = 'hospital_admin'::text) AND (p.hospital_id = notices.hospital_id)))))));


--
-- Name: notices Notices read by audience; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Notices read by audience" ON public.notices FOR SELECT TO authenticated USING ((((expires_at IS NULL) OR (expires_at > now())) AND (published_at <= now()) AND ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.hospital_id = notices.hospital_id) AND (pr.role <> 'patient'::text) AND ((notices.audience_roles && ARRAY['all'::text, 'staff'::text]) OR (notices.audience_roles && ARRAY[pr.role]))))) OR ((audience_roles && ARRAY['all'::text, 'patient'::text]) AND (EXISTS ( SELECT 1
   FROM public.patients p
  WHERE ((p.profile_id = auth.uid()) AND (p.hospital_id = notices.hospital_id))))) OR (EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super_admin'::text)))))));


--
-- Name: appointments Patients can cancel their own pending appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Patients can cancel their own pending appointments" ON public.appointments FOR UPDATE TO authenticated USING (((status = 'pending_confirmation'::text) AND (patient_id IN ( SELECT p.id
   FROM public.patients p
  WHERE (p.profile_id = auth.uid()))))) WITH CHECK (((status = 'cancelled'::text) AND (patient_id IN ( SELECT p.id
   FROM public.patients p
  WHERE (p.profile_id = auth.uid())))));


--
-- Name: prescriptions Patients can view their own prescriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Patients can view their own prescriptions" ON public.prescriptions FOR SELECT TO authenticated USING ((patient_id IN ( SELECT p.id
   FROM public.patients p
  WHERE (p.profile_id = auth.uid()))));


--
-- Name: documents Patients read their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Patients read their own documents" ON public.documents FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (patient_id IN ( SELECT p.id
   FROM public.patients p
  WHERE (p.profile_id = auth.uid())))));


--
-- Name: prescription_audit_logs Prescription audit logs insert by prescription scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription audit logs insert by prescription scope" ON public.prescription_audit_logs FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.prescriptions pr
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((pr.id = prescription_audit_logs.prescription_id) AND (pr.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text]))))));


--
-- Name: prescription_audit_logs Prescription audit logs read by prescription scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription audit logs read by prescription scope" ON public.prescription_audit_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.prescriptions pr
  WHERE ((pr.id = prescription_audit_logs.prescription_id) AND (pr.hospital_id = ( SELECT profiles.hospital_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: prescription_template_fields Prescription fields manage by template scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription fields manage by template scope" ON public.prescription_template_fields USING ((EXISTS ( SELECT 1
   FROM ((public.prescription_template_versions v
     JOIN public.prescription_templates t ON ((t.id = v.template_id)))
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((v.id = prescription_template_fields.version_id) AND (t.visibility <> 'system'::text) AND (t.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.prescription_template_versions v
     JOIN public.prescription_templates t ON ((t.id = v.template_id)))
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((v.id = prescription_template_fields.version_id) AND (t.visibility <> 'system'::text) AND (t.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text]))))));


--
-- Name: prescription_template_fields Prescription fields read by template scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription fields read by template scope" ON public.prescription_template_fields FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.prescription_template_versions v
     JOIN public.prescription_templates t ON ((t.id = v.template_id)))
  WHERE ((v.id = prescription_template_fields.version_id) AND ((t.visibility = 'system'::text) OR (t.hospital_id = ( SELECT profiles.hospital_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: prescription_option_items Prescription option items manage by option scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription option items manage by option scope" ON public.prescription_option_items USING ((EXISTS ( SELECT 1
   FROM (public.prescription_option_sets s
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((s.id = prescription_option_items.option_set_id) AND (s.visibility <> 'system'::text) AND (s.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.prescription_option_sets s
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((s.id = prescription_option_items.option_set_id) AND (s.visibility <> 'system'::text) AND (s.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text]))))));


--
-- Name: prescription_option_items Prescription option items read by option scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription option items read by option scope" ON public.prescription_option_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.prescription_option_sets s
  WHERE ((s.id = prescription_option_items.option_set_id) AND ((s.visibility = 'system'::text) OR (s.hospital_id = ( SELECT profiles.hospital_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: prescription_option_sets Prescription option sets manage by doctor or hospital admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription option sets manage by doctor or hospital admin" ON public.prescription_option_sets USING (((visibility <> 'system'::text) AND (hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text]))))))) WITH CHECK (((visibility <> 'system'::text) AND (hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text])))))));


--
-- Name: prescription_option_sets Prescription option sets read by scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription option sets read by scope" ON public.prescription_option_sets FOR SELECT USING (((visibility = 'system'::text) OR (hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: prescription_preset_values Prescription preset values manage by preset scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription preset values manage by preset scope" ON public.prescription_preset_values USING ((EXISTS ( SELECT 1
   FROM (public.prescription_presets pr
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((pr.id = prescription_preset_values.preset_id) AND (pr.visibility <> 'system'::text) AND (pr.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.prescription_presets pr
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((pr.id = prescription_preset_values.preset_id) AND (pr.visibility <> 'system'::text) AND (pr.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text]))))));


--
-- Name: prescription_preset_values Prescription preset values read by preset scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription preset values read by preset scope" ON public.prescription_preset_values FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.prescription_presets pr
  WHERE ((pr.id = prescription_preset_values.preset_id) AND ((pr.visibility = 'system'::text) OR (pr.hospital_id = ( SELECT profiles.hospital_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: prescription_presets Prescription presets manage by doctor or hospital admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription presets manage by doctor or hospital admin" ON public.prescription_presets USING (((visibility <> 'system'::text) AND (hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text]))))))) WITH CHECK (((visibility <> 'system'::text) AND (hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text])))))));


--
-- Name: prescription_presets Prescription presets read by scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription presets read by scope" ON public.prescription_presets FOR SELECT USING (((visibility = 'system'::text) OR (hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: prescription_template_sections Prescription sections manage by template scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription sections manage by template scope" ON public.prescription_template_sections USING ((EXISTS ( SELECT 1
   FROM ((public.prescription_template_versions v
     JOIN public.prescription_templates t ON ((t.id = v.template_id)))
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((v.id = prescription_template_sections.version_id) AND (t.visibility <> 'system'::text) AND (t.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.prescription_template_versions v
     JOIN public.prescription_templates t ON ((t.id = v.template_id)))
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((v.id = prescription_template_sections.version_id) AND (t.visibility <> 'system'::text) AND (t.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text]))))));


--
-- Name: prescription_template_sections Prescription sections read by template scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription sections read by template scope" ON public.prescription_template_sections FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.prescription_template_versions v
     JOIN public.prescription_templates t ON ((t.id = v.template_id)))
  WHERE ((v.id = prescription_template_sections.version_id) AND ((t.visibility = 'system'::text) OR (t.hospital_id = ( SELECT profiles.hospital_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: prescription_template_versions Prescription template versions manage by template scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription template versions manage by template scope" ON public.prescription_template_versions USING ((EXISTS ( SELECT 1
   FROM (public.prescription_templates t
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((t.id = prescription_template_versions.template_id) AND (t.visibility <> 'system'::text) AND (t.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.prescription_templates t
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((t.id = prescription_template_versions.template_id) AND (t.visibility <> 'system'::text) AND (t.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text]))))));


--
-- Name: prescription_template_versions Prescription template versions read by template scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription template versions read by template scope" ON public.prescription_template_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.prescription_templates t
  WHERE ((t.id = prescription_template_versions.template_id) AND ((t.visibility = 'system'::text) OR (t.hospital_id = ( SELECT profiles.hospital_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: prescription_templates Prescription templates manage by doctor or hospital admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription templates manage by doctor or hospital admin" ON public.prescription_templates USING (((visibility <> 'system'::text) AND (hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text]))))))) WITH CHECK (((visibility <> 'system'::text) AND (hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text])))))));


--
-- Name: prescription_templates Prescription templates read by scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription templates read by scope" ON public.prescription_templates FOR SELECT USING (((visibility = 'system'::text) OR (hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: prescription_values Prescription values manage by prescription scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription values manage by prescription scope" ON public.prescription_values USING ((EXISTS ( SELECT 1
   FROM (public.prescriptions pr
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((pr.id = prescription_values.prescription_id) AND (pr.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.prescriptions pr
     JOIN public.profiles p ON ((p.id = auth.uid())))
  WHERE ((pr.id = prescription_values.prescription_id) AND (pr.hospital_id = p.hospital_id) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text]))))));


--
-- Name: prescription_values Prescription values read by prescription scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescription values read by prescription scope" ON public.prescription_values FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.prescriptions pr
  WHERE ((pr.id = prescription_values.prescription_id) AND (pr.hospital_id = ( SELECT profiles.hospital_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: prescriptions Prescriptions manage by doctor or hospital admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescriptions manage by doctor or hospital admin" ON public.prescriptions USING (((hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text]))))))) WITH CHECK (((hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['doctor'::text, 'hospital_admin'::text])))))));


--
-- Name: prescriptions Prescriptions read by hospital scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prescriptions read by hospital scope" ON public.prescriptions FOR SELECT USING ((hospital_id = ( SELECT profiles.hospital_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: documents Public media is readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public media is readable" ON public.documents FOR SELECT TO authenticated USING (((is_public = true) AND (deleted_at IS NULL)));


--
-- Name: appointments Reception can manage appointments in their hospital; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reception can manage appointments in their hospital" ON public.appointments TO authenticated USING ((hospital_id IN ( SELECT pr.hospital_id
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = ANY (ARRAY['receptionist'::text, 'reception'::text])))))) WITH CHECK ((hospital_id IN ( SELECT pr.hospital_id
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = ANY (ARRAY['receptionist'::text, 'reception'::text]))))));


--
-- Name: documents Staff read their hospital documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read their hospital documents" ON public.documents FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (hospital_id IN ( SELECT pr.hospital_id
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = ANY (ARRAY['hospital_admin'::text, 'doctor'::text, 'receptionist'::text, 'reception'::text, 'staff'::text])))))));


--
-- Name: documents Super admins read all documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins read all documents" ON public.documents FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'super_admin'::text)))));


--
-- Name: notifications Users mark their own notifications read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users mark their own notifications read" ON public.notifications FOR UPDATE TO authenticated USING ((recipient_id = auth.uid())) WITH CHECK ((recipient_id = auth.uid()));


--
-- Name: documents Users read their own avatar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read their own avatar" ON public.documents FOR SELECT TO authenticated USING (((scope = 'avatar'::text) AND (profile_id = auth.uid()) AND (deleted_at IS NULL)));


--
-- Name: notifications Users read their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read their own notifications" ON public.notifications FOR SELECT TO authenticated USING (((recipient_id = auth.uid()) OR ((recipient_role IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.hospital_id = notifications.hospital_id) AND (pr.role = notifications.recipient_role)))))));


--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: email_verification_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: finance_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: issues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

--
-- Name: notices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_option_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_option_items ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_option_sets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_option_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_preset_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_preset_values ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_presets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_presets ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_template_fields; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_template_fields ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_template_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_template_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_template_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_template_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_values ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_unavailability; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_unavailability ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict ecMyHfA1bSiTFYZMcFQfaGBwvbgyUF5KWONdBgbw9MFQHkHlOzw9hf7DP7HxNZe

