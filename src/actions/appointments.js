'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'

/**
 * Fetch doctors by department and hospital
 */
export async function getDoctorsByDepartment(hospitalId, departmentId) {
  try {
    const supabase = await createClient()

    const { data: doctors, error } = await supabase
      .from('staff')
      .select(`
        id, 
        profile_id, 
        profiles!profile_id(name, email, mobile, avatar_url),
        designation,
        specialization,
        consultation_fee,
        max_patients_per_day,
        work_days,
        shift_start_time,
        shift_end_time
      `)
      .eq('hospital_id', hospitalId)
      .eq('department_id', departmentId)
      .eq('role', 'doctor')
      .eq('is_active', true)

    if (error) throw error
    return doctors || []
  } catch (error) {
    console.error('Error fetching doctors:', error)
    throw error
  }
}

const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

/** 'HH:MM' or 'HH:MM:SS' -> minutes since midnight. */
function toMinutes(t) {
  if (!t) return null
  const [h, m] = String(t).split(':')
  return Number(h) * 60 + Number(m || 0)
}

/** minutes since midnight -> 'HH:MM' */
function toClock(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** [aStart,aEnd) overlaps [bStart,bEnd)? */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

/**
 * The bookable blocks for a doctor on a date, each with its state.
 *
 *   green   available    -- room left, bookable
 *   yellow  full         -- capacity reached, NOT bookable
 *   red     unavailable  -- leave, holiday, break, or outside the shift
 *
 * Replaces a version that: never read work_days (so a Mon-Fri doctor was
 * offered Sundays), never excluded booked slots (so two patients could take
 * the same 10:30), and had no concept of leave.
 *
 * Returns { available, reason, slots: [{ slot, label, state, taken, capacity }] }
 * where `slot` is the block's start time ('07:00') -- the value stored on the
 * appointment -- and `label` is the human range ('7:00 – 8:00 AM').
 */
export async function getDoctorAvailableSlots(doctorId, date, hospitalId) {
  try {
    const supabase = await createClient()

    if (!doctorId || !date) {
      return { available: false, reason: 'Pick a doctor and a date.', slots: [] }
    }

    const { data: doctor, error: docError } = await supabase
      .from('staff')
      .select(
        'id, hospital_id, is_active, shift_start_time, shift_end_time, work_days, ' +
          'max_patients_per_day, slot_duration_minutes, max_patients_per_slot, ' +
          'break_start_time, break_end_time'
      )
      .eq('id', doctorId)
      .single()

    if (docError) throw docError

    if (!doctor.is_active) {
      return { available: false, reason: 'This doctor is not currently active.', slots: [] }
    }
    if (!doctor.shift_start_time || !doctor.shift_end_time) {
      return {
        available: false,
        reason: 'No working hours are configured for this doctor.',
        slots: [],
      }
    }

    // ── Does the doctor work this weekday at all? ──
    // work_days has been stored since migration 007 and read by nobody until now.
    const weekday = DAY_NAMES[new Date(`${date}T00:00:00`).getDay()]
    const workDays = Array.isArray(doctor.work_days) ? doctor.work_days : null
    if (workDays && workDays.length > 0 && !workDays.includes(weekday)) {
      return {
        available: false,
        reason: `The doctor does not work on ${weekday[0].toUpperCase()}${weekday.slice(1)}s.`,
        slots: [],
      }
    }

    // ── Leave / holiday, for this doctor or hospital-wide. ──
    const { data: absences } = await supabase
      .from('staff_unavailability')
      .select('kind, reason, starts_at_time, ends_at_time, staff_id')
      .eq('hospital_id', hospitalId || doctor.hospital_id)
      .or(`staff_id.eq.${doctorId},staff_id.is.null`)
      .lte('starts_on', date)
      .gte('ends_on', date)

    // A whole-day absence (no times) closes the day outright.
    const fullDayOff = (absences || []).find((a) => !a.starts_at_time)
    if (fullDayOff) {
      const what =
        fullDayOff.kind === 'holiday'
          ? 'Hospital holiday'
          : fullDayOff.kind === 'leave'
            ? 'The doctor is on leave'
            : 'The doctor is unavailable'
      return {
        available: false,
        reason: fullDayOff.reason ? `${what} — ${fullDayOff.reason}` : `${what} on this date.`,
        slots: [],
      }
    }
    // Partial absences block only the blocks they overlap.
    const partialOff = (absences || [])
      .filter((a) => a.starts_at_time)
      .map((a) => ({ start: toMinutes(a.starts_at_time), end: toMinutes(a.ends_at_time) }))

    // ── What's already taken, per block. ──
    // pending_confirmation holds its place: a request awaiting reception's
    // approval must not let the block be oversold underneath it.
    const { data: booked } = await supabase
      .from('appointments')
      .select('appointment_slot, status')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'pending_confirmation'])

    const takenBySlot = {}
    for (const b of booked || []) {
      takenBySlot[b.appointment_slot] = (takenBySlot[b.appointment_slot] || 0) + 1
    }
    const bookedToday = (booked || []).length

    // ── Build the blocks. ──
    const step = doctor.slot_duration_minutes || 60
    const capacity = doctor.max_patients_per_slot || 1
    const dayCap = doctor.max_patients_per_day || null

    const shiftStart = toMinutes(doctor.shift_start_time)
    const shiftEnd = toMinutes(doctor.shift_end_time)
    const breakStart = toMinutes(doctor.break_start_time)
    const breakEnd = toMinutes(doctor.break_end_time)

    // A shift that ends before it starts crosses midnight (one staff row in the
    // wild has 08:30 -> 06:30). Treat the end as next-day rather than emitting
    // zero slots.
    const effectiveEnd = shiftEnd > shiftStart ? shiftEnd : shiftEnd + 24 * 60

    const dayIsFull = dayCap !== null && bookedToday >= dayCap

    // Blocks align to the CLOCK, not to the shift start. A 06:30 shift with
    // 60-minute blocks must still produce 7:00-8:00, 8:00-9:00 -- the clean
    // hours the product asks for -- not 6:30-7:30, 7:30-8:30. Aligning to the
    // shift would also make the block keys ('06:30') disagree with the times
    // appointments were actually booked at ('07:00'), so occupancy would read
    // as zero and every slot would look empty.
    const firstBlock = Math.ceil(shiftStart / step) * step

    const slots = []
    for (let start = firstBlock; start + step <= effectiveEnd; start += step) {
      const end = start + step
      const slot = toClock(start % (24 * 60))
      const taken = takenBySlot[slot] || 0

      // Break time: not offered at all.
      const onBreak =
        breakStart !== null && breakEnd !== null && overlaps(start, end, breakStart, breakEnd)

      const partiallyAway = partialOff.some((a) => overlaps(start, end, a.start, a.end))

      let state
      if (onBreak || partiallyAway) state = 'unavailable' // red
      else if (taken >= capacity || dayIsFull) state = 'full' // yellow
      else state = 'available' // green

      slots.push({
        slot,
        label: `${formatClock(start)} – ${formatClock(end)}`,
        state,
        taken,
        capacity,
        bookable: state === 'available',
      })
    }

    const anyOpen = slots.some((s) => s.bookable)
    return {
      available: anyOpen,
      reason: anyOpen
        ? null
        : dayIsFull
          ? 'The doctor is fully booked for this day.'
          : 'No slots are available on this date.',
      slots,
    }
  } catch (error) {
    console.error('Error fetching slots:', error)
    return { available: false, reason: 'Could not load slots.', slots: [] }
  }
}

