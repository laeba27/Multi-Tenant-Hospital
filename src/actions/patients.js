'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createHash, randomInt } from 'crypto'
import {
  generatePatientRegistrationNo,
  generateHospitalPatientId,
  buildPlaceholderEmail,
  isPlaceholderEmail,
} from '@/lib/utils/id-generator'
import { sendPatientEmailOtp } from '@/lib/email/send-email'

/**
 * Build the temporary password issued to a newly-onboarded patient: their
 * phone number (digits only). Supabase requires 6+ chars, so a short/empty
 * number is padded deterministically. The patient must change it on first login.
 */
function buildTempPatientPassword(mobile) {
  const digits = String(mobile || '').replace(/[^\d]/g, '')
  return digits.length >= 6 ? digits : `${digits || 'patient'}@123`
}

/**
 * Ensure the given global profile has an active `patients` link at `hospitalId`,
 * creating one if absent (and re-activating a soft-deleted one). Returns the
 * link row id -- which is the appointment/prescription patient_id.
 *
 * Shared by reception onboarding and patient self-registration, so the link
 * shape stays identical no matter who triggers it. Caller must pass a
 * service-role adminClient.
 */
async function ensureHospitalLink(adminClient, { profileId, hospitalId, registeredBy = null }) {
  const { data: existing } = await adminClient
    .from('patients')
    .select('id, is_active')
    .eq('profile_id', profileId)
    .eq('hospital_id', hospitalId)
    .maybeSingle()

  if (existing) {
    if (existing.is_active === false) {
      await adminClient
        .from('patients')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
    return { id: existing.id, created: false }
  }

  const hospitalPatientId = generateHospitalPatientId()
  const { data: created, error } = await adminClient
    .from('patients')
    .insert({
      id: hospitalPatientId,
      profile_id: profileId,
      hospital_id: hospitalId,
      registration_no: hospitalPatientId,
      is_active: true,
      registered_by: registeredBy,
    })
    .select('id')
    .single()

  if (error) throw error
  return { id: created.id, created: true }
}

/**
 * Search for an existing patient profile by email
 * Used during patient onboarding to detect duplicates
 */
export async function searchPatientByEmail(email) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('role', 'patient')
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  } catch (error) {
    console.error('Error searching patient by email:', error)
    throw error
  }
}

/**
 * Get all patients for a hospital
 */
export async function getHospitalPatients(hospitalId) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('patients')
      .select(
        `
        *,
        profile:profiles!profile_id(
          id,
          name,
          email,
          mobile,
          gender,
          date_of_birth,
          avatar_url,
          registration_no
        )
      `
      )
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching hospital patients:', error)
    throw error
  }
}

/**
 * Get a single patient record
 */
export async function getPatient(patientId, hospitalId) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('patients')
      .select(
        `
        *,
        profile:profiles!profile_id(
          *
        )
      `
      )
      .eq('id', patientId)
      .eq('hospital_id', hospitalId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching patient:', error)
    throw error
  }
}

/**
 * Core onboarding function: Two-step process
 * Step 1: Check if patient exists, create profile if needed
 * Step 2: Link patient to hospital via patients table
 */
