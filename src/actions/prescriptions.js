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
      .select('registration_no, name, city, state')
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
    },
  }
}

export async function getDoctorPrescriptionTemplatesPageData() {
  const { profile, doctorRecord, hospital } = await getDoctorWorkspace()
  const catalog = getPrescriptionTemplateCatalog()

  return {
    doctor: {
      id: doctorRecord?.id || '',
      name: profile.name,
      specialization: doctorRecord?.specialization || 'General practice',
    },
    hospital: hospital || {
      registration_no: profile.hospital_id,
      name: 'Hospital workspace',
    },
    ...catalog,
  }
}

export async function getDoctorPrescriptionComposerData(appointmentId) {
  const { supabase, profile, doctorRecord, hospital } = await getDoctorWorkspace()
  const catalog = getPrescriptionTemplateCatalog()
  const recommendedTemplateId = getRecommendedTemplateId(doctorRecord?.specialization)
  const defaultTemplate = getPrescriptionTemplateById(recommendedTemplateId)

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
            registration_no
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

  return {
    doctor: {
      id: doctorRecord?.id || '',
      name: profile.name,
      specialization: doctorRecord?.specialization || 'General practice',
    },
    hospital: hospital || {
      registration_no: profile.hospital_id,
      name: 'Hospital workspace',
    },
    appointment,
    templates: catalog.templates,
    optionSets: catalog.optionSets,
    selectedTemplate: defaultTemplate,
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

    // Create prescription record
    const { data: prescription, error: prescriptionError } = await supabase
      .from('prescriptions')
      .insert([
        {
          hospital_id: hospital.registration_no,
          doctor_id: doctorRecord.id,
          created_by: profile.id,
          patient_id: patientId,
          appointment_id: appointmentId,
          template_id: templateId,
          template_version_id: templateVersionId,
          status,
          clinical_summary: clinicalSummary,
          follow_up_date: followUpDate,
          template_snapshot: {},
          metadata: {
            created_from_appointment: true,
            appointment_reason: appointment.reason,
          },
        },
      ])
      .select()
      .single()

    if (prescriptionError) {
      throw prescriptionError
    }

    // Insert prescription values
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

    // Create audit log
    await supabase
      .from('prescription_audit_logs')
      .insert([
        {
          prescription_id: prescription.id,
          actor_id: profile.id,
          event_type: 'created',
          payload: {
            appointment_id: appointmentId,
            from_appointment: true,
          },
        },
      ])

    return {
      success: true,
      prescription_id: prescription.id,
      status: prescription.status,
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
            registration_no
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

    return {
      appointment: mapAppointment(appointment),
      prescriptions: [],
      appointmentStatus: 'pending',
      hasPrescription: false,
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
