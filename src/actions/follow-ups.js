'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  todayInIndia, followUpKey, followUpReminderMessage, FOLLOW_UP_KIND,
} from '@/lib/cron/followUpReminders'
import { requirePermission } from '@/actions/rbac'

/**
 * Follow-ups doctors have asked for, for the Follow-ups screen.
 *
 * Who sees what:
 *   - hospital_admin, receptionist: every follow-up at their hospital
 *   - doctor: only follow-ups from their own prescriptions
 * Scope comes from the session, never from arguments.
 *
 * No clinical content is returned (no summary, no medicines): the list is
 * "who should come back, when, and have they booked", which reception needs
 * whether or not they hold view_prescription.
 *
 * Status for each follow-up, matched against the patient's appointments at
 * the hospital within FOLLOW_UP_MATCH_DAYS of the date:
 *   visited    a completed appointment
 *   booked     an upcoming (scheduled / awaiting confirmation) appointment
 *   overdue    date has passed and nothing was booked
 *   not_booked date is still ahead and nothing is booked yet
 */

const ALLOWED_ROLES = ['hospital_admin', 'receptionist', 'doctor']
const REMINDABLE_STATUSES = ['issued', 'amended']
const FOLLOW_UP_MATCH_DAYS = 3
const MAX_ROWS = 2000
const CHUNK = 200

function shiftDate(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function dayDiff(fromIso, toIso) {
  return Math.round((new Date(`${toIso}T00:00:00Z`) - new Date(`${fromIso}T00:00:00Z`)) / 86400000)
}

/** `in` filters go in the URL, so long id lists are fetched in slices. */
async function selectIn(build, ids) {
  const out = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await build(ids.slice(i, i + CHUNK))
    if (error) throw error
    out.push(...(data || []))
  }
  return out
}

/**
 * Who is asking, from the session: their hospital, and -- for a doctor -- the
 * staff id their prescriptions carry. Every action here is scoped by this.
 */
async function getCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const admin = await createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, hospital_id, registration_no')
    .eq('id', user.id)
    .single()

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return { error: 'You do not have access to follow-ups.' }
  }
  if (!profile.hospital_id) return { error: 'Your account has no hospital.' }

  let doctorStaffId = null
  if (profile.role === 'doctor') {
    const { data: staffRow } = await admin
      .from('staff')
      .select('id')
      .eq('hospital_id', profile.hospital_id)
      .eq('employee_registration_no', profile.registration_no || '')
      .maybeSingle()
    if (!staffRow) return { error: 'Your doctor record was not found.' }
    doctorStaffId = staffRow.id
  }

  return { admin, profile, hospitalId: profile.hospital_id, doctorStaffId }
}

/**
 * The prescriptions behind one follow-up (patient + date) that the caller can
 * see: the whole hospital's for admin/reception, only their own for a doctor.
 */