export async function onboardPatient(patientData, hospitalId, currentUserId) {
  const adminClient = await createAdminClient()
  
  let patientId = null
  let isNewProfile = false
  let registrationNo = null

  try {
    // ---- Step 1: Find an existing GLOBAL patient profile -------------------
    // A patient is one global profile (hospital_id = null) that can be linked
    // to many hospitals. We identify a returning patient by email (the unique
    // key) first, and otherwise by name + mobile, so registering the same
    // person at a second hospital reuses their profile instead of creating a
    // duplicate (which would collide on the unique email/registration_no).
    const normName = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ')
    const normPhone = (s) => (s || '').replace(/[^\d]/g, '')

    let existingProfile = null

    if (patientData.email) {
      const { data } = await adminClient
        .from('profiles')
        .select('id, name, email, mobile, registration_no')
        .eq('email', patientData.email)
        .eq('role', 'patient')
        .maybeSingle()
      if (data) existingProfile = data
    }

    // Fall back to name + mobile match (handles patients with no email, or a
    // different email but same person).
    if (!existingProfile && patientData.mobile) {
      const { data: candidates } = await adminClient
        .from('profiles')
        .select('id, name, email, mobile, registration_no')
        .eq('role', 'patient')
        .eq('mobile', patientData.mobile)

      const match = (candidates || []).find(
        (c) => normName(c.name) === normName(patientData.name) && normPhone(c.mobile) === normPhone(patientData.mobile)
      )
      if (match) existingProfile = match
    }

    if (existingProfile) {
      patientId = existingProfile.id
      registrationNo = existingProfile.registration_no || null
    }

    // ---- Step 1b: Create a new global profile if none matched -------------
    if (!patientId) {
      isNewProfile = true

      registrationNo = generatePatientRegistrationNo()

      // profiles.id has an FK to auth.users(id), so every patient needs an auth
      // user -- including walk-ins registered without an email. Supabase demands
      // an address to create one, so fall back to a placeholder derived from the
      // registration number. The patient replaces it with a real, OTP-verified
      // address on first login (see completePatientProfile).
      const hasRealEmail = Boolean(patientData.email)
      const authEmail = hasRealEmail ? patientData.email : buildPlaceholderEmail(registrationNo)
      const tempPassword = buildTempPatientPassword(patientData.mobile)

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: authEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          role: 'patient',
          fullName: patientData.name,
        },
      })

      if (authError) throw authError
      patientId = authData.user.id

      const { error: profileError } = await adminClient
        .from('profiles')
        .insert({
          id: patientId,
          registration_no: registrationNo,
          name: patientData.name,
          email: authEmail,
          mobile: patientData.mobile,
          role: 'patient',
          status: 'active',
          hospital_id: null, // Key: hospital_id remains null for patients (global identity)
          access_granted: false,
          // Every patient starts on the phone-number password and must set a
          // real one; those without a real email must also supply/verify it.
          must_change_password: true,
          must_complete_profile: !hasRealEmail,
          email_verified: hasRealEmail,
          gender: patientData.gender || null,
          date_of_birth: patientData.date_of_birth || null,
          address: patientData.address || null,
          city: patientData.city || null,
          state: patientData.state || null,
          pincode: patientData.pincode || null,
          country: patientData.country || null,
          aadhaar_number: patientData.aadhaar_number || null,
          blood_group: patientData.blood_group || null,
        })

      // The auth user is created first and is not covered by the transaction
      // below; if the profile insert fails, remove it so a retry with the same
      // details is not blocked by a duplicate-email error.
      if (profileError) {
        await adminClient.auth.admin.deleteUser(patientId).catch(() => {})
        throw profileError
      }
    }

    if (!registrationNo) {
      registrationNo = generatePatientRegistrationNo()
    }

    // ---- Step 1c: Guard against double-linking the same hospital ----------
    const { data: alreadyLinked } = await adminClient
      .from('patients')
      .select('id, is_active')
      .eq('profile_id', patientId)
      .eq('hospital_id', hospitalId)
      .maybeSingle()

    if (alreadyLinked) {
      // Re-activate if it was previously unlinked; otherwise report it.
      if (alreadyLinked.is_active === false) {
        await adminClient
          .from('patients')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', alreadyLinked.id)
      }
      const { data: existingLink } = await adminClient
        .from('patients')
        .select('*, profile:profiles!profile_id(*)')
        .eq('id', alreadyLinked.id)
        .single()

      return {
        success: true,
        patientId,
        isNewProfile: false,
        alreadyLinked: true,
        patient: existingLink,
        message: 'This patient is already registered at this hospital.',
      }
    }

    // Step 2: Link patient to hospital via patients table
    // Generate hospital-specific patient ID: HOSP-PAT-XXXXX
    const hospitalPatientId = generateHospitalPatientId()

    const { data: linkedPatient, error: linkError } = await adminClient
      .from('patients')
      .insert({
        id: hospitalPatientId, // Hospital-specific patient ID: HOSP-PAT-XXXXX
        profile_id: patientId,
        hospital_id: hospitalId,
        registration_no: hospitalPatientId, // Store hospital patient ID in registration_no as well
        is_active: true,
        height: patientData.height ? parseFloat(patientData.height) : null,
        weight: patientData.weight ? parseFloat(patientData.weight) : null,
        marital_status: patientData.marital_status || null,
        emergency_contact_name: patientData.emergency_contact_name || null,
        emergency_contact_mobile: patientData.emergency_contact_mobile || null,
        insurance_provider: patientData.insurance_provider || null,
        insurance_number: patientData.insurance_number || null,
        allergies: patientData.allergies || null,
        chronic_conditions: patientData.chronic_conditions || null,
        medical_notes: patientData.medical_notes || null,
        registered_by: currentUserId,
      })
      .select(`
        *,
        profile:profiles!profile_id(*)
      `)

    if (linkError) throw linkError

    return {
      success: true,
      patientId,
      isNewProfile,
      patient: linkedPatient[0],
      message: isNewProfile
        ? 'New patient profile created and linked to hospital successfully'
        : 'Existing patient linked to hospital successfully',
    }
    // NOTE: reception onboarding keeps its own richer insert above (height,
    // insurance, emergency contact, etc.). ensureHospitalLink() covers only the
    // minimal self-service link used by patient booking.
  } catch (error) {
    console.error('Error during patient onboarding:', error)
    throw error
  }
}