/** 420 -> '7:00 AM' */
function formatClock(mins) {
  const m = mins % (24 * 60)
  const h24 = Math.floor(m / 60)
  const min = m % 60
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(min).padStart(2, '0')} ${suffix}`
}

/**
 * Fetch all appointments for a hospital
 */
export async function getHospitalAppointments(hospitalId) {
  try {
    const supabase = await createClient()

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        hospital_id,
        patient_id,
        department_id,
        doctor_id,
        appointment_date,
        appointment_slot,
        appointment_type,
        reason,
        status,
        booked_by_type,
        payment_status,
        amount_due,
        cancellation_reason,
        created_at,
        patients:patient_id(
          id,
          profile_id,
          registration_no,
          profiles:profile_id(id, registration_no, name, email, mobile)
        )
      `)
      .eq('hospital_id', hospitalId)
      .order('appointment_date', { ascending: false })

    if (error) throw error

    // Fetch doctor details separately to avoid join complexity
    let appointmentsWithDoctors = appointments
    
    if (appointments && appointments.length > 0) {
      // Get unique doctor IDs
      const doctorIds = [...new Set(appointments.map(apt => apt.doctor_id).filter(Boolean))]
      
      if (doctorIds.length > 0) {
        const { data: doctors, error: doctorError } = await supabase
          .from('staff')
          .select(`
            id,
            profile_id,
            profiles!profile_id(id, name, registration_no, email)
          `)
          .in('id', doctorIds)

        if (!doctorError && doctors) {
          // Create a map of doctor details
          const doctorMap = {}
          doctors.forEach(doc => {
            doctorMap[doc.id] = doc.profiles
          })

          // Attach doctor details to appointments
          appointmentsWithDoctors = appointments.map(apt => ({
            ...apt,
            doctor: doctorMap[apt.doctor_id] || null
          }))
        }
      }
    }

    return appointmentsWithDoctors || []
  } catch (error) {
    console.error('Error fetching hospital appointments:', error)
    throw error
  }
}