async function followUpPrescriptions(caller, patientId, followUpDate) {
  let q = caller.admin
    .from('prescriptions')
    .select('id, doctor_id, patient_id, hospital_id, follow_up_date, issued_at')
    .eq('hospital_id', caller.hospitalId)
    .eq('patient_id', patientId)
    .eq('follow_up_date', followUpDate)
    .in('status', REMINDABLE_STATUSES)
    .order('issued_at', { ascending: false, nullsFirst: false })
  if (caller.doctorStaffId) q = q.eq('doctor_id', caller.doctorStaffId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getFollowUps() {
  try {
    const caller = await getCaller()
    if (caller.error) return { success: false, error: caller.error }
    const { admin, profile, hospitalId, doctorStaffId } = caller

    // What this person may do on the page. Hospital admins always may; for
    // everyone else it's the hospital's Roles & Access settings.
    const [editGate, remindGate] = await Promise.all([
      requirePermission('edit_follow_up'),
      requirePermission('send_follow_up_reminder'),
    ])
    const can = { edit: editGate.allowed, remind: remindGate.allowed }

    let query = admin
      .from('prescriptions')
      .select('id, patient_id, doctor_id, follow_up_date, issued_at, created_at, appointment_id')
      .eq('hospital_id', hospitalId)
      .in('status', REMINDABLE_STATUSES)
      .not('follow_up_date', 'is', null)
      .order('follow_up_date', { ascending: true })
      .order('issued_at', { ascending: false, nullsFirst: false })
      .limit(MAX_ROWS)
    if (doctorStaffId) query = query.eq('doctor_id', doctorStaffId)

    const { data: prescriptions, error } = await query
    if (error) throw error

    const today = todayInIndia()
    const base = {
      success: true,
      role: profile.role,
      can,
      today,
      matchDays: FOLLOW_UP_MATCH_DAYS,
      truncated: (prescriptions?.length || 0) >= MAX_ROWS,
    }
    if (!prescriptions?.length) return { ...base, followUps: [], doctors: [] }

    // One row per patient + date, as the reminder job does: two prescriptions
    // that both say "come back on the 14th" are one follow-up. The newest
    // prescription (first, by the order above) names the doctor.
    const groups = new Map()
    for (const rx of prescriptions) {
      const key = followUpKey(rx.patient_id, rx.follow_up_date)
      if (!groups.has(key)) groups.set(key, rx)
    }
    const rows = [...groups.entries()]

    const patientIds = [...new Set(rows.map(([, rx]) => rx.patient_id))]
    const doctorIds = [...new Set(rows.map(([, rx]) => rx.doctor_id).filter(Boolean))]
    const keys = rows.map(([key]) => key)
    const dates = rows.map(([, rx]) => rx.follow_up_date).sort()
    const apptFrom = shiftDate(dates[0], -FOLLOW_UP_MATCH_DAYS)
    const apptTo = shiftDate(dates[dates.length - 1], FOLLOW_UP_MATCH_DAYS)

    const [patients, doctors, appointments, reminders] = await Promise.all([
      selectIn((ids) => admin
        .from('patients')
        .select('id, registration_no, profile:profiles!profile_id(name, mobile)')
        .in('id', ids), patientIds),
      selectIn((ids) => admin.from('staff').select('id, name').in('id', ids), doctorIds),
      selectIn((ids) => admin
        .from('appointments')
        .select('id, patient_id, appointment_date, appointment_slot, status')
        .eq('hospital_id', hospitalId)
        .in('patient_id', ids)
        .gte('appointment_date', apptFrom)
        .lte('appointment_date', apptTo)
        .neq('status', 'cancelled'), patientIds),
      selectIn((ids) => admin
        .from('notifications')
        .select('entity_id, entity_type, created_at')
        .eq('kind', FOLLOW_UP_KIND)
        .in('entity_id', ids), keys),
    ])

    const patientById = Object.fromEntries(patients.map((p) => [p.id, p]))
    const doctorById = Object.fromEntries(doctors.map((d) => [d.id, d]))
    // Latest reminder per follow-up, automatic or sent by hand.
    const reminderByKey = {}
    for (const n of reminders) {
      if (!reminderByKey[n.entity_id] || n.created_at > reminderByKey[n.entity_id]) {
        reminderByKey[n.entity_id] = n.created_at
      }
    }
    const apptsByPatient = {}
    for (const a of appointments) (apptsByPatient[a.patient_id] ||= []).push(a)

    const followUps = rows.map(([key, rx]) => {
      const date = rx.follow_up_date
      const patient = patientById[rx.patient_id]
      const daysAway = dayDiff(today, date)

      // The appointment that answers this follow-up: closest to the date
      // within the window, and never the visit that produced the prescription.
      const candidates = (apptsByPatient[rx.patient_id] || [])
        .filter((a) => a.id !== rx.appointment_id)
        .filter((a) => Math.abs(dayDiff(date, a.appointment_date)) <= FOLLOW_UP_MATCH_DAYS)
        .sort((a, b) =>
          Math.abs(dayDiff(date, a.appointment_date)) - Math.abs(dayDiff(date, b.appointment_date)))
      const appt = candidates[0] || null

      let status
      if (appt && appt.status === 'completed') status = 'visited'
      else if (appt && appt.status !== 'no-show' && appt.status !== 'no_show') status = 'booked'
      else status = daysAway < 0 ? 'overdue' : 'not_booked'

      return {
        key,
        followUpDate: date,
        daysAway,
        status,
        patient: {
          id: rx.patient_id,
          registrationNo: patient?.registration_no || rx.patient_id,
          name: patient?.profile?.name?.trim() || 'Unknown patient',
          mobile: patient?.profile?.mobile || null,
        },
        doctor: rx.doctor_id
          ? { id: rx.doctor_id, name: doctorById[rx.doctor_id]?.name?.trim() || 'Unknown doctor' }
          : null,
        prescribedOn: (rx.issued_at || rx.created_at || '').slice(0, 10) || null,
        appointment: appt
          ? { id: appt.id, date: appt.appointment_date, slot: appt.appointment_slot, status: appt.status }
          : null,
        reminderSentAt: reminderByKey[key] || null,
      }
    })

    const doctorOptions = doctors
      .map((d) => ({ id: d.id, name: d.name?.trim() || 'Unknown doctor' }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return { ...base, followUps, doctors: doctorOptions }
  } catch (error) {
    console.error('getFollowUps failed:', error)
    return { success: false, error: error.message || 'Failed to load follow-ups' }
  }
}

/**
 * Change (or remove) a follow-up date. Needs edit_follow_up -- doctors by
 * default, hospital admins always. A doctor only changes their own
 * prescriptions; admin changes every prescription behind that follow-up.
 *
 * @param {{ patientId: string, followUpDate: string, newDate: string|null }} input
 *   newDate null removes the follow-up.
 */
export async function updateFollowUpDate({ patientId, followUpDate, newDate }) {
  try {
    const gate = await requirePermission('edit_follow_up')
    if (!gate.allowed) return { success: false, error: 'You are not allowed to edit follow-ups.' }

    const caller = await getCaller()
    if (caller.error) return { success: false, error: caller.error }

    const today = todayInIndia()
    if (newDate !== null) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(newDate || ''))) {
        return { success: false, error: 'Choose a valid date.' }
      }
      if (newDate < today) return { success: false, error: 'The follow-up date cannot be in the past.' }
      if (newDate === followUpDate) return { success: false, error: 'That is already the follow-up date.' }
    }

    const rxs = await followUpPrescriptions(caller, patientId, followUpDate)
    if (rxs.length === 0) return { success: false, error: 'Follow-up not found.' }

    const { error } = await caller.admin
      .from('prescriptions')
      .update({ follow_up_date: newDate, updated_at: new Date().toISOString() })
      .in('id', rxs.map((r) => r.id))
    if (error) throw error

    return {
      success: true,
      message: newDate ? 'Follow-up date updated.' : 'Follow-up removed.',
    }
  } catch (error) {
    console.error('updateFollowUpDate failed:', error)
    return { success: false, error: 'Could not update the follow-up.' }
  }
}

const MANUAL_REMINDER_GAP_MS = 60 * 60 * 1000

/**
 * Send the patient an in-app reminder about a follow-up, now. Needs
 * send_follow_up_reminder -- reception by default, hospital admins always.
 * Limited to one per follow-up per hour so a double-click or two staff
 * members don't flood the patient.
 */
export async function sendFollowUpReminder({ patientId, followUpDate }) {
  try {
    const gate = await requirePermission('send_follow_up_reminder')
    if (!gate.allowed) return { success: false, error: 'You are not allowed to send follow-up reminders.' }

    const caller = await getCaller()
    if (caller.error) return { success: false, error: caller.error }
    const { admin, hospitalId } = caller

    const rxs = await followUpPrescriptions(caller, patientId, followUpDate)
    if (rxs.length === 0) return { success: false, error: 'Follow-up not found.' }
    const rx = rxs[0]

    const key = followUpKey(patientId, followUpDate)
    const { data: recent } = await admin
      .from('notifications')
      .select('created_at')
      .eq('kind', FOLLOW_UP_KIND)
      .eq('entity_id', key)
      .gte('created_at', new Date(Date.now() - MANUAL_REMINDER_GAP_MS).toISOString())
      .limit(1)
    if (recent?.length) {
      return { success: false, error: 'A reminder was sent for this follow-up within the last hour.' }
    }

    const [patientRes, doctorRes, hospitalRes, apptRes] = await Promise.all([
      admin.from('patients').select('profile_id, is_active').eq('id', patientId).maybeSingle(),
      rx.doctor_id
        ? admin.from('staff').select('name').eq('id', rx.doctor_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from('hospitals').select('name').eq('registration_no', hospitalId).maybeSingle(),
      admin
        .from('appointments')
        .select('appointment_date, appointment_slot, status')
        .eq('hospital_id', hospitalId)
        .eq('patient_id', patientId)
        .gte('appointment_date', shiftDate(followUpDate, -FOLLOW_UP_MATCH_DAYS))
        .lte('appointment_date', shiftDate(followUpDate, FOLLOW_UP_MATCH_DAYS))
        .gte('appointment_date', todayInIndia())
        .neq('status', 'cancelled')
        .order('appointment_date', { ascending: true })
        .limit(1),
    ])

    if (!patientRes.data?.profile_id) {
      return { success: false, error: 'This patient has no portal account to notify.' }
    }

    const { error } = await admin.from('notifications').insert({
      recipient_id: patientRes.data.profile_id,
      hospital_id: hospitalId,
      kind: FOLLOW_UP_KIND,
      ...followUpReminderMessage({
        doctorName: doctorRes.data?.name,
        hospitalName: hospitalRes.data?.name,
        followUpDate,
        today: todayInIndia(),
        booked: apptRes.data?.[0] || null,
      }),
      entity_type: 'follow_up_manual',
      entity_id: key,
    })
    if (error) {
      // The notification type is added by migration 034.
      if (/notifications_kind_check/.test(error.message || '')) {
        return { success: false, error: 'Reminders are not enabled yet: the database update for them has not been applied.' }
      }
      throw error
    }

    return { success: true, message: 'Reminder sent to the patient.' }
  } catch (error) {
    console.error('sendFollowUpReminder failed:', error)
    return { success: false, error: 'Could not send the reminder.' }
  }
}