/**
 * Patient self-service: every hospital the signed-in patient is registered at,
 * with that hospital's record for them. Powers the unified patient portal so a
 * patient sees their data across all hospitals from one login.
 */
export async function getMyHospitalRecords() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in', records: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, name, email, mobile, registration_no, must_change_password, must_complete_profile, email_verified, role'
    )
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'patient') {
    return { success: false, error: 'Not a patient account', records: [] }
  }

  // All hospital links for this global profile.
  const { data: links, error } = await supabase
    .from('patients')
    .select(`
      id,
      hospital_id,
      registration_no,
      is_active,
      created_at,
      hospital:hospitals!patients_hospital_fkey ( registration_no, name, city, state, phone )
    `)
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading patient hospital records:', error)
    return { success: false, error: error.message, records: [] }
  }

  return {
    success: true,
    profile,
    mustChangePassword: Boolean(profile.must_change_password),
    mustCompleteProfile: Boolean(profile.must_complete_profile),
    // A placeholder address is an implementation detail; don't show it back.
    email: isPlaceholderEmail(profile.email) ? '' : profile.email,
    records: links || [],
  }
}

/**
 * Patient self-service: the signed-in patient's appointments across ALL the
 * hospitals they're registered at. Appointments key off the per-hospital
 * patients.id, so we resolve every link for this profile first.
 */
