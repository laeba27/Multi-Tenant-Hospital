'use server'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isPlaceholderEmail } from '@/lib/utils/id-generator'
import { patientAge } from '@/lib/patients/age'
import {
  getPrescriptionTemplateById,
  getPrescriptionTemplateCatalog,
  getRecommendedTemplateId,
} from '@/lib/prescriptions/catalog'

async function getDoctorWorkspace() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, registration_no, hospital_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') {
    redirect('/dashboard')
  }

  const { data: doctorRecord } = await supabase
    .from('staff')
    .select('id, hospital_id, department_id, specialization, consultation_fee')
    .eq('employee_registration_no', profile.registration_no)
    .eq('role', 'doctor')
    .single()

  let hospital = null

  if (profile.hospital_id) {
    const { data: hospitalRecord } = await supabase
      .from('hospitals')
      .select('registration_no, name, address, city, state, postal_code, phone, email')
      .eq('registration_no', profile.hospital_id)
      .single()

    hospital = hospitalRecord || null
  }

  return {
    supabase,
    profile,
    doctorRecord,
    hospital,
  }
}

function mapAppointment(appointment) {
  if (!appointment) return null

  const patientRecord = appointment.patients || {}
  const patientProfile = patientRecord.profile || {}

  return {
    id: appointment.id,
    reason: appointment.reason,
    appointmentDate: appointment.appointment_date,
    appointmentSlot: appointment.appointment_slot,
    appointmentType: appointment.appointment_type,
    department: appointment.departments?.name || 'Consultation',
    patient: {
      id: appointment.patient_id,
      registrationNo: patientRecord.registration_no || patientProfile.registration_no || 'N/A',
      // The number the patient signs in to the portal with (PATIENT-123456),
      // as opposed to this hospital's own patient ID above. Printed on the
      // prescription so the patient always has it.
      loginNo: patientProfile.registration_no || '',
      name: patientProfile.name || 'Unknown patient',
      // A patient who hasn't added their email yet holds an internal
      // placeholder address; never show or print that.
      email: isPlaceholderEmail(patientProfile.email) ? '' : patientProfile.email || '',
      mobile: patientProfile.mobile || '',
      gender: patientProfile.gender || '',
      dateOfBirth: patientProfile.date_of_birth || '',
      age: patientAge(patientProfile),
      address: patientProfile.address || '',
      city: patientProfile.city || '',
      state: patientProfile.state || '',
      pincode: patientProfile.pincode || '',
    },
  }
}


function mapDbTemplateToComposerTemplate(templateRecord) {
  if (!templateRecord) return null

  const latestVersion = Array.isArray(templateRecord.prescription_template_versions)
    ? templateRecord.prescription_template_versions[0]
    : null

  const sections = Array.isArray(latestVersion?.prescription_template_sections)
    ? latestVersion.prescription_template_sections
    : []

  const mappedSections = sections
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((section) => {
      const fields = Array.isArray(section.prescription_template_fields)
        ? section.prescription_template_fields
        : []

      return {
        id: section.id,
        key: section.section_key,
        title: section.title,
        description: section.description || '',
        isRequired: Boolean(section.is_required),
        isRemovable: Boolean(section.is_removable),
        columns: section.column_span || 1,
        fields: fields
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((field) => ({
            id: field.id,
            key: field.field_key,
            label: field.label,
            type: field.field_type || 'text',
            required: Boolean(field.is_required),
            locked: Boolean(field.is_locked),
            removable: Boolean(field.is_removable),
            width: field.width || 1,
            placeholder: field.placeholder || '',
            helperText: field.helper_text || '',
            optionSetKey: field.option_set_key || null,
            options: Array.isArray(field.options) ? field.options : null,
          })),
      }
    })

  return {
    id: templateRecord.id,
    key: templateRecord.template_key,
    name: templateRecord.name,
    visibility: templateRecord.visibility || 'doctor',
    specialty: 'Doctor Custom',
    description: templateRecord.description || 'Doctor selected template',
    ownerLabel: 'Doctor template',
    isDefault: Boolean(templateRecord.is_default),
    sectionCount: mappedSections.length,
    fieldCount: mappedSections.reduce((sum, section) => sum + (section.fields?.length || 0), 0),
    presetCount: 0,
    versionId: latestVersion?.id,
    sections: mappedSections,
  }
}