/**
 * Fetch appointments assigned to a specific doctor
 */
export async function getDoctorAppointments(doctorId) {
  if (!doctorId) return []

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        hospital_id,
        patient_id,
        department_id,
        doctor_id,
        appointment_date,
        appointment_slot,
        appointment_type,
        reason,
        status,
        consultation_fee_snapshot,
        created_at,
        updated_at,
        patients:patient_id (
          id,
          profile_id,
          registration_no,
          profile:profiles!profile_id (
            id,
            name,
            email,
            mobile,
            avatar_url,
            registration_no
          )
        ),
        departments:department_id (
          id,
          name
        ),
        prescriptions:prescriptions!appointment_id (
          id,
          status,
          issued_at,
          created_at
        )
      `)
      .eq('doctor_id', doctorId)
      .order('appointment_date', { ascending: true })
      .order('appointment_slot', { ascending: true })

    if (error) throw error

    // Derive a single prescription state per appointment from its prescriptions.
    return (data || []).map((appt) => {
      const list = Array.isArray(appt.prescriptions) ? appt.prescriptions : []
      const active = list
        .filter((p) => p.status !== 'cancelled')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      return {
        ...appt,
        prescription_state: active ? active.status || 'draft' : 'pending',
        has_prescription: Boolean(active),
        prescription_id: active?.id || null,
      }
    })
  } catch (error) {
    console.error('Error fetching doctor appointments:', error)
    throw error
  }
}

/**
 * Reschedule an appointment
 */
export async function rescheduleAppointment({ appointmentId, newDate, newSlot }) {
  try {
    const adminClient = await createAdminClient()

    const { error } = await adminClient
      .from('appointments')
      .update({
        appointment_date: newDate,
        appointment_slot: newSlot,
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)

    if (error) throw error

    revalidatePath('/dashboard/doctor/appointments')

    return {
      success: true,
      message: 'Appointment rescheduled',
    }
  } catch (error) {
    console.error('Error rescheduling appointment:', error)
    throw error
  }
}

/**
 * Delete an appointment permanently
 */
export async function deleteAppointment(appointmentId) {
  try {
    const adminClient = await createAdminClient()

    const { error } = await adminClient
      .from('appointments')
      .delete()
      .eq('id', appointmentId)

    if (error) throw error

    revalidatePath('/dashboard/doctor/appointments')

    return {
      success: true,
      message: 'Appointment deleted',
    }
  } catch (error) {
    console.error('Error deleting appointment:', error)
    throw error
  }
}

/**
 * Book an appointment
 */
export async function bookAppointment(data, currentUserId) {
  try {
    const adminClient = await createAdminClient()
    const appointmentId = `APT${Math.floor(100000 + Math.random() * 900000)}`

    // Normalize the selected treatments (catalog + manually-added custom ones)
    // into a clean JSONB array persisted on the appointment. Each entry keeps
    // its price + discount so billing can build the invoice from this snapshot.
    const treatmentDetails = Array.isArray(data.treatment_details)
      ? data.treatment_details.map((t) => ({
          id: t.id,
          name: t.name,
          price: Number(t.price) || 0,
          discount: Number(t.discount) || 0,
          isCustom: Boolean(t.isCustom) || String(t.id || '').startsWith('custom-'),
        }))
      : []

    // First non-custom catalog treatment id (the table has a singular
    // treatment_id FK to treatments); custom entries live only in the JSONB.
    const primaryTreatmentId =
      treatmentDetails.find((t) => !t.isCustom && t.id)?.id || null

    // Staff bookings are confirmed the moment they're created -- a human at the
    // desk made them. A patient booking for themselves arrives as a *request*:
    // status 'pending_confirmation' + booked_by_type 'patient' (passed in by
    // bookMyAppointment), which reception reviews before it becomes real.
    const bookedByType = data.booked_by_type === 'patient' ? 'patient' : 'staff'
    const status = bookedByType === 'patient' ? 'pending_confirmation' : 'scheduled'

    const { data: appointment, error } = await adminClient
      .from('appointments')
      .insert({
        id: appointmentId,
        hospital_id: data.hospital_id,
        patient_id: data.patient_id,
        department_id: data.department_id,
        doctor_id: data.doctor_id,
        appointment_date: data.appointment_date,
        appointment_slot: data.appointment_slot,
        appointment_type: data.appointment_type || 'consultation',
        reason: data.reason || null,
        consultation_fee_snapshot: data.consultation_fee_snapshot,
        treatment_id: primaryTreatmentId,
        treatment_details: treatmentDetails,
        booked_by: currentUserId,
        booked_by_type: bookedByType,
        amount_due: Number(data.amount_due) || 0,
        payment_status: 'unpaid',
        status,
      })
      .select()

    if (error) throw error

    return {
      success: true,
      appointment: appointment[0],
      message: 'Appointment booked successfully'
    }
  } catch (error) {
    console.error('Error booking appointment:', error)
    throw error
  }
}

/**
 * The signed-in user, if they are staff at `hospitalId` with the authority to
 * confirm bookings. Every write below runs on the service-role client, which
 * bypasses RLS entirely -- so this check IS the access control. Do not skip it.
 */
async function requireDeskStaff(hospitalId) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const adminClient = await createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, name, role, hospital_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Not signed in' }

  const allowed = ['hospital_admin', 'receptionist', 'reception']
  if (!allowed.includes(profile.role)) {
    return { error: 'You do not have permission to manage booking requests.' }
  }
  if (profile.hospital_id !== hospitalId) {
    return { error: 'That appointment belongs to another hospital.' }
  }

  return { profile, adminClient }
}

/**
 * Every appointment a patient booked for themselves that reception hasn't
 * reviewed yet. This is the reception "Booking Requests" queue.
 */
export async function getPendingBookingRequests(hospitalId) {
  if (!hospitalId) return []

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        hospital_id,
        patient_id,
        department_id,
        doctor_id,
        appointment_date,
        appointment_slot,
        appointment_type,
        reason,
        status,
        payment_status,
        amount_due,
        booked_by_type,
        treatment_details,
        consultation_fee_snapshot,
        created_at,
        patients:patient_id(
          id,
          registration_no,
          profiles:profile_id(id, registration_no, name, email, mobile, gender, blood_group)
        ),
        departments:department_id(id, name)
      `)
      .eq('hospital_id', hospitalId)
      .eq('status', 'pending_confirmation')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Doctor names come from `staff`, which has no FK Supabase can auto-join
    // through here -- same two-step the hospital appointments list uses.
    const requests = data || []
    const doctorIds = [...new Set(requests.map((r) => r.doctor_id).filter(Boolean))]
    if (doctorIds.length === 0) return requests

    const { data: doctors } = await supabase
      .from('staff')
      .select('id, name, specialization, consultation_fee')
      .in('id', doctorIds)

    const doctorMap = Object.fromEntries((doctors || []).map((d) => [d.id, d]))
    return requests.map((r) => ({ ...r, doctor: doctorMap[r.doctor_id] || null }))
  } catch (error) {
    console.error('Error fetching pending booking requests:', error)
    throw error
  }
}