export async function getMyAppointments() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in', appointments: [] }

  // Per-hospital patient ids for this global profile.
  const { data: links } = await supabase
    .from('patients')
    .select('id, hospital_id')
    .eq('profile_id', user.id)

  const patientIds = (links || []).map((l) => l.id)
  if (patientIds.length === 0) return { success: true, appointments: [] }

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      hospital_id,
      appointment_date,
      appointment_slot,
      appointment_type,
      status,
      reason,
      consultation_fee_snapshot,
      treatment_details,
      payment_status,
      amount_due,
      booked_by_type,
      cancellation_reason,
      hospital:hospitals!appointments_hospital_fkey ( name, city ),
      department:departments!appointments_department_fkey ( name ),
      doctor:staff!appointments_doctor_fkey ( name )
    `)
    .in('patient_id', patientIds)
    .order('appointment_date', { ascending: false })

  if (error) {
    console.error('Error loading patient appointments:', error)
    return { success: false, error: error.message, appointments: [] }
  }

  return { success: true, appointments: data || [] }
}

/**
 * Patient self-service: hospitals a patient can book at -- every APPROVED,
 * active hospital on the platform -- flagged with whether the patient already
 * has a record there. Booking at a new one self-registers them on the fly.
 */
export async function getBookableHospitals() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in', hospitals: [] }

  // Only hospitals that are live on the platform. A patient shouldn't be able to
  // book into a hospital that is still pending approval or has been suspended.
  // account_status casing is inconsistent in the data ('Active' vs 'active'),
  // so filter case-insensitively in JS rather than a case-sensitive SQL IN.
  const { data: allHospitals, error } = await supabase
    .from('hospitals')
    .select('registration_no, name, city, state, phone, account_status')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error loading bookable hospitals:', error)
    return { success: false, error: error.message, hospitals: [] }
  }

  const isLive = (s) => ['active', 'approved'].includes((s || '').toLowerCase())
  const hospitals = (allHospitals || []).filter((h) => isLive(h.account_status))

  // Which of them the patient is already registered at.
  const { data: links } = await supabase
    .from('patients')
    .select('id, hospital_id')
    .eq('profile_id', user.id)
    .eq('is_active', true)
  const registered = new Set((links || []).map((l) => l.hospital_id))
  const patientIds = (links || []).map((l) => l.id)

  // Hospitals where the patient has an upcoming (non-cancelled, today or later)
  // appointment -- treat these as "ongoing" and rank them highest.
  const ongoing = new Set()
  if (patientIds.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const { data: appts } = await supabase
      .from('appointments')
      .select('hospital_id, appointment_date, status')
      .in('patient_id', patientIds)
      .gte('appointment_date', today)
      .neq('status', 'cancelled')
    for (const a of appts || []) ongoing.add(a.hospital_id)
  }

  const decorated = (hospitals || []).map((h) => ({
    hospital_id: h.registration_no,
    name: h.name,
    city: h.city,
    state: h.state,
    phone: h.phone,
    isRegistered: registered.has(h.registration_no),
    hasOngoing: ongoing.has(h.registration_no),
  }))

  // Priority: ongoing procedure first, then registered, then the rest.
  // Alphabetical within each tier (the base query already sorted by name).
  const rank = (h) => (h.hasOngoing ? 0 : h.isRegistered ? 1 : 2)
  decorated.sort((a, b) => rank(a) - rank(b))

  return { success: true, hospitals: decorated }
}

/**
 * Patient self-service: book an appointment for THEMSELVES at any portal
 * hospital. If they have no record at the chosen hospital, one is created on the
 * fly (their global profile already exists).
 *
 * bookAppointment() writes with the service-role admin client, so it trusts
 * whatever patient_id it is handed. Never expose it to the patient portal
 * directly: derive the patient from the session, confirm the hospital is a real
 * approved one, and create/resolve the link server-side.
 */
export async function bookMyAppointment({
  hospitalId,
  departmentId,
  doctorId,
  date,
  slot,
  reason,
  appointmentType = 'consultation',
  treatments = [],
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in' }

  if (!hospitalId || !doctorId || !date || !slot) {
    return { success: false, error: 'Hospital, doctor, date and time are all required.' }
  }

  const type = ['consultation', 'treatment', 'both'].includes(appointmentType)
    ? appointmentType
    : 'consultation'
  if ((type === 'treatment' || type === 'both') && treatments.length === 0) {
    return { success: false, error: 'Select at least one treatment.' }
  }

  // Names only -- the clinic sets prices/discounts later. Pricing is never
  // trusted from the patient's browser.
  const treatmentDetails = (treatments || [])
    .filter((t) => t && t.id && t.name)
    .map((t) => ({ id: t.id, name: t.name, price: 0, discount: 0, isCustom: false }))

  const adminClient = await createAdminClient()

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'patient') {
    return { success: false, error: 'Not a patient account' }
  }

  // The hospital must actually exist on the platform and be live -- never trust
  // the client-sent id. This also blocks booking into a suspended hospital.
  const { data: hospital } = await adminClient
    .from('hospitals')
    .select('registration_no, account_status')
    .eq('registration_no', hospitalId)
    .maybeSingle()
  if (!hospital || !['active', 'approved'].includes((hospital.account_status || '').toLowerCase())) {
    return { success: false, error: 'That hospital is not available for booking.' }
  }

  // Register the patient here if they aren't already. This is the self-service
  // "book at a new hospital" flow -- the global profile already exists, we just
  // add the per-hospital link.
  let link
  try {
    link = await ensureHospitalLink(adminClient, {
      profileId: user.id,
      hospitalId,
      registeredBy: user.id,
    })
  } catch (e) {
    console.error('Self-registration during booking failed:', e)
    return { success: false, error: 'Could not register you at that hospital. Please try again.' }
  }

  // Price the appointment SERVER-SIDE. The patient's browser sent names only
  // (prices were zeroed above); the real numbers come from the doctor's
  // consultation fee and the hospital's treatment catalog. Reception can still
  // adjust the total when they confirm.
  const { data: doctor } = await adminClient
    .from('staff')
    .select('consultation_fee')
    .eq('id', doctorId)
    .eq('hospital_id', hospitalId)
    .maybeSingle()

  const consultationFee =
    type === 'treatment' ? 0 : Number(doctor?.consultation_fee) || 0

  let pricedTreatments = treatmentDetails
  if (treatmentDetails.length > 0) {
    const { data: catalog } = await adminClient
      .from('treatments')
      .select('id, name, price')
      .eq('hospital_id', hospitalId)
      .in(
        'id',
        treatmentDetails.map((t) => t.id)
      )

    const priceMap = Object.fromEntries((catalog || []).map((t) => [t.id, t]))
    pricedTreatments = treatmentDetails.map((t) => ({
      ...t,
      name: priceMap[t.id]?.name || t.name,
      price: Number(priceMap[t.id]?.price) || 0,
    }))
  }

  const treatmentTotal = pricedTreatments.reduce((sum, t) => sum + (Number(t.price) || 0), 0)
  const amountDue = consultationFee + treatmentTotal

  const { bookAppointment } = await import('@/actions/appointments')
  const result = await bookAppointment(
    {
      hospital_id: hospitalId,
      patient_id: link.id,
      department_id: departmentId || null,
      doctor_id: doctorId,
      appointment_date: date,
      appointment_slot: slot,
      appointment_type: type,
      reason: reason || null,
      consultation_fee_snapshot: consultationFee || null,
      treatment_details: pricedTreatments,
      // Marks this as a request, not a booking: bookAppointment writes it as
      // 'pending_confirmation' and reception reviews it before it's real.
      booked_by_type: 'patient',
      amount_due: amountDue,
    },
    user.id
  )

  if (!result?.success) return result

  // Tell the desk. Role-addressed, so it reaches whoever is on shift without us
  // having to know who that is. Failing to notify must not undo the booking --
  // notify() swallows its own errors.
  const [{ data: patientProfile }, { data: doctorRow }] = await Promise.all([
    adminClient.from('profiles').select('name').eq('id', user.id).maybeSingle(),
    adminClient.from('staff').select('name').eq('id', doctorId).maybeSingle(),
  ])

  const patientName = patientProfile?.name || 'A patient'
  const doctorName = doctorRow?.name || 'a doctor'
  const dueText = amountDue > 0 ? ` ₹${amountDue} due.` : ''
  const body = `${patientName} requested ${doctorName} on ${date} at ${slot}.${dueText}`

  const { notify } = await import('@/actions/notifications')
  await Promise.all([
    notify({
      recipientRole: 'receptionist',
      hospitalId,
      kind: 'appointment_requested',
      title: 'New appointment request',
      body,
      link: '/dashboard/reception/patient-management?tab=requests',
      entityId: result.appointment?.id,
    }),
    notify({
      recipientRole: 'hospital_admin',
      hospitalId,
      kind: 'appointment_requested',
      title: 'New appointment request',
      body,
      link: '/dashboard/hospital/patient-management?tab=requests',
      entityId: result.appointment?.id,
    }),
  ])

  return {
    ...result,
    message: 'Request sent. The hospital will confirm your appointment shortly.',
  }
}

/**
 * Patient withdraws a booking request the hospital hasn't confirmed yet.
 *
 * Deliberately the ordinary (RLS-enforced) client, not the admin one: the
 * policy from migration 028 only lets a patient update their own
 * 'pending_confirmation' rows, and a trigger blocks them from changing anything
 * but the status. The database is the guard here, not this function.
 */
export async function cancelMyAppointmentRequest(appointmentId) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in' }
  if (!appointmentId) return { success: false, error: 'Appointment required' }

  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('status', 'pending_confirmation')
    .select('id, hospital_id')
    .maybeSingle()

  if (error) {
    console.error('Error cancelling appointment request:', error)
    return { success: false, error: 'Could not cancel that request.' }
  }
  if (!data) {
    return {
      success: false,
      error: 'That request can no longer be cancelled — the hospital may have already confirmed it.',
    }
  }

  revalidatePath('/dashboard/patient/appointments')
  return { success: true, message: 'Booking request cancelled.' }
}

/**
 * Patient self-service: doctors at a hospital, split into ones this patient has
 * seen before (with their most recent visit date) and the rest. Powers the
 * "continue with your doctor vs see someone new" step of booking.
 */
export async function getMyDoctorsAtHospital(hospitalId) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in', seen: [], others: [] }
  if (!hospitalId) return { success: false, error: 'Hospital required', seen: [], others: [] }

  // Every active doctor at this hospital.
  const { data: doctors, error } = await supabase
    .from('staff')
    .select('id, name, department_id, role, is_active, specialization')
    .eq('hospital_id', hospitalId)
    .eq('role', 'doctor')

  if (error) {
    console.error('Error loading hospital doctors:', error)
    return { success: false, error: error.message, seen: [], others: [] }
  }
  const activeDoctors = (doctors || []).filter((d) => d.is_active !== false)

  // This patient's link rows at the hospital, then their past appointments there
  // to find which doctors they've seen and when.
  const { data: links } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)
    .eq('hospital_id', hospitalId)
  const patientIds = (links || []).map((l) => l.id)

  const lastVisit = new Map() // doctor_id -> most recent appointment_date
  if (patientIds.length > 0) {
    const { data: appts } = await supabase
      .from('appointments')
      .select('doctor_id, appointment_date')
      .in('patient_id', patientIds)
      .not('doctor_id', 'is', null)
    for (const a of appts || []) {
      const prev = lastVisit.get(a.doctor_id)
      if (!prev || (a.appointment_date || '') > prev) {
        lastVisit.set(a.doctor_id, a.appointment_date)
      }
    }
  }

  const seen = []
  const others = []
  for (const d of activeDoctors) {
    if (lastVisit.has(d.id)) {
      seen.push({ ...d, lastVisit: lastVisit.get(d.id) })
    } else {
      others.push(d)
    }
  }
  // Most recently seen first.
  seen.sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || ''))

  return { success: true, seen, others }
}

/**
 * Patient self-service: the demographic fields booking may prompt to complete,
 * plus the emergency contact from any of the patient's hospital links. Lets the
 * booking page show a "complete your details" section only for blank fields.
 */
export async function getMyProfileForBooking() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in', profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, blood_group, date_of_birth, gender, address, city, state, pincode')
    .eq('id', user.id)
    .single()

  // Emergency contact lives on the patients link rows; surface the first set one.
  const { data: links } = await supabase
    .from('patients')
    .select('emergency_contact_name, emergency_contact_mobile')
    .eq('profile_id', user.id)
  const withContact = (links || []).find((l) => l.emergency_contact_name || l.emergency_contact_mobile)

  return {
    success: true,
    profile: {
      ...(profile || {}),
      emergency_contact_name: withContact?.emergency_contact_name || '',
      emergency_contact_mobile: withContact?.emergency_contact_mobile || '',
    },
  }
}

/**
 * Patient self-service: update ONLY the given profile fields for the signed-in
 * patient. Derives the id from the session -- never trust a caller-supplied one.
 * Recommended-not-mandatory: callers pass just the fields they want to set.
 */
export async function updateMyProfileDetails(details = {}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in' }

  // Whitelist: a patient may only edit these demographic fields about themselves.
  const allowed = ['blood_group', 'date_of_birth', 'gender', 'address', 'city', 'state', 'pincode']
  const patch = {}
  for (const key of allowed) {
    const v = details[key]
    if (v !== undefined && v !== null && String(v).trim() !== '') patch[key] = v
  }
  // Emergency contact lives on the per-hospital patients row, handled separately.
  const emergencyName = details.emergency_contact_name
  const emergencyMobile = details.emergency_contact_mobile

  const adminClient = await createAdminClient()

  if (Object.keys(patch).length > 0) {
    const { error } = await adminClient
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .eq('role', 'patient')
    if (error) return { success: false, error: error.message }
  }

  // Apply emergency contact to all of the patient's link rows so it's on record
  // at every hospital they attend.
  if ((emergencyName && emergencyName.trim()) || (emergencyMobile && emergencyMobile.trim())) {
    await adminClient
      .from('patients')
      .update({
        emergency_contact_name: emergencyName || null,
        emergency_contact_mobile: emergencyMobile || null,
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', user.id)
  }

  return { success: true }
}

/**
 * Patient self-service: health advisories and announcements. RLS on
 * patient_notices already restricts rows to platform-wide notices plus the
 * hospitals this patient is registered at, and drops expired ones -- so a
 * plain select returns exactly what they may see.
 */
export async function getMyNotices({ limit = 20 } = {}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in', notices: [] }

  const { data, error } = await supabase
    .from('patient_notices')
    .select(`
      id,
      hospital_id,
      title,
      body,
      category,
      is_pinned,
      published_at,
      expires_at,
      hospital:hospitals!patient_notices_hospital_id_fkey ( name )
    `)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error loading patient notices:', error)
    return { success: false, error: error.message, notices: [] }
  }

  return { success: true, notices: data || [] }
}

/**
 * Patient self-service: issued prescriptions across every hospital, newest
 * first. Drafts and cancelled prescriptions are never shown -- a draft is a
 * doctor's work in progress, not a document the patient should act on.
 */
export async function getMyPrescriptionHistory() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in', prescriptions: [] }

  const { data: links } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)

  const patientIds = (links || []).map((l) => l.id)
  if (patientIds.length === 0) return { success: true, prescriptions: [] }

  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      id,
      hospital_id,
      status,
      clinical_summary,
      follow_up_date,
      issued_at,
      created_at,
      appointment_id,
      hospital:hospitals!prescriptions_hospital_id_fkey ( name, city ),
      doctor:staff!prescriptions_doctor_id_fkey ( name )
    `)
    .in('patient_id', patientIds)
    .in('status', ['issued', 'amended'])
    .order('issued_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error loading patient prescriptions:', error)
    return { success: false, error: error.message, prescriptions: [] }
  }

  return { success: true, prescriptions: data || [] }
}

