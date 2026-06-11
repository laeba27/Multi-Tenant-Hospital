'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
      name: patientProfile.name || 'Unknown patient',
      email: patientProfile.email || '',
      mobile: patientProfile.mobile || '',
      gender: patientProfile.gender || '',
      dateOfBirth: patientProfile.date_of_birth || '',
      age: ageFromDob(patientProfile.date_of_birth),
      address: patientProfile.address || '',
      city: patientProfile.city || '',
      state: patientProfile.state || '',
      pincode: patientProfile.pincode || '',
    },
  }
}

function ageFromDob(dob) {
  if (!dob) return ''
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1
  return age >= 0 ? String(age) : ''
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
