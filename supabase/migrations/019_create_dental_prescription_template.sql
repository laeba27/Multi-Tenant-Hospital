-- =========================================================
-- Dental Prescription Template (direct seed)
-- Inserts a complete dental prescription template:
--   template -> version 1 -> sections -> fields
--
-- IDs are looked up automatically from existing data:
--   - doctor_id   = first staff row with role = 'doctor'
--   - hospital_id = that staff member's hospital_id
--   - created_by  = that doctor's profile id
--                   (staff.employee_registration_no -> profiles.registration_no)
--
-- Idempotent: re-running deletes any prior template with the same
-- template_key for that doctor (cascades to versions/sections/fields)
-- before re-seeding.
-- =========================================================

DO $$
DECLARE
  v_doctor_id    uuid;
  v_hospital_id  text;
  v_created_by   uuid;
  v_template_id  uuid;
  v_version_id   uuid;
  v_section_id   uuid;
  v_template_key text;
BEGIN
  -- ---- Resolve the doctor / hospital / profile ------------------------------
  SELECT s.id, s.hospital_id, p.id
    INTO v_doctor_id, v_hospital_id, v_created_by
  FROM public.staff s
  JOIN public.profiles p
    ON p.registration_no = s.employee_registration_no
  WHERE s.role = 'doctor'
  ORDER BY s.id
  LIMIT 1;

  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'No staff row with role = ''doctor'' found. Create a doctor first, then re-run this seed.';
  END IF;

  v_template_key := 'dental_prescription_' || v_doctor_id;

  -- ---- Clean any previous copy (idempotent) --------------------------------
  DELETE FROM public.prescription_templates
  WHERE doctor_id = v_doctor_id
    AND template_key = v_template_key;

  -- ---- Template ------------------------------------------------------------
  INSERT INTO public.prescription_templates (
    hospital_id, doctor_id, created_by,
    template_key, name, description,
    visibility, status, is_default, current_version,
    layout_config
  ) VALUES (
    v_hospital_id, v_doctor_id, v_created_by,
    v_template_key, 'Dental Prescription Template', 'Complete dental prescription format',
    'doctor', 'active', true, 1,
    '{
      "sections": [
        {"key": "vitals", "title": "Vitals", "description": "Patient vital signs", "color": "bg-blue-50 border-blue-200", "is_enabled": true, "sort_order": 0},
        {"key": "chief_complaints", "title": "Chief Complaints", "description": "Patient reported issues", "color": "bg-rose-50 border-rose-200", "is_enabled": true, "is_required": true, "sort_order": 1},
        {"key": "history_present_illness", "title": "History of Present Illness", "description": "Detailed illness history", "color": "bg-amber-50 border-amber-200", "is_enabled": true, "sort_order": 2},
        {"key": "medical_history", "title": "Medical History & Medication", "description": "Past medical history and current medications", "color": "bg-purple-50 border-purple-200", "is_enabled": true, "sort_order": 3},
        {"key": "on_examination", "title": "On Examination", "description": "Clinical examination findings", "color": "bg-green-50 border-green-200", "is_enabled": true, "sort_order": 4},
        {"key": "investigation", "title": "Investigation", "description": "Diagnostic investigations advised", "color": "bg-cyan-50 border-cyan-200", "is_enabled": true, "sort_order": 5},
        {"key": "advice", "title": "Advice", "description": "Patient advice and instructions", "color": "bg-indigo-50 border-indigo-200", "is_enabled": true, "sort_order": 6},
        {"key": "treatment", "title": "Treatment", "description": "Treatment details", "color": "bg-emerald-50 border-emerald-200", "is_enabled": true, "sort_order": 7},
        {"key": "prescribed_medicines", "title": "Prescribed Medicines", "description": "Medication prescriptions", "color": "bg-red-50 border-red-200", "is_enabled": true, "is_required": true, "sort_order": 8},
        {"key": "additional_notes", "title": "Additional Notes & Precautions", "description": "Final notes and follow-up", "color": "bg-slate-50 border-slate-200", "is_enabled": true, "sort_order": 9}
      ]
    }'::jsonb
  )
  RETURNING id INTO v_template_id;

  -- ---- Version 1 -----------------------------------------------------------
  INSERT INTO public.prescription_template_versions (
    template_id, version_number, version_label, change_summary, created_by, published_at, snapshot
  ) VALUES (
    v_template_id, 1, 'Initial Version', 'Initial dental prescription template', v_created_by, now(),
    '{
      "sections": [
        {"key": "vitals", "title": "Vitals", "fields": [
          {"key": "blood_pressure", "label": "Blood Pressure", "type": "text", "placeholder": "120/80 mmHg"},
          {"key": "pulse", "label": "Pulse", "type": "text", "placeholder": "72 bpm"},
          {"key": "temperature", "label": "Temperature", "type": "text", "placeholder": "98.6F"},
          {"key": "spo2", "label": "SpO2", "type": "text", "placeholder": "98%"}
        ]},
        {"key": "chief_complaints", "title": "Chief Complaints", "fields": [
          {"key": "complaint", "label": "Complaint", "type": "select", "options": ["Tooth Pain", "Sensitivity", "Gum Bleeding", "Gum Swelling", "Bad Breath", "Tooth Mobility", "Fractured Tooth", "Discolored Tooth", "Missing Tooth", "Wisdom Tooth Pain", "Jaw Pain", "Mouth Ulcer", "Dry Mouth", "Teeth Grinding", "Bite Problem"]},
          {"key": "location", "label": "Location", "type": "select", "options": ["Upper Left", "Upper Right", "Lower Left", "Lower Right", "Front", "General", "Multiple Areas"]},
          {"key": "duration", "label": "Duration", "type": "text", "placeholder": "e.g., 3 days, 1 week"}
        ]},
        {"key": "history_present_illness", "title": "History of Present Illness", "fields": [
          {"key": "hpi", "label": "History", "type": "textarea"},
          {"key": "since_when", "label": "Since When", "type": "text"},
          {"key": "what_happened", "label": "What Happened", "type": "text"}
        ]},
        {"key": "medical_history", "title": "Medical History & Medication", "fields": [
          {"key": "medical_history", "label": "Medical History", "type": "textarea"},
          {"key": "current_medications", "label": "Current Medications", "type": "textarea"},
          {"key": "allergies", "label": "Allergies", "type": "textarea"}
        ]},
        {"key": "on_examination", "title": "On Examination", "fields": [
          {"key": "examination", "label": "Examination Findings", "type": "textarea"},
          {"key": "tooth_number", "label": "Tooth Number(s)", "type": "text"},
          {"key": "exam_notes", "label": "Additional Notes", "type": "textarea"}
        ]},
        {"key": "investigation", "title": "Investigation", "fields": [
          {"key": "investigation_type", "label": "Investigation", "type": "textarea"},
          {"key": "inv_tooth_number", "label": "Tooth Number(s)", "type": "text"},
          {"key": "inv_notes", "label": "Additional Notes", "type": "textarea"}
        ]},
        {"key": "advice", "title": "Advice", "fields": [
          {"key": "advice", "label": "Advice", "type": "textarea"},
          {"key": "advice_tooth_number", "label": "Tooth Number(s)", "type": "text"},
          {"key": "advice_notes", "label": "Additional Notes", "type": "textarea"}
        ]},
        {"key": "treatment", "title": "Treatment", "fields": [
          {"key": "treatment_name", "label": "Treatment Name", "type": "textarea"},
          {"key": "treatment_tooth_number", "label": "Tooth Number(s)", "type": "text"},
          {"key": "treatment_notes", "label": "Additional Notes", "type": "textarea"}
        ]},
        {"key": "prescribed_medicines", "title": "Prescribed Medicines", "fields": [
          {"key": "medications", "label": "Medications", "type": "medication_list"}
        ]},
        {"key": "additional_notes", "title": "Additional Notes & Precautions", "fields": [
          {"key": "notes", "label": "Additional Notes", "type": "textarea"},
          {"key": "precautions", "label": "Precautions", "type": "textarea"},
          {"key": "follow_up_date", "label": "Follow-up Date", "type": "date"}
        ]}
      ]
    }'::jsonb
  )
  RETURNING id INTO v_version_id;

  -- ---- Sections + fields ---------------------------------------------------

  -- Vitals
  INSERT INTO public.prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'vitals', 'Vitals', 'Patient vital signs', 0, 1, false, true, '{"is_enabled": true, "color": "bg-blue-50 border-blue-200"}'::jsonb)
  RETURNING id INTO v_section_id;
  INSERT INTO public.prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'blood_pressure', 'Blood Pressure', 'text', '120/80 mmHg', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'pulse', 'Pulse', 'text', '72 bpm', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'temperature', 'Temperature', 'text', '98.6F', 2, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'spo2', 'SpO2', 'text', '98%', 3, 1, false, true, '{}'::jsonb);

  -- Chief Complaints
  INSERT INTO public.prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'chief_complaints', 'Chief Complaints', 'Patient reported issues', 1, 1, true, false, '{"is_enabled": true, "color": "bg-rose-50 border-rose-200"}'::jsonb)
  RETURNING id INTO v_section_id;
  INSERT INTO public.prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'complaint', 'Complaint', 'select', 'Select complaint', 0, 1, true, false, '{"options": ["Tooth Pain", "Sensitivity", "Gum Bleeding", "Gum Swelling", "Bad Breath", "Tooth Mobility", "Fractured Tooth", "Discolored Tooth", "Missing Tooth", "Wisdom Tooth Pain", "Jaw Pain", "Mouth Ulcer", "Dry Mouth", "Teeth Grinding", "Bite Problem"]}'::jsonb),
    (v_version_id, v_section_id, 'location', 'Location', 'select', 'Select location', 1, 1, false, true, '{"options": ["Upper Left", "Upper Right", "Lower Left", "Lower Right", "Front", "General", "Multiple Areas"]}'::jsonb),
    (v_version_id, v_section_id, 'duration', 'Duration', 'text', 'e.g., 3 days, 1 week', 2, 1, false, true, '{}'::jsonb);

  -- History of Present Illness
  INSERT INTO public.prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'history_present_illness', 'History of Present Illness', 'Detailed illness history', 2, 1, false, true, '{"is_enabled": true, "color": "bg-amber-50 border-amber-200"}'::jsonb)
  RETURNING id INTO v_section_id;
  INSERT INTO public.prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'hpi', 'History', 'textarea', 'Describe the illness progression...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'since_when', 'Since When', 'text', 'Since 3 days', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'what_happened', 'What Happened', 'text', 'Event description', 2, 1, false, true, '{}'::jsonb);

  -- Medical History
  INSERT INTO public.prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'medical_history', 'Medical History & Medication', 'Past medical history and current medications', 3, 1, false, true, '{"is_enabled": true, "color": "bg-purple-50 border-purple-200"}'::jsonb)
  RETURNING id INTO v_section_id;
  INSERT INTO public.prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'medical_history', 'Medical History', 'textarea', 'Any chronic conditions, surgeries...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'current_medications', 'Current Medications', 'textarea', 'List ongoing medicines...', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'allergies', 'Allergies', 'textarea', 'Any known allergies...', 2, 1, false, true, '{}'::jsonb);

  -- On Examination
  INSERT INTO public.prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'on_examination', 'On Examination', 'Clinical examination findings', 4, 1, false, true, '{"is_enabled": true, "color": "bg-green-50 border-green-200"}'::jsonb)
  RETURNING id INTO v_section_id;
  INSERT INTO public.prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'examination', 'Examination Findings', 'textarea', 'Clinical observations...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'tooth_number', 'Tooth Number(s)', 'text', 'e.g., 16, 26, 36, 46', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'exam_notes', 'Additional Notes', 'textarea', 'Extra findings...', 2, 1, false, true, '{}'::jsonb);

  -- Investigation
  INSERT INTO public.prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'investigation', 'Investigation', 'Diagnostic investigations advised', 5, 1, false, true, '{"is_enabled": true, "color": "bg-cyan-50 border-cyan-200"}'::jsonb)
  RETURNING id INTO v_section_id;
  INSERT INTO public.prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'investigation_type', 'Investigation', 'textarea', 'X-ray, CBCT, Blood tests...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'inv_tooth_number', 'Tooth Number(s)', 'text', 'e.g., 16, 26', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'inv_notes', 'Additional Notes', 'textarea', 'Special instructions...', 2, 1, false, true, '{}'::jsonb);

  -- Advice
  INSERT INTO public.prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'advice', 'Advice', 'Patient advice and instructions', 6, 1, false, true, '{"is_enabled": true, "color": "bg-indigo-50 border-indigo-200"}'::jsonb)
  RETURNING id INTO v_section_id;
  INSERT INTO public.prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'advice', 'Advice', 'textarea', 'Patient instructions...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'advice_tooth_number', 'Tooth Number(s)', 'text', 'e.g., 16', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'advice_notes', 'Additional Notes', 'textarea', 'Extra advice...', 2, 1, false, true, '{}'::jsonb);

  -- Treatment
  INSERT INTO public.prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'treatment', 'Treatment', 'Treatment details', 7, 1, false, true, '{"is_enabled": true, "color": "bg-emerald-50 border-emerald-200"}'::jsonb)
  RETURNING id INTO v_section_id;
  INSERT INTO public.prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'treatment_name', 'Treatment Name', 'textarea', 'Procedure name...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'treatment_tooth_number', 'Tooth Number(s)', 'text', 'e.g., 16, 26', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'treatment_notes', 'Additional Notes', 'textarea', 'Treatment details...', 2, 1, false, true, '{}'::jsonb);

  -- Prescribed Medicines
  INSERT INTO public.prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'prescribed_medicines', 'Prescribed Medicines', 'Medication prescriptions', 8, 1, true, false, '{"is_enabled": true, "color": "bg-red-50 border-red-200"}'::jsonb)
  RETURNING id INTO v_section_id;
  INSERT INTO public.prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'medications', 'Medications', 'medication_list', '', 0, 1, true, false, '{}'::jsonb);

  -- Additional Notes
  INSERT INTO public.prescription_template_sections (version_id, section_key, title, description, sort_order, column_span, is_required, is_removable, ui_config)
  VALUES (v_version_id, 'additional_notes', 'Additional Notes & Precautions', 'Final notes and follow-up', 9, 1, false, true, '{"is_enabled": true, "color": "bg-slate-50 border-slate-200"}'::jsonb)
  RETURNING id INTO v_section_id;
  INSERT INTO public.prescription_template_fields (version_id, section_id, field_key, label, field_type, placeholder, sort_order, width, is_required, is_removable, ui_config)
  VALUES
    (v_version_id, v_section_id, 'notes', 'Additional Notes', 'textarea', 'Any additional notes...', 0, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'precautions', 'Precautions', 'textarea', 'Patient precautions...', 1, 1, false, true, '{}'::jsonb),
    (v_version_id, v_section_id, 'follow_up_date', 'Follow-up Date', 'date', '', 2, 1, false, true, '{}'::jsonb);

  RAISE NOTICE 'Dental prescription template seeded: template_id=%, version_id=%, doctor_id=%, hospital_id=%',
    v_template_id, v_version_id, v_doctor_id, v_hospital_id;
END $$;