/**
 * Patient self-service: set a new password and clear the temporary-password
 * flag so the portal stops prompting them.
 */
export async function changeMyPassword(newPassword) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in' }

  if (!newPassword || String(newPassword).length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' }
  }

  const { error: pwError } = await supabase.auth.updateUser({ password: newPassword })
  if (pwError) return { success: false, error: pwError.message }

  // Clear the flag (admin client so it isn't blocked by RLS on profiles).
  const adminClient = await createAdminClient()
  await adminClient
    .from('profiles')
    .update({ must_change_password: false, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  return { success: true, message: 'Password updated successfully.' }
}

// ---------------------------------------------------------------------------
// First-login profile completion: real email + OTP verification + password
// ---------------------------------------------------------------------------

const OTP_TTL_MINUTES = 10
const OTP_MAX_ATTEMPTS = 5

/** SHA-256 the code so a leaked table can't be used to verify pending addresses. */
function hashOtp(code) {
  return createHash('sha256').update(String(code)).digest('hex')
}

/**
 * Patient self-service, step 1 of completion: claim a real email address and
 * receive a 6-digit code at it. The address is NOT written to the profile yet --
 * it only lands there once the code is verified, so an unverified typo can't
 * lock the account or squat someone else's address.
 */
export async function sendMyEmailOtp(email) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in' }

  const normalized = String(email || '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(normalized)) {
    return { success: false, error: 'Enter a valid email address.' }
  }
  if (isPlaceholderEmail(normalized)) {
    return { success: false, error: 'Enter your own email address.' }
  }

  const adminClient = await createAdminClient()

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, name, registration_no, role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'patient') {
    return { success: false, error: 'Not a patient account' }
  }

  // profiles.email is UNIQUE -- reject a taken address here rather than letting
  // the swap fail after the patient has already proven they own it.
  const { data: taken } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .neq('id', user.id)
    .maybeSingle()
  if (taken) {
    return { success: false, error: 'That email is already registered to another account.' }
  }

  // randomInt is cryptographically secure, unlike Math.random.
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')

  // Supersede any earlier unconsumed code for this patient.
  await adminClient
    .from('email_verification_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('profile_id', user.id)
    .is('consumed_at', null)

  const { error: insertError } = await adminClient.from('email_verification_codes').insert({
    profile_id: user.id,
    email: normalized,
    code_hash: hashOtp(code),
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
  })
  if (insertError) return { success: false, error: insertError.message }

  const sent = await sendPatientEmailOtp({
    email: normalized,
    name: profile.name,
    code,
    expiresInMinutes: OTP_TTL_MINUTES,
  })
  if (!sent.success) {
    return { success: false, error: 'Could not send the verification email. Please try again.' }
  }

  return { success: true, message: `A 6-digit code was sent to ${normalized}.` }
}