/**
 * Reception/admin approves a patient's booking request: it becomes a real
 * scheduled appointment, and the patient is notified.
 *
 * `amountDue` is what the desk decided to charge (pre-filled in the UI from the
 * doctor's fee + treatment prices, but editable). Payment is optional -- we
 * take no money online, so leaving it at 0 keeps the appointment 'unpaid' and
 * the patient pays at the counter.
 */
export async function confirmPatientAppointment({
  appointmentId,
  amountDue = 0,
  paidAmount = 0,
  paymentMethod = 'cash',
}) {
  try {
    const supabase = await createClient()

    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, hospital_id, patient_id, doctor_id, status, appointment_date, appointment_slot')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return { success: false, error: 'Appointment not found.' }
    }

    const auth = await requireDeskStaff(appointment.hospital_id)
    if (auth.error) return { success: false, error: auth.error }
    const { profile, adminClient } = auth

    // Confirming twice must not double-charge or re-notify.
    if (appointment.status !== 'pending_confirmation') {
      return {
        success: false,
        error: `This request is already ${appointment.status.replace('_', ' ')}.`,
      }
    }

    const due = Math.max(0, Number(amountDue) || 0)
    const paid = Math.min(Math.max(0, Number(paidAmount) || 0), due)

    const paymentStatus =
      paid <= 0 ? 'unpaid' : paid >= due ? 'paid' : 'partially_paid'

    const { error: updateError } = await adminClient
      .from('appointments')
      .update({
        status: 'scheduled',
        amount_due: due,
        payment_status: paymentStatus,
        confirmed_by: profile.id,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      // Guard against two receptionists confirming the same request at once:
      // whoever lands second matches no row and gets the error below.
      .eq('status', 'pending_confirmation')
      .select('id')
      .single()

    if (updateError) {
      return { success: false, error: 'This request was just handled by someone else.' }
    }

    const { hospitalName, doctorName, patientProfileId, patientName } =
      await getAppointmentParties(adminClient, appointment)

    const dateLabel = formatApptDate(appointment.appointment_date)
    const dueLine = due > 0 ? ` ₹${due} is payable at the reception counter.` : ''

    const { notify } = await import('@/actions/notifications')
    await notify({
      recipientId: patientProfileId,
      kind: 'appointment_confirmed',
      title: 'Appointment confirmed',
      body:
        `Your appointment with ${doctorName} at ${hospitalName} on ${dateLabel}` +
        ` at ${appointment.appointment_slot} is confirmed.${dueLine}`,
      link: '/dashboard/patient/appointments',
      entityId: appointmentId,
    })

    revalidatePath('/dashboard/hospital/patient-management')
    revalidatePath('/dashboard/reception/patient-management')

    return {
      success: true,
      message: `Appointment confirmed for ${patientName}.`,
      paymentStatus,
    }
  } catch (error) {
    console.error('Error confirming appointment:', error)
    return { success: false, error: 'Could not confirm the appointment.' }
  }
}

/**
 * Reception/admin declines a patient's booking request. The patient is told
 * why, so they can rebook sensibly.
 */
export async function rejectPatientAppointment({ appointmentId, reason }) {
  try {
    const supabase = await createClient()

    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, hospital_id, patient_id, doctor_id, status, appointment_date, appointment_slot')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      return { success: false, error: 'Appointment not found.' }
    }

    const auth = await requireDeskStaff(appointment.hospital_id)
    if (auth.error) return { success: false, error: auth.error }
    const { profile, adminClient } = auth

    if (appointment.status !== 'pending_confirmation') {
      return {
        success: false,
        error: `This request is already ${appointment.status.replace('_', ' ')}.`,
      }
    }

    const cleanReason = (reason || '').trim() || 'The hospital could not accommodate this request.'

    const { error: updateError } = await adminClient
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: cleanReason,
        confirmed_by: profile.id,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .eq('status', 'pending_confirmation')
      .select('id')
      .single()

    if (updateError) {
      return { success: false, error: 'This request was just handled by someone else.' }
    }

    const { hospitalName, patientProfileId, patientName } =
      await getAppointmentParties(adminClient, appointment)

    const dateLabel = formatApptDate(appointment.appointment_date)

    const { notify } = await import('@/actions/notifications')
    await notify({
      recipientId: patientProfileId,
      kind: 'appointment_cancelled',
      title: 'Appointment request declined',
      body:
        `${hospitalName} could not confirm your appointment on ${dateLabel}` +
        ` at ${appointment.appointment_slot}. Reason: ${cleanReason}`,
      link: '/dashboard/patient/appointments',
      entityId: appointmentId,
    })

    revalidatePath('/dashboard/hospital/patient-management')
    revalidatePath('/dashboard/reception/patient-management')

    return { success: true, message: `Request from ${patientName} declined.` }
  } catch (error) {
    console.error('Error rejecting appointment:', error)
    return { success: false, error: 'Could not decline the request.' }
  }
}

/** Names + the patient's profile id, for notification copy. */
async function getAppointmentParties(adminClient, appointment) {
  const [{ data: hospital }, { data: doctor }, { data: patientLink }] = await Promise.all([
    adminClient
      .from('hospitals')
      .select('name')
      .eq('registration_no', appointment.hospital_id)
      .maybeSingle(),
    appointment.doctor_id
      ? adminClient.from('staff').select('name').eq('id', appointment.doctor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    adminClient
      .from('patients')
      .select('profile_id, profiles:profile_id(name)')
      .eq('id', appointment.patient_id)
      .maybeSingle(),
  ])

  const rawDoctor = doctor?.name || ''
  return {
    hospitalName: hospital?.name || 'the hospital',
    doctorName: rawDoctor
      ? rawDoctor.toLowerCase().startsWith('dr')
        ? rawDoctor
        : `Dr. ${rawDoctor}`
      : 'your doctor',
    patientProfileId: patientLink?.profile_id || null,
    patientName: patientLink?.profiles?.name || 'the patient',
  }
}

function formatApptDate(date) {
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return date
  }
}