async function getDoctorDefaultTemplateRecord(supabase, doctorId) {
  if (!doctorId) return null

  const { data, error } = await supabase
    .from('prescription_templates')
    .select(`
      id,
      template_key,
      name,
      description,
      visibility,
      is_default,
      prescription_template_versions(
        id,
        version_number,
        prescription_template_sections(
          id,
          section_key,
          title,
          description,
          sort_order,
          column_span,
          is_required,
          is_removable,
          prescription_template_fields(
            id,
            field_key,
            label,
            helper_text,
            field_type,
            placeholder,
            width,
            sort_order,
            is_required,
            is_removable,
            is_locked,
            option_set_key,
            options
          )
        )
      )
    `)
    .eq('doctor_id', doctorId)
    .eq('is_default', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data
}

/**
 * Map a DB template record into the shape the templates page UI expects.
 * The page renders section.name / field.label / field.type, so we normalise
 * the DB column names (section_key/title, field_key/field_type) accordingly.
 */
function mapDbTemplateToPageTemplate(templateRecord) {
  if (!templateRecord) return null

  const latestVersion = Array.isArray(templateRecord.prescription_template_versions)
    ? [...templateRecord.prescription_template_versions].sort(
        (a, b) => (b.version_number || 0) - (a.version_number || 0)
      )[0]
    : null

  const sections = Array.isArray(latestVersion?.prescription_template_sections)
    ? latestVersion.prescription_template_sections
    : []

  const mappedSections = sections
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((section) => {
      const fields = Array.isArray(section.prescription_template_fields)
        ? section.prescription_template_fields
        : []

      return {
        id: section.id,
        key: section.section_key,
        name: section.title,
        description: section.description || '',
        required: Boolean(section.is_required),
        sort_order: section.sort_order || 0,
        fields: fields
          .slice()
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((field) => ({
            id: field.id,
            key: field.field_key,
            label: field.label,
            type: field.field_type || 'text',
            required: Boolean(field.is_required),
            placeholder: field.placeholder || '',
            dropdownOptions: Array.isArray(field.ui_config?.options)
              ? field.ui_config.options
              : [],
          })),
      }
    })

  return {
    id: templateRecord.id,
    name: templateRecord.name,
    description: templateRecord.description || '',
    department_id: templateRecord.department_id || null,
    visibility: templateRecord.visibility || 'doctor',
    status: templateRecord.status || 'active',
    is_default: Boolean(templateRecord.is_default),
    version_id: latestVersion?.id || null,
    created_at: templateRecord.created_at,
    updated_at: templateRecord.updated_at,
    sections: mappedSections,
  }
}

/**
 * Append a new option to a template field's option list (ui_config.options),
 * so a value the doctor typed via "Add / Other" becomes a reusable option.
 *
 * Verifies the field belongs to one of the doctor's own templates before
 * writing. Dedupes case-insensitively. Returns the updated option list.
 */
export async function addFieldOption(fieldId, option) {
  const { supabase, doctorRecord } = await getDoctorWorkspace()

  const value = typeof option === 'string' ? option.trim() : ''
  if (!fieldId || !value) {
    return { success: false, error: 'Missing field or option' }
  }
  if (!doctorRecord?.id) {
    return { success: false, error: 'Doctor workspace not found' }
  }

  // Load the field + confirm ownership via template -> version -> field chain.
  const { data: field, error: fieldError } = await supabase
    .from('prescription_template_fields')
    .select(`
      id,
      ui_config,
      field_type,
      version_id,
      prescription_template_versions!inner(
        template_id,
        prescription_templates!inner(
          doctor_id
        )
      )
    `)
    .eq('id', fieldId)
    .maybeSingle()

  if (fieldError || !field) {
    return { success: false, error: 'Field not found' }
  }

  const ownerDoctorId =
    field.prescription_template_versions?.prescription_templates?.doctor_id
  if (ownerDoctorId !== doctorRecord.id) {
    return { success: false, error: 'Not allowed to modify this field' }
  }

  const uiConfig = field.ui_config && typeof field.ui_config === 'object' ? field.ui_config : {}
  const current = Array.isArray(uiConfig.options) ? uiConfig.options : []

  // Skip if it already exists (case-insensitive).
  if (current.some((o) => String(o).toLowerCase() === value.toLowerCase())) {
    return { success: true, options: current, alreadyExisted: true }
  }

  const nextOptions = [...current, value]

  const { error: updateError } = await supabase
    .from('prescription_template_fields')
    .update({ ui_config: { ...uiConfig, options: nextOptions } })
    .eq('id', fieldId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true, options: nextOptions }
}

/**
 * Fetch the doctor's prescription templates (with sections + fields) from the DB.
 * Returns them already mapped into the page UI shape.
 */
export async function getDoctorTemplatesFromDb() {
  const { supabase, doctorRecord } = await getDoctorWorkspace()

  if (!doctorRecord?.id) return []

  const { data, error } = await supabase
    .from('prescription_templates')
    .select(`
      id,
      template_key,
      name,
      description,
      department_id,
      visibility,
      status,
      is_default,
      created_at,
      updated_at,
      prescription_template_versions(
        id,
        version_number,
        prescription_template_sections(
          id,
          section_key,
          title,
          description,
          sort_order,
          column_span,
          is_required,
          is_removable,
          prescription_template_fields(
            id,
            field_key,
            label,
            field_type,
            placeholder,
            width,
            sort_order,
            is_required,
            is_removable,
            is_locked,
            ui_config
          )
        )
      )
    `)
    .eq('doctor_id', doctorRecord.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching doctor templates:', error)
    return []
  }

  return (data || []).map(mapDbTemplateToPageTemplate).filter(Boolean)
}

export async function getDoctorPrescriptionTemplatesPageData() {
  const { supabase, profile, doctorRecord, hospital } = await getDoctorWorkspace()
  const catalog = getPrescriptionTemplateCatalog()

  let departmentName = null
  if (doctorRecord?.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('name')
      .eq('id', doctorRecord.department_id)
      .single()
    departmentName = dept?.name || null
  }

  const dbTemplates = await getDoctorTemplatesFromDb()

  return {
    doctor: {
      id: doctorRecord?.id || '',
      name: profile.name,
      specialization: doctorRecord?.specialization || 'General practice',
      departmentId: doctorRecord?.department_id || null,
      departmentName: departmentName || 'Department',
    },
    hospital: hospital || {
      registration_no: profile.hospital_id,
      name: 'Hospital workspace',
    },
    dbTemplates,
    ...catalog,
  }
}

/**
 * Persist a doctor's edited template to the DB as a NEW version.
 *
 * - If templateId refers to an existing DB template, a new version is appended
 *   and current_version is bumped (old versions stay intact so issued
 *   prescriptions never break).
 * - Otherwise a brand-new template (+ version 1) is created for this doctor.
 *
 * Returns the saved template re-mapped into the page UI shape.
 */
export async function saveDoctorTemplate(template) {
  const { supabase, profile, doctorRecord, hospital } = await getDoctorWorkspace()

  if (!doctorRecord?.id || !hospital?.registration_no) {
    throw new Error('Doctor workspace not found')
  }
  if (!template?.name?.trim()) {
    throw new Error('Template name is required')
  }

  const sections = Array.isArray(template.sections) ? template.sections : []

  // Determine whether this is a real existing DB template (UUID) or a
  // client-only draft (id like "template_<timestamp>").
  const isExisting =
    typeof template.id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(template.id)

  let templateId = isExisting ? template.id : null
  let nextVersionNumber = 1

  if (templateId) {
    // Verify ownership + find the next version number.
    const { data: existing, error: existingError } = await supabase
      .from('prescription_templates')
      .select('id, current_version, doctor_id')
      .eq('id', templateId)
      .eq('doctor_id', doctorRecord.id)
      .maybeSingle()

    if (existingError) throw existingError
    if (!existing) throw new Error('Template not found or does not belong to you')

    nextVersionNumber = (existing.current_version || 0) + 1
  } else {
    // Create the template shell (version 1).
    const { data: created, error: createError } = await supabase
      .from('prescription_templates')
      .insert([
        {
          hospital_id: hospital.registration_no,
          doctor_id: doctorRecord.id,
          created_by: profile.id,
          template_key: `doctor_template_${doctorRecord.id}_${template.id || 'new'}`,
          name: template.name.trim(),
          description: template.description || '',
          visibility: 'doctor',
          status: 'active',
          is_default: Boolean(template.is_default),
          current_version: 1,
        },
      ])
      .select('id')
      .single()

    if (createError) throw createError
    templateId = created.id
    nextVersionNumber = 1
  }

  // Build the version snapshot (denormalised convenience copy).
  const snapshot = {
    sections: sections.map((s, sIdx) => ({
      key: s.key || `section_${sIdx}`,
      title: s.name,
      description: s.description || '',
      sort_order: sIdx,
      fields: (s.fields || []).map((f, fIdx) => ({
        key: f.key || `field_${fIdx}`,
        label: f.label,
        type: f.type || 'text',
        required: Boolean(f.required),
        placeholder: f.placeholder || '',
        options: Array.isArray(f.dropdownOptions) ? f.dropdownOptions : [],
      })),
    })),
  }

  // Create the new version.
  const { data: version, error: versionError } = await supabase
    .from('prescription_template_versions')
    .insert([
      {
        template_id: templateId,
        version_number: nextVersionNumber,
        version_label: `Version ${nextVersionNumber}`,
        change_summary: 'Saved from template builder',
        created_by: profile.id,
        snapshot,
      },
    ])
    .select('id')
    .single()

  if (versionError) throw versionError
  const versionId = version.id

  // Insert sections + their fields for this version.
  for (let sIdx = 0; sIdx < sections.length; sIdx += 1) {
    const section = sections[sIdx]

    const { data: sectionRow, error: sectionError } = await supabase
      .from('prescription_template_sections')
      .insert([
        {
          version_id: versionId,
          section_key: section.key || `section_${sIdx}_${Date.now()}`,
          title: section.name || `Section ${sIdx + 1}`,
          description: section.description || '',
          sort_order: sIdx,
          column_span: 1,
          is_required: Boolean(section.required),
          is_removable: true,
          ui_config: {},
        },
      ])
      .select('id')
      .single()

    if (sectionError) throw sectionError

    const fields = Array.isArray(section.fields) ? section.fields : []
    if (fields.length > 0) {
      const fieldRows = fields.map((field, fIdx) => ({
        version_id: versionId,
        section_id: sectionRow.id,
        field_key: field.key || `field_${sIdx}_${fIdx}_${Date.now()}`,
        label: field.label || `Field ${fIdx + 1}`,
        field_type: normaliseFieldType(field.type),
        placeholder: field.placeholder || '',
        sort_order: fIdx,
        width: 1,
        is_required: Boolean(field.required),
        is_removable: true,
        ui_config: Array.isArray(field.dropdownOptions) && field.dropdownOptions.length
          ? { options: field.dropdownOptions }
          : {},
      }))

      const { error: fieldsError } = await supabase
        .from('prescription_template_fields')
        .insert(fieldRows)

      if (fieldsError) throw fieldsError
    }
  }

  // Bump the template pointer + metadata.
  const { error: bumpError } = await supabase
    .from('prescription_templates')
    .update({
      current_version: nextVersionNumber,
      name: template.name.trim(),
      description: template.description || '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .eq('doctor_id', doctorRecord.id)

  if (bumpError) throw bumpError

  const templates = await getDoctorTemplatesFromDb()
  const saved = templates.find((t) => t.id === templateId) || null

  return { success: true, templateId, templates, saved }
}

/**
 * Map the builder's field-type values onto the field_type CHECK constraint
 * allowed by the schema (016). The builder uses 'dropdown' for selects.
 */
function normaliseFieldType(type) {
  const allowed = new Set([
    'text', 'textarea', 'number', 'date', 'datetime',
    'select', 'multi_select', 'checkbox', 'radio', 'switch',
    'json', 'medication_list',
  ])
  if (type === 'dropdown') return 'select'
  return allowed.has(type) ? type : 'text'
}

export async function getDoctorPrescriptionComposerData(appointmentId) {
  const { supabase, profile, doctorRecord, hospital } = await getDoctorWorkspace()
  const catalog = getPrescriptionTemplateCatalog()
  const recommendedTemplateId = getRecommendedTemplateId(doctorRecord?.specialization)
  const defaultTemplate = getPrescriptionTemplateById(recommendedTemplateId)
  const doctorDefaultTemplateRecord = await getDoctorDefaultTemplateRecord(supabase, doctorRecord?.id)
  const doctorDefaultTemplate = mapDbTemplateToComposerTemplate(doctorDefaultTemplateRecord)

  let departmentName = null
  if (doctorRecord?.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('name')
      .eq('id', doctorRecord.department_id)
      .single()
    departmentName = dept?.name || null
  }

  let appointment = null

  if (appointmentId && doctorRecord?.id) {
    const { data: appointmentRecord } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        appointment_date,
        appointment_slot,
        appointment_type,
        reason,
        patients:patient_id (
          id,
          registration_no,
          profile:profiles!profile_id (
            id,
            name,
            email,
            mobile,
            registration_no,
            gender,
            date_of_birth,
            age_years,
            age_recorded_on,
            address,
            city,
            state,
            pincode
          )
        ),
        departments:department_id (
          id,
          name
        )
      `)
      .eq('id', appointmentId)
      .eq('doctor_id', doctorRecord.id)
      .single()

    appointment = mapAppointment(appointmentRecord)
  }

  const mergedTemplates = doctorDefaultTemplate
    ? [
        doctorDefaultTemplate,
        ...catalog.templates.filter((template) => template.id !== doctorDefaultTemplate.id),
      ]
    : catalog.templates

  return {
    doctor: {
      id: doctorRecord?.id || '',
      name: profile.name,
      specialization: doctorRecord?.specialization || 'General practice',
      departmentName: departmentName || appointment?.department || 'Department',
    },
    hospital: hospital || {
      registration_no: profile.hospital_id,
      name: 'Hospital workspace',
    },
    appointment,
    templates: mergedTemplates,
    optionSets: catalog.optionSets,
    selectedTemplate: doctorDefaultTemplate || defaultTemplate,
    presets: catalog.presets,
  }
}

/**
 * Create or update a prescription from an appointment
 */
export async function createPrescriptionFromAppointment({
  appointmentId,
  patientId,
  templateId,
  templateVersionId,
  prescriptionValues,
  clinicalSummary,
  followUpDate,
  status = 'draft',
}) {
  try {
    const { supabase, profile, doctorRecord, hospital } = await getDoctorWorkspace()

    if (!doctorRecord || !hospital) {
      throw new Error('Doctor workspace not found')
    }

    if (!appointmentId || !patientId) {
      throw new Error('Appointment and patient are required')
    }

    // Verify appointment belongs to this doctor
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select('id, patient_id, doctor_id')
      .eq('id', appointmentId)
      .eq('doctor_id', doctorRecord.id)
      .single()

    if (apptError || !appointment) {
      throw new Error('Appointment not found or does not belong to you')
    }

    if (appointment.patient_id !== patientId) {
      throw new Error('Patient does not match appointment')
    }

    // Coerce empty strings to null for typed columns (date / uuid),
    // otherwise Postgres rejects '' (22007 invalid date, 22P02 invalid uuid).
    const cleanDate = (v) => {
      const s = typeof v === 'string' ? v.trim() : v
      return s ? s : null
    }
    const cleanUuid = (v) => {
      const s = typeof v === 'string' ? v.trim() : v
      return s ? s : null
    }

    // Is there already a (non-cancelled) prescription for this appointment?
    const { data: existing } = await supabase
      .from('prescriptions')
      .select('id, status')
      .eq('appointment_id', appointmentId)
      .eq('doctor_id', doctorRecord.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const isUpdate = Boolean(existing?.id)
    let prescription

    if (isUpdate) {
      // ---- UPDATE the existing prescription ---------------------------------
      const { data: updated, error: updateError } = await supabase
        .from('prescriptions')
        .update({
          template_id: cleanUuid(templateId),
          template_version_id: cleanUuid(templateVersionId),
          status: status === 'issued' ? 'amended' : status,
          clinical_summary: clinicalSummary || null,
          follow_up_date: cleanDate(followUpDate),
          issued_at: status === 'issued' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
          metadata: {
            created_from_appointment: true,
            appointment_reason: appointment.reason,
            last_action: 'updated',
          },
        })
        .eq('id', existing.id)
        .eq('doctor_id', doctorRecord.id)
        .select()
        .single()

      if (updateError) throw updateError
      prescription = updated

      // Replace all of its values with the new set.
      const { error: delError } = await supabase
        .from('prescription_values')
        .delete()
        .eq('prescription_id', existing.id)
      if (delError) throw delError
    } else {
      // ---- CREATE a new prescription ----------------------------------------
      const { data: created, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert([
          {
            hospital_id: hospital.registration_no,
            doctor_id: doctorRecord.id,
            created_by: profile.id,
            patient_id: patientId,
            appointment_id: appointmentId,
            template_id: cleanUuid(templateId),
            template_version_id: cleanUuid(templateVersionId),
            status,
            clinical_summary: clinicalSummary || null,
            follow_up_date: cleanDate(followUpDate),
            template_snapshot: {},
            metadata: {
              created_from_appointment: true,
              appointment_reason: appointment.reason,
            },
          },
        ])
        .select()
        .single()

      if (prescriptionError) throw prescriptionError
      prescription = created
    }

    // Insert the (new) prescription values.
    if (prescriptionValues && prescriptionValues.length > 0) {
      const valuesToInsert = prescriptionValues.map((value, index) => ({
        prescription_id: prescription.id,
        field_id: value.field_id,
        section_key: value.section_key,
        field_key: value.field_key,
        label: value.label,
        value: value.value,
        rendered_value: value.rendered_value || JSON.stringify(value.value),
        sort_order: index,
      }))

      const { error: valuesError } = await supabase
        .from('prescription_values')
        .insert(valuesToInsert)

      if (valuesError) {
        throw valuesError
      }
    }

    // Audit log: created vs amended.
    await supabase
      .from('prescription_audit_logs')
      .insert([
        {
          prescription_id: prescription.id,
          actor_id: profile.id,
          event_type: isUpdate ? 'amended' : 'created',
          payload: {
            appointment_id: appointmentId,
            from_appointment: true,
            updated: isUpdate,
          },
        },
      ])

    return {
      success: true,
      prescription_id: prescription.id,
      status: prescription.status,
      wasUpdate: isUpdate,
    }
  } catch (error) {
    console.error('Error creating prescription:', error)
    throw error
  }
}

/**
 * Get appointment with prescription history
 */
export async function getAppointmentWithPrescriptions(appointmentId) {
  try {
    // `view_prescription` shipped in the catalogue and on the admin screen but
    // was never once consulted -- an admin could switch it off and the staff
    // member kept reading prescriptions. This is the action that actually
    // serves them, so this is where the switch has to bite.
    const { requirePermission } = await import('@/actions/rbac')
    const gate = await requirePermission('view_prescription')
    if (!gate.allowed) {
      throw new Error(gate.error || 'You cannot view prescriptions.')
    }

    const { supabase, doctorRecord } = await getDoctorWorkspace()

    if (!doctorRecord) {
      throw new Error('Doctor not found')
    }

    // Get appointment with patient details only
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        appointment_date,
        appointment_slot,
        appointment_type,
        reason,
        patients:patient_id (
          id,
          registration_no,
          profile:profiles!profile_id (
            id,
            name,
            email,
            mobile,
            registration_no,
            gender,
            date_of_birth,
            age_years,
            age_recorded_on,
            address,
            city,
            state,
            pincode
          )
        ),
        departments:department_id (
          id,
          name
        )
      `)
      .eq('id', appointmentId)
      .eq('doctor_id', doctorRecord.id)
      .maybeSingle()

    if (apptError) {
      throw apptError
    }

    if (!appointment) {
      return null
    }

    // Is there already a prescription for this appointment? (latest, non-cancelled)
    const { data: existing } = await supabase
      .from('prescriptions')
      .select('id, status, template_id, template_version_id, follow_up_date, created_at, updated_at')
      .eq('appointment_id', appointmentId)
      .eq('doctor_id', doctorRecord.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Rebuild the composer rows for the existing prescription so the form can
    // be pre-filled when the doctor updates it.
    //   existingRows: { [sectionId]: [ { [fieldId]: value }, ... ] }
    let existingRows = null
    let existingTemplateId = existing?.template_id || null

    if (existing?.id) {
      const { data: values } = await supabase
        .from('prescription_values')
        .select('field_id, section_key, value, sort_order')
        .eq('prescription_id', existing.id)
        .order('sort_order', { ascending: true })

      if (Array.isArray(values) && values.length > 0) {
        existingRows = {}
        for (const v of values) {
          const sectionId = v.section_key
          const fieldId = v.field_id
          // `value` was saved as an array of per-row values (one per committed row).
          const colValues = Array.isArray(v.value) ? v.value : [v.value]
          if (!existingRows[sectionId]) existingRows[sectionId] = []
          colValues.forEach((cell, rowIdx) => {
            if (!existingRows[sectionId][rowIdx]) existingRows[sectionId][rowIdx] = {}
            existingRows[sectionId][rowIdx][fieldId] = cell
          })
        }
      }
    }

    return {
      appointment: mapAppointment(appointment),
      prescriptions: existing ? [existing] : [],
      appointmentStatus: existing?.status || 'pending',
      hasPrescription: Boolean(existing),
      existingPrescriptionId: existing?.id || null,
      existingTemplateId,
      existingRows,
    }
  } catch (error) {
    console.error('Error fetching appointment:', error)
    throw error
  }
}

/**
 * Get doctor's appointments with prescription status
 */
export async function getDoctorAppointmentsWithPrescriptionStatus() {
  try {
    const { supabase, doctorRecord } = await getDoctorWorkspace()

    if (!doctorRecord) {
      throw new Error('Doctor not found')
    }

    const { data: appointments, error } = await supabase
      .from('doctor_appointments_with_prescriptions')
      .select('*')
      .eq('doctor_id', doctorRecord.id)
      .order('appointment_date', { ascending: false })

    if (error) {
      throw error
    }

    return appointments || []
  } catch (error) {
    console.error('Error fetching appointments:', error)
    throw error
  }
}

/**
 * Update prescription status for an appointment
 */
export async function updatePrescriptionStatus(prescriptionId, newStatus) {
  try {
    const { supabase, profile, doctorRecord } = await getDoctorWorkspace()

    if (!doctorRecord) {
      throw new Error('Doctor not found')
    }

    // Verify prescription belongs to this doctor
    const { data: prescription, error: prescError } = await supabase
      .from('prescriptions')
      .select('id, appointment_id')
      .eq('id', prescriptionId)
      .eq('doctor_id', doctorRecord.id)
      .single()

    if (prescError || !prescription) {
      throw new Error('Prescription not found or does not belong to you')
    }

    // Update prescription status
    const { data: updated, error: updateError } = await supabase
      .from('prescriptions')
      .update({
        status: newStatus,
        issued_at: newStatus === 'issued' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prescriptionId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Create audit log
    await supabase
      .from('prescription_audit_logs')
      .insert([
        {
          prescription_id: prescriptionId,
          actor_id: profile.id,
          event_type: newStatus === 'issued' ? 'issued' : 'updated',
          payload: {
            previous_status: prescription.status,
            new_status: newStatus,
          },
        },
      ])

    return {
      success: true,
      status: updated.status,
      issued_at: updated.issued_at,
    }
  } catch (error) {
    console.error('Error updating prescription status:', error)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Patient portal: one of the patient's own prescriptions, ready to render
// ---------------------------------------------------------------------------

const PATIENT_VISIBLE_STATUSES = ['issued', 'amended']

/**
 * Everything the prescription preview needs to draw (and print / download) a
 * prescription, for the signed-in PATIENT -- the same document the doctor
 * issued.
 *
 * Ownership is checked first: the prescription's patient record must be one of
 * the caller's own (one per hospital). Only then is the service-role client
 * used, because the template tables are RLS-protected for staff. Drafts and
 * cancelled prescriptions are never returned.
 */
export async function getMyPrescriptionDocument(prescriptionId) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    const admin = await createAdminClient()
    const { data: links } = await admin.from('patients').select('id').eq('profile_id', user.id)
    const myPatientIds = (links || []).map((l) => l.id)

    const { data: rx } = await admin
      .from('prescriptions')
      .select('id, hospital_id, doctor_id, patient_id, appointment_id, status, issued_at, created_at')
      .eq('id', prescriptionId)
      .maybeSingle()
    if (!rx || !myPatientIds.includes(rx.patient_id) || !PATIENT_VISIBLE_STATUSES.includes(rx.status)) {
      return { success: false, error: 'Prescription not found' }
    }

    return await loadPrescriptionDocument(admin, rx)
  } catch (error) {
    console.error('getMyPrescriptionDocument failed:', error)
    return { success: false, error: 'Could not load this prescription.' }
  }
}

/**
 * The same document for the DOCTOR who wrote it -- used by the Patients page
 * so a past prescription opens as the real printed prescription (download,
 * print, share) rather than a list of fields. Only the prescribing doctor,
 * and only while they hold view_prescription.
 */
export async function getDoctorPrescriptionDocument(prescriptionId) {
  try {
    const { requirePermission } = await import('@/actions/rbac')
    const gate = await requirePermission('view_prescription')
    if (!gate.allowed) return { success: false, error: gate.error || 'You cannot view prescriptions.' }

    const { doctorRecord } = await getDoctorWorkspace()
    if (!doctorRecord?.id) return { success: false, error: 'Doctor not found' }

    const admin = await createAdminClient()
    const { data: rx } = await admin
      .from('prescriptions')
      .select('id, hospital_id, doctor_id, patient_id, appointment_id, status, issued_at, created_at')
      .eq('id', prescriptionId)
      .maybeSingle()
    if (!rx || rx.doctor_id !== doctorRecord.id || rx.status === 'cancelled') {
      return { success: false, error: 'Prescription not found' }
    }

    return await loadPrescriptionDocument(admin, rx)
  } catch (error) {
    console.error('getDoctorPrescriptionDocument failed:', error)
    return { success: false, error: 'Could not load this prescription.' }
  }
}

/** Builds the preview data for a prescription row the caller may already see. */
async function loadPrescriptionDocument(admin, rx) {
    const { data: values, error: valuesError } = await admin
      .from('prescription_values')
      .select('field_id, section_key, value, sort_order')
      .eq('prescription_id', rx.id)
      .order('sort_order', { ascending: true })
    if (valuesError) throw valuesError

    // The sections and fields the values were written against. Looked up by
    // the ids stored on the values, so the document reads exactly as issued
    // even if the doctor has edited the template since.
    const sectionIds = [...new Set((values || []).map((v) => v.section_key).filter(Boolean))]
    let sections = []
    if (sectionIds.length) {
      const { data, error } = await admin
        .from('prescription_template_sections')
        .select(`
          id, section_key, title, description, sort_order, is_required,
          prescription_template_fields(
            id, field_key, label, field_type, placeholder, sort_order, is_required, ui_config
          )
        `)
        .in('id', sectionIds)
      if (error) throw error
      sections = data || []
    }
    const template = mapDbTemplateToPageTemplate({
      id: null,
      name: '',
      prescription_template_versions: [{ id: null, version_number: 1, prescription_template_sections: sections }],
    })

    // Rows per section, the same way the doctor's composer rebuilds them.
    const rows = {}
    for (const v of values || []) {
      const colValues = Array.isArray(v.value) ? v.value : [v.value]
      if (!rows[v.section_key]) rows[v.section_key] = []
      colValues.forEach((cell, i) => {
        if (!rows[v.section_key][i]) rows[v.section_key][i] = {}
        rows[v.section_key][i][v.field_id] = cell
      })
    }

    const patientSelect = `
      id,
      registration_no,
      profile:profiles!profile_id (
        id, name, email, mobile, registration_no, gender, date_of_birth,
        age_years, age_recorded_on, address, city, state, pincode
      )`

    const [apptRes, patientRes, hospitalRes, doctorRes] = await Promise.all([
      rx.appointment_id
        ? admin
            .from('appointments')
            .select(`
              id, patient_id, appointment_date, appointment_slot, appointment_type, reason,
              patients:patient_id (${patientSelect}),
              departments:department_id ( id, name )
            `)
            .eq('id', rx.appointment_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from('patients').select(patientSelect).eq('id', rx.patient_id).maybeSingle(),
      admin
        .from('hospitals')
        .select('registration_no, name, address, city, state, postal_code, phone, email')
        .eq('registration_no', rx.hospital_id)
        .maybeSingle(),
      rx.doctor_id
        ? admin.from('staff').select('name, department_id').eq('id', rx.doctor_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    let departmentName = null
    if (doctorRes.data?.department_id) {
      const { data: dept } = await admin
        .from('departments')
        .select('name')
        .eq('id', doctorRes.data.department_id)
        .maybeSingle()
      departmentName = dept?.name || null
    }

    // mapAppointment builds the patient block (name, IDs, login number, age...)
    // the printed prescription expects; without an appointment, feed it the
    // patient record alone.
    const appointment = mapAppointment(
      apptRes.data || { id: null, patient_id: rx.patient_id, patients: patientRes.data }
    )

    return {
      success: true,
      prescriptionId: rx.id,
      template,
      rows,
      hospital: hospitalRes.data || null,
      doctor: {
        name: doctorRes.data?.name?.trim() || 'N/A',
        departmentName: departmentName || appointment?.department || null,
      },
      patient: appointment.patient,
      appointment: apptRes.data ? appointment : null,
      appointmentId: rx.appointment_id,
      issuedAt: rx.issued_at || rx.created_at,
    }
}

// ---------------------------------------------------------------------------
// Prescription presets: a doctor's saved, reusable prescriptions
// ---------------------------------------------------------------------------
//
// A preset is a filled-in prescription saved under a name ("Common cold"), to
// load into the composer for the next patient with the same problem and then
// adjust. Stored in prescription_presets / prescription_preset_values.
//
// Editing a template creates a NEW version whose sections and fields get new
// ids, so a preset can't rely on field ids alone. Every value is also kept in
// metadata.entries with its section_key + field_key, which survive a
// template edit; the composer matches by id first and by keys second.

const PRESET_NAME_MAX = 80

async function getPresetOwner() {
  const { profile, doctorRecord } = await getDoctorWorkspace()
  if (!doctorRecord?.id || !profile?.hospital_id) throw new Error('Doctor not found')
  return { profile, doctorRecord, admin: await createAdminClient() }
}

function mapPreset(p) {
  const section = p.metadata?.scope === 'section' ? p.metadata.section || null : null
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    templateId: p.template_id,
    // 'full': the whole prescription. 'section': one section only (e.g. just
    // Medications), loaded into that section without touching the others.
    scope: section ? 'section' : 'full',
    section, // { id, key, name } when scope is 'section'
    entries: Array.isArray(p.metadata?.entries) ? p.metadata.entries : [],
    updatedAt: p.updated_at,
  }
}

/** The signed-in doctor's presets, most recently updated first. */
export async function getMyPrescriptionPresets() {
  try {
    const { doctorRecord, admin } = await getPresetOwner()
    const { data, error } = await admin
      .from('prescription_presets')
      .select('id, name, description, template_id, metadata, updated_at')
      .eq('doctor_id', doctorRecord.id)
      .eq('visibility', 'doctor')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return { success: true, presets: (data || []).map(mapPreset) }
  } catch (error) {
    console.error('getMyPrescriptionPresets failed:', error)
    return { success: false, error: 'Could not load your presets.', presets: [] }
  }
}

/**
 * Save the composer's current prescription as a preset, or overwrite one of
 * the doctor's own presets (presetId).
 *
 * @param {object} input
 * @param {string} input.name
 * @param {string} [input.description]
 * @param {string} input.templateId
 * @param {string} [input.templateVersionId]
 * @param {Array<{sectionId, sectionKey, fieldId, fieldKey, value: any[]}>} input.entries
 *   one per field that has a value; `value` holds that field's value for each row
 * @param {string} [input.presetId]
 * @param {{id, key, name}} [input.section]  set for a one-section preset; every
 *   entry must then belong to that section
 */
export async function savePrescriptionPreset({ name, description = '', templateId, templateVersionId = null, entries = [], presetId = null, section = null }) {
  try {
    const { profile, doctorRecord, admin } = await getPresetOwner()

    const cleanName = String(name || '').trim().slice(0, PRESET_NAME_MAX)
    if (cleanName.length < 2) return { success: false, error: 'Give the preset a name.' }
    if (!templateId) return { success: false, error: 'Choose a template first.' }

    const cleanEntries = (Array.isArray(entries) ? entries : [])
      .filter((e) => e && e.fieldId && Array.isArray(e.value) && e.value.length > 0)
      .map((e) => ({
        sectionId: String(e.sectionId || ''),
        sectionKey: String(e.sectionKey || ''),
        fieldId: String(e.fieldId),
        fieldKey: String(e.fieldKey || ''),
        sectionName: String(e.sectionName || ''),
        fieldLabel: String(e.fieldLabel || ''),
        value: e.value,
      }))
    if (cleanEntries.length === 0) {
      return { success: false, error: 'Fill in at least one field before saving a preset.' }
    }

    const cleanSection = section?.id
      ? { id: String(section.id), key: String(section.key || ''), name: String(section.name || '').trim() }
      : null
    if (cleanSection && cleanEntries.some((e) => e.sectionId !== cleanSection.id)) {
      return { success: false, error: 'A section preset can only hold that section.' }
    }

    // The template must be one this doctor can use.
    const { data: template } = await admin
      .from('prescription_templates')
      .select('id, doctor_id, hospital_id')
      .eq('id', templateId)
      .maybeSingle()
    if (!template || (template.doctor_id && template.doctor_id !== doctorRecord.id)) {
      return { success: false, error: 'That template is not available.' }
    }

    // Duplicate names are confusing in the same picker. A whole-prescription
    // preset and a Medications preset may share a name ("Common cold"); two
    // Medications presets may not.
    const { data: sameName } = await admin
      .from('prescription_presets')
      .select('id, metadata')
      .eq('doctor_id', doctorRecord.id)
      .is('deleted_at', null)
      .ilike('name', cleanName)
    const samePicker = (p) => {
      const other = mapPreset(p)
      if (!cleanSection) return other.scope === 'full'
      if (other.scope !== 'section') return false
      return (
        other.section?.id === cleanSection.id ||
        (cleanSection.key && other.section?.key === cleanSection.key) ||
        (cleanSection.name && other.section?.name?.toLowerCase() === cleanSection.name.toLowerCase())
      )
    }
    if ((sameName || []).some((p) => p.id !== presetId && samePicker(p))) {
      return {
        success: false,
        error: cleanSection
          ? `You already have a ${cleanSection.name || 'section'} preset called "${cleanName}".`
          : `You already have a preset called "${cleanName}".`,
      }
    }

    const row = {
      name: cleanName,
      description: String(description || '').trim() || null,
      template_id: templateId,
      template_version_id: templateVersionId || null,
      metadata: cleanSection
        ? { scope: 'section', section: cleanSection, entries: cleanEntries }
        : { scope: 'full', entries: cleanEntries },
      updated_at: new Date().toISOString(),
    }

    let id = presetId
    if (presetId) {
      const { data: existing } = await admin
        .from('prescription_presets')
        .select('id')
        .eq('id', presetId)
        .eq('doctor_id', doctorRecord.id)
        .maybeSingle()
      if (!existing) return { success: false, error: 'Preset not found.' }
      const { error } = await admin.from('prescription_presets').update(row).eq('id', presetId)
      if (error) throw error
    } else {
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'preset'
      const { data: created, error } = await admin
        .from('prescription_presets')
        .insert({
          ...row,
          hospital_id: profile.hospital_id,
          doctor_id: doctorRecord.id,
          created_by: profile.id,
          visibility: 'doctor',
          is_favorite: false,
          preset_key: `${slug}-${Date.now().toString(36)}`,
        })
        .select('id')
        .single()
      if (error) throw error
      id = created.id
    }

    // Normalised copy, one row per field. Only fields that still exist can be
    // referenced (the FK); metadata.entries above is the complete record.
    await admin.from('prescription_preset_values').delete().eq('preset_id', id)
    const fieldIds = [...new Set(cleanEntries.map((e) => e.fieldId))]
    const { data: liveFields } = await admin
      .from('prescription_template_fields')
      .select('id')
      .in('id', fieldIds)
    const live = new Set((liveFields || []).map((f) => f.id))
    const valueRows = cleanEntries
      .filter((e) => live.has(e.fieldId))
      .map((e) => ({ preset_id: id, field_id: e.fieldId, value: e.value }))
    if (valueRows.length) {
      const { error } = await admin.from('prescription_preset_values').insert(valueRows)
      if (error) throw error
    }

    return { success: true, presetId: id, message: presetId ? 'Preset updated.' : 'Preset saved.' }
  } catch (error) {
    console.error('savePrescriptionPreset failed:', error)
    return { success: false, error: 'Could not save the preset.' }
  }
}

/** Delete one of the signed-in doctor's own presets. */
export async function deletePrescriptionPreset(presetId) {
  try {
    const { doctorRecord, admin } = await getPresetOwner()
    const { data, error } = await admin
      .from('prescription_presets')
      .delete()
      .eq('id', presetId)
      .eq('doctor_id', doctorRecord.id)
      .select('id')
    if (error) throw error
    if (!data?.length) return { success: false, error: 'Preset not found.' }
    return { success: true, message: 'Preset deleted.' }
  } catch (error) {
    console.error('deletePrescriptionPreset failed:', error)
    return { success: false, error: 'Could not delete the preset.' }
  }
}