/**
 * Patient self-service, step 2: verify the code, then atomically finish
 * onboarding -- swap the placeholder email for the real one in both auth.users
 * and profiles, save the remaining details, set a real password, and clear the
 * temporary-account flags.
 */
export async function completePatientProfile({ email, code, password, details = {} }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in' }

  const normalized = String(email || '').trim().toLowerCase()
  if (!password || String(password).length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' }
  }

  const adminClient = await createAdminClient()

  const { data: record } = await adminClient
    .from('email_verification_codes')
    .select('id, email, code_hash, attempts, expires_at, consumed_at')
    .eq('profile_id', user.id)
    .eq('email', normalized)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!record) return { success: false, error: 'Request a verification code first.' }
  if (new Date(record.expires_at) < new Date()) {
    return { success: false, error: 'That code has expired. Request a new one.' }
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { success: false, error: 'Too many incorrect attempts. Request a new code.' }
  }

  if (record.code_hash !== hashOtp(String(code || '').trim())) {
    await adminClient
      .from('email_verification_codes')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id)
    const left = OTP_MAX_ATTEMPTS - (record.attempts + 1)
    return {
      success: false,
      error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Request a new code.',
    }
  }

  // Code is good. Move the verified address onto the auth user first: it can
  // fail on a unique-violation race, and we'd rather leave the profile
  // untouched than have profiles.email disagree with auth.users.email.
  const { error: authError } = await adminClient.auth.admin.updateUserById(user.id, {
    email: normalized,
    email_confirm: true,
    password,
  })
  if (authError) return { success: false, error: authError.message }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      email: normalized,
      email_verified: true,
      must_complete_profile: false,
      must_change_password: false,
      address: details.address || null,
      city: details.city || null,
      state: details.state || null,
      pincode: details.pincode || null,
      country: details.country || null,
      blood_group: details.blood_group || null,
      aadhaar_number: details.aadhaar_number || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
  if (profileError) return { success: false, error: profileError.message }

  await adminClient
    .from('email_verification_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', record.id)

  return { success: true, message: 'Your profile is complete.' }
}

