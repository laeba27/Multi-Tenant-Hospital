'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Resolve the logged-in doctor (staff row + hospital).
 */
async function getDoctorContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, registration_no, hospital_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'doctor') redirect('/dashboard')

  const { data: doctorRecord } = await supabase
    .from('staff')
    .select('id, hospital_id, department_id, specialization')
    .eq('employee_registration_no', profile.registration_no)
    .eq('role', 'doctor')
    .single()

  return { supabase, profile, doctorRecord }
}

function fmtPatient(patientRecord) {
  const p = patientRecord?.profile || {}
  return {
    id: patientRecord?.id,
    registrationNo: patientRecord?.registration_no || p.registration_no || '',
    name: p.name || 'Unknown patient',
    email: p.email || '',
    mobile: p.mobile || '',
    gender: p.gender || '',
    dateOfBirth: p.date_of_birth || '',
    age: ageFromDob(p.date_of_birth),
    address: p.address || '',
    city: p.city || '',
    state: p.state || '',
    pincode: p.pincode || '',
    avatarUrl: p.avatar_url || '',
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

/**
 * All patients this doctor has seen (i.e. have an appointment with them),
 * aggregated with appointment + prescription counts and last-visit date.
 */
export async function getDoctorPatients() {
  const { supabase, doctorRecord } = await getDoctorContext()
  if (!doctorRecord?.id) return []

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      patient_id,
      appointment_date,
      status,
      patients:patient_id (
        id,
        registration_no,
        profile:profiles!profile_id (
          id, name, email, mobile, gender, date_of_birth,
          address, city, state, pincode, avatar_url, registration_no
        )
      ),
      prescriptions:prescriptions!appointment_id ( id, status )
    `)
    .eq('doctor_id', doctorRecord.id)
    .order('appointment_date', { ascending: false })

  if (error) {
    console.error('Error fetching doctor patients:', error)
    return []
  }

  const byPatient = new Map()
  for (const appt of appointments || []) {
    const pr = appt.patients
    if (!pr) continue
    const key = pr.id
    if (!byPatient.has(key)) {
      byPatient.set(key, {
        ...fmtPatient(pr),
        appointmentCount: 0,
        prescriptionCount: 0,
        lastVisit: null,
      })
    }
    const entry = byPatient.get(key)
    entry.appointmentCount += 1
    const rxList = Array.isArray(appt.prescriptions) ? appt.prescriptions : []
    entry.prescriptionCount += rxList.filter((r) => r.status !== 'cancelled').length
    if (appt.appointment_date && (!entry.lastVisit || appt.appointment_date > entry.lastVisit)) {
      entry.lastVisit = appt.appointment_date
    }
  }

  return Array.from(byPatient.values()).sort((a, b) =>
    (b.lastVisit || '').localeCompare(a.lastVisit || '')
  )
}

/**
 * Full record for one patient (by registration_no or patient id) as seen by
 * this doctor: profile, their appointments with this doctor, and every
 * prescription (with its field values) issued from those appointments.
 */
export async function getDoctorPatientDetail(identifier) {
  const { supabase, doctorRecord } = await getDoctorContext()
  if (!doctorRecord?.id || !identifier) return null

  // Find the patient row in this doctor's hospital by registration_no or id.
  let patientQuery = supabase
    .from('patients')
    .select(`
      id,
      registration_no,
      hospital_id,
      profile:profiles!profile_id (
        id, name, email, mobile, gender, date_of_birth,
        address, city, state, pincode, avatar_url, registration_no
      )
    `)
    .eq('hospital_id', doctorRecord.hospital_id)

  // registration_no looks like HOSP-PAT-xxxxx; ids are uuids.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    identifier
  )
  patientQuery = isUuid
    ? patientQuery.eq('id', identifier)
    : patientQuery.eq('registration_no', identifier)

  const { data: patientRecord, error: patientError } = await patientQuery.maybeSingle()
  if (patientError || !patientRecord) return null

  // Appointments this doctor had with the patient.
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, appointment_date, appointment_slot, appointment_type, reason, status,
      departments:department_id ( name )
    `)
    .eq('doctor_id', doctorRecord.id)
    .eq('patient_id', patientRecord.id)
    .order('appointment_date', { ascending: false })

  // Prescriptions (with field values) for this patient under this doctor.
  const { data: prescriptions } = await supabase
    .from('prescriptions')
    .select(`
      id, appointment_id, status, clinical_summary, follow_up_date,
      issued_at, created_at, updated_at,
      prescription_values ( field_id, section_key, field_key, label, value, rendered_value, sort_order )
    `)
    .eq('doctor_id', doctorRecord.id)
    .eq('patient_id', patientRecord.id)
    .order('created_at', { ascending: false })

  const mappedPrescriptions = (prescriptions || []).map((rx) => ({
    id: rx.id,
    appointmentId: rx.appointment_id,
    status: rx.status,
    clinicalSummary: rx.clinical_summary || '',
    followUpDate: rx.follow_up_date || null,
    issuedAt: rx.issued_at || null,
    createdAt: rx.created_at,
    updatedAt: rx.updated_at,
    values: (rx.prescription_values || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((v) => ({
        sectionKey: v.section_key,
        fieldKey: v.field_key,
        label: v.label,
        rendered: v.rendered_value || formatValue(v.value),
      })),
  }))

  return {
    patient: fmtPatient(patientRecord),
    appointments: (appointments || []).map((a) => ({
      id: a.id,
      date: a.appointment_date,
      slot: a.appointment_slot,
      type: a.appointment_type,
      reason: a.reason,
      status: a.status,
      department: a.departments?.name || '',
    })),
    prescriptions: mappedPrescriptions,
  }
}

function formatValue(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