/**
 * Update patient information
 */
export async function updatePatient(patientId, hospitalId, updateData) {
  try {
    const supabase = await createClient()

    // Update patient record
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId)
      .eq('hospital_id', hospitalId)
      .select()

    if (patientError) throw patientError

    return {
      success: true,
      patient: patient[0],
    }
  } catch (error) {
    console.error('Error updating patient:', error)
    throw error
  }
}

/**
 * Update patient profile information (in profiles table)
 */
export async function updatePatientProfile(patientId, profileData) {
  try {
    const adminClient = await createAdminClient()

    const { data: profile, error } = await adminClient
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId)
      .eq('role', 'patient')
      .select()

    if (error) throw error

    return {
      success: true,
      profile: profile[0],
    }
  } catch (error) {
    console.error('Error updating patient profile:', error)
    throw error
  }
}

/**
 * Unlink patient from hospital (soft delete by changing status)
 */
export async function unlinkPatientFromHospital(patientId, hospitalId) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('patients')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId)
      .eq('hospital_id', hospitalId)

    if (error) throw error

    return {
      success: true,
      message: 'Patient unlinked from hospital',
    }
  } catch (error) {
    console.error('Error unlinking patient:', error)
    throw error
  }
}

/**
 * Delete patient record permanently
 */
export async function deletePatient(patientId, hospitalId) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId)
      .eq('hospital_id', hospitalId)

    if (error) throw error

    return {
      success: true,
      message: 'Patient record deleted successfully',
    }
  } catch (error) {
    console.error('Error deleting patient:', error)
    throw error
  }
}

/**
 * Get patient count for a hospital
 */
export async function getPatientCount(hospitalId) {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error getting patient count:', error)
    return 0
  }
}

/**
 * Search patients by name or patient number
 */
export async function searchPatients(hospitalId, query) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('patients')
      .select(
        `
        *,
        profile:profiles!profile_id(
          name,
          email,
          mobile,
          avatar_url,
          registration_no
        )
      `
      )
      .eq('hospital_id', hospitalId)
      .or(
        `id.ilike.%${query}%,profile.name.ilike.%${query}%,profile.email.ilike.%${query}%,profile.mobile.ilike.%${query}%`
      )
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error searching patients:', error)
    return []
  }
}

/**
 * Search for patient in a specific hospital by ID, email, phone, or name
 * Used when starting new appointment booking to find existing patients
 */
export async function searchPatientForHospital(hospitalId, searchType, searchValue) {
  try {
    const supabase = await createClient()

    const normalizedSearchValue = searchValue.toUpperCase().replace(/\s+/g, '')

    let query = supabase
      .from('patients')
      .select(
        `
        *,
        profile:profiles!profile_id(
          id,
          name,
          email,
          mobile,
          gender,
          date_of_birth,
          avatar_url,
          registration_no
        )
      `
      )
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)

    // Apply filter based on search type
    switch (searchType) {
      case 'id':
        // Search by hospital patient ID (HOSP-PAT-XXXXX) or profile registration no (PATIENT-XXXXXX)
        if (/^HOSP-PAT-\d+$/.test(normalizedSearchValue)) {
          // Direct match for HOSP-PAT-XXXXX format
          query = query.eq('id', normalizedSearchValue)
        } else if (/^PATIENT\d+$/.test(normalizedSearchValue)) {
          // Handle PATIENTXXXXX -> PATIENT-XXXXX
          const withHyphen = normalizedSearchValue.replace(/^PATIENT/, 'PATIENT-')
          query = query.eq('profile.registration_no', withHyphen)
        } else {
          // Try to match against patients.id (hospital patient ID)
          query = query.eq('id', normalizedSearchValue)
        }
        break
      case 'email':
        query = query.eq('profile.email', searchValue.toLowerCase())
        break
      case 'phone':
        query = query.eq('profile.mobile', searchValue)
        break
      case 'name':
        query = query.ilike('profile.name', `%${searchValue}%`)
        break
      default:
        return null
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  } catch (error) {
    console.error('Error searching patient for hospital:', error)
    throw error
  }
}
