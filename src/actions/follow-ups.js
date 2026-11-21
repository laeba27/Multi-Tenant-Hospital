'use server'

// The service-role client: createAdminClient() runs as the signed-in user
// (see lib/supabase/server.js), and follow_up_responses has no RLS policies.
// Every query here is scoped by the caller's hospital / doctor / patient ids.
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import {
  todayInIndia, followUpKey, followUpReminderMessage, FOLLOW_UP_KIND,
} from '@/lib/cron/followUpReminders'
import { requirePermission } from '@/actions/rbac'
import { notify } from '@/actions/notifications'

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

  const admin = createServiceRoleClient()
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

/**
 * @param {object} [opts]
 * @param {string} [opts.date]  only follow-ups on this date (YYYY-MM-DD) --
 *   the dashboards ask for today's
 */
export async function getFollowUps({ date = null } = {}) {
  try {
    if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return { success: false, error: 'Invalid date' }
    }
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
    if (date) query = query.eq('follow_up_date', date)

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

    const [patients, doctors, appointments, reminders, responses] = await Promise.all([
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
      // The patient's own "coming / not coming" answer (migration 037).
      selectIn((ids) => admin
        .from('follow_up_responses')
        .select('patient_id, follow_up_date, response, note, responded_at')
        .in('patient_id', ids)
        .gte('follow_up_date', dates[0])
        .lte('follow_up_date', dates[dates.length - 1]), patientIds),
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
    const responseByKey = Object.fromEntries(
      responses.map((r) => [followUpKey(r.patient_id, r.follow_up_date), r]))
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
        // 'coming' | 'not_coming' | null (no answer yet)
        response: responseByKey[key]
          ? {
              value: responseByKey[key].response,
              note: responseByKey[key].note || null,
              at: responseByKey[key].responded_at,
            }
          : null,
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

// ---------------------------------------------------------------------------
// Today's follow-ups, for the doctor and reception dashboards
// ---------------------------------------------------------------------------

/**
 * Today's follow-ups for the signed-in doctor (their own) or receptionist /
 * hospital admin (the whole hospital), with a per-doctor breakdown and how
 * many patients said they're coming.
 */
export async function getTodayFollowUps() {
  const res = await getFollowUps({ date: todayInIndia() })
  if (!res.success) return res

  const tally = (list) => ({
    total: list.length,
    coming: list.filter((f) => f.response?.value === 'coming').length,
    notComing: list.filter((f) => f.response?.value === 'not_coming').length,
    noReply: list.filter((f) => !f.response).length,
    visited: list.filter((f) => f.status === 'visited').length,
  })

  const byDoctorMap = new Map()
  for (const f of res.followUps) {
    const id = f.doctor?.id || 'none'
    if (!byDoctorMap.has(id)) byDoctorMap.set(id, { doctor: f.doctor, items: [] })
    byDoctorMap.get(id).items.push(f)
  }
  const byDoctor = [...byDoctorMap.values()]
    .map(({ doctor, items }) => ({ doctor, ...tally(items) }))
    .sort((a, b) => b.total - a.total || (a.doctor?.name || '').localeCompare(b.doctor?.name || ''))

  return {
    success: true,
    role: res.role,
    today: res.today,
    totals: tally(res.followUps),
    byDoctor,
    items: [...res.followUps].sort((a, b) => a.patient.name.localeCompare(b.patient.name)),
  }
}

// ---------------------------------------------------------------------------
// The patient's side: see upcoming follow-ups and say whether they're coming
// ---------------------------------------------------------------------------

const PATIENT_FOLLOW_UP_DAYS = 14
const RESPONSES = ['coming', 'not_coming']
const NOTE_MAX = 200

/** The signed-in patient's patient-record ids (one per hospital). */
async function getMyPatientIds() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }
  const admin = createServiceRoleClient()
  const { data: links, error } = await admin.from('patients').select('id').eq('profile_id', user.id)
  if (error) throw error
  return { admin, userId: user.id, patientIds: (links || []).map((l) => l.id) }
}

/**
 * Follow-ups from today up to two weeks ahead, with the answer the patient
 * gave (if any). Overdue ones aren't listed: there's nothing left to answer.
 */
export async function getMyFollowUps() {
  try {
    const me = await getMyPatientIds()
    if (me.error) return { success: false, error: me.error }
    const today = todayInIndia()
    if (!me.patientIds.length) return { success: true, today, followUps: [] }
    const { admin, patientIds } = me

    const { data: rxs, error } = await admin
      .from('prescriptions')
      .select('patient_id, hospital_id, doctor_id, follow_up_date, issued_at')
      .in('patient_id', patientIds)
      .in('status', REMINDABLE_STATUSES)
      .gte('follow_up_date', today)
      .lte('follow_up_date', shiftDate(today, PATIENT_FOLLOW_UP_DAYS))
      .order('follow_up_date', { ascending: true })
      .order('issued_at', { ascending: false, nullsFirst: false })
    if (error) throw error
    if (!rxs?.length) return { success: true, today, followUps: [] }

    const groups = new Map()
    for (const rx of rxs) {
      const key = followUpKey(rx.patient_id, rx.follow_up_date)
      if (!groups.has(key)) groups.set(key, rx)
    }
    const rows = [...groups.entries()]
    const doctorIds = [...new Set(rows.map(([, r]) => r.doctor_id).filter(Boolean))]
    const hospitalIds = [...new Set(rows.map(([, r]) => r.hospital_id))]

    const [doctorsRes, hospitalsRes, responsesRes, apptsRes] = await Promise.all([
      doctorIds.length
        ? admin.from('staff').select('id, name').in('id', doctorIds)
        : Promise.resolve({ data: [] }),
      admin.from('hospitals').select('registration_no, name').in('registration_no', hospitalIds),
      admin
        .from('follow_up_responses')
        .select('patient_id, follow_up_date, response, note')
        .in('patient_id', patientIds)
        .gte('follow_up_date', today),
      admin
        .from('appointments')
        .select('patient_id, appointment_date, appointment_slot, status')
        .in('patient_id', patientIds)
        .gte('appointment_date', shiftDate(today, -FOLLOW_UP_MATCH_DAYS))
        .lte('appointment_date', shiftDate(today, PATIENT_FOLLOW_UP_DAYS + FOLLOW_UP_MATCH_DAYS))
        .neq('status', 'cancelled'),
    ])
    for (const r of [doctorsRes, hospitalsRes, responsesRes, apptsRes]) if (r.error) throw r.error

    const doctorName = Object.fromEntries((doctorsRes.data || []).map((d) => [d.id, d.name?.trim()]))
    const hospitalName = Object.fromEntries((hospitalsRes.data || []).map((h) => [h.registration_no, h.name?.trim()]))
    const responseByKey = Object.fromEntries(
      (responsesRes.data || []).map((r) => [followUpKey(r.patient_id, r.follow_up_date), r]))

    const followUps = rows.map(([key, rx]) => {
      // A booking on (or within a few days of) the date answers the follow-up.
      const appt = (apptsRes.data || [])
        .filter((a) => a.patient_id === rx.patient_id)
        .filter((a) => Math.abs(dayDiff(rx.follow_up_date, a.appointment_date)) <= FOLLOW_UP_MATCH_DAYS)
        .sort((a, b) =>
          Math.abs(dayDiff(rx.follow_up_date, a.appointment_date)) - Math.abs(dayDiff(rx.follow_up_date, b.appointment_date)))[0]
      return {
        key,
        patientId: rx.patient_id,
        followUpDate: rx.follow_up_date,
        daysAway: dayDiff(today, rx.follow_up_date),
        doctorName: doctorName[rx.doctor_id] || null,
        hospitalName: hospitalName[rx.hospital_id] || null,
        appointment: appt
          ? { date: appt.appointment_date, slot: appt.appointment_slot, status: appt.status }
          : null,
        response: responseByKey[key]?.response || null,
        note: responseByKey[key]?.note || null,
      }
    })

    return { success: true, today, followUps }
  } catch (error) {
    console.error('getMyFollowUps failed:', error)
    return { success: false, error: 'Could not load your follow-ups.' }
  }
}

/**
 * The patient answers "are you coming to your follow-up?". They can change
 * the answer until the day is over. The doctor and the reception desk are
 * told whenever the answer changes.
 *
 * @param {{ patientId: string, followUpDate: string, response: 'coming'|'not_coming', note?: string }} input
 */
export async function respondToFollowUp({ patientId, followUpDate, response, note = '' }) {
  try {
    if (!RESPONSES.includes(response)) return { success: false, error: 'Choose coming or not coming.' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(followUpDate || ''))) return { success: false, error: 'Invalid date.' }
    const today = todayInIndia()
    if (followUpDate < today) return { success: false, error: 'This follow-up date has passed.' }

    const me = await getMyPatientIds()
    if (me.error) return { success: false, error: me.error }
    const { admin, userId, patientIds } = me
    if (!patientIds.includes(patientId)) return { success: false, error: 'Follow-up not found.' }

    // There must really be a follow-up on that date for this patient record.
    const { data: rxs, error: rxError } = await admin
      .from('prescriptions')
      .select('hospital_id, doctor_id, issued_at')
      .eq('patient_id', patientId)
      .eq('follow_up_date', followUpDate)
      .in('status', REMINDABLE_STATUSES)
      .order('issued_at', { ascending: false, nullsFirst: false })
      .limit(1)
    if (rxError) throw rxError
    const rx = rxs?.[0]
    if (!rx) return { success: false, error: 'Follow-up not found.' }

    const cleanNote = String(note || '').trim().slice(0, NOTE_MAX) || null

    const { data: previous } = await admin
      .from('follow_up_responses')
      .select('response')
      .eq('patient_id', patientId)
      .eq('follow_up_date', followUpDate)
      .maybeSingle()

    const { error } = await admin.from('follow_up_responses').upsert({
      hospital_id: rx.hospital_id,
      patient_id: patientId,
      follow_up_date: followUpDate,
      response,
      note: response === 'not_coming' ? cleanNote : null,
      responded_by: userId,
      responded_at: new Date().toISOString(),
    }, { onConflict: 'patient_id,follow_up_date' })
    if (error) {
      if (/follow_up_responses/.test(error.message || '') && /(does not exist|schema cache)/.test(error.message || '')) {
        return { success: false, error: 'Follow-up answers are not enabled yet: the database update for them has not been applied.' }
      }
      throw error
    }

    // Tell the doctor and the desk -- only when the answer actually changed.
    if (previous?.response !== response) {
      await notifyFollowUpResponse(admin, { patientId, followUpDate, response, note: cleanNote, rx, today })
    }

    return {
      success: true,
      message: response === 'coming'
        ? "Thanks, we've let the hospital know you're coming."
        : "Thanks, we've let the hospital know you can't make it.",
    }
  } catch (error) {
    console.error('respondToFollowUp failed:', error)
    return { success: false, error: 'Could not save your answer.' }
  }
}

async function notifyFollowUpResponse(admin, { patientId, followUpDate, response, note, rx, today }) {
  const [{ data: patient }, { data: doctor }] = await Promise.all([
    admin.from('patients').select('profile:profiles!profile_id(name)').eq('id', patientId).maybeSingle(),
    rx.doctor_id
      ? admin.from('staff').select('employee_registration_no').eq('id', rx.doctor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const name = patient?.profile?.name?.trim() || patientId
  const days = dayDiff(today, followUpDate)
  const when = days === 0
    ? 'today'
    : days === 1
      ? 'tomorrow'
      : `on ${new Date(`${followUpDate}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}`
  const title = response === 'coming'
    ? `${name} is coming for the follow-up ${when}`
    : `${name} can't come for the follow-up ${when}`
  const body = response === 'not_coming' && note ? `Reason: ${note}` : null
  const base = {
    hospitalId: rx.hospital_id,
    kind: 'follow_up_response',
    title,
    body,
    entityType: 'follow_up_response',
    entityId: followUpKey(patientId, followUpDate),
  }

  const sends = [
    notify({ ...base, recipientRole: 'receptionist', link: '/dashboard/reception/follow-ups?range=today' }),
  ]
  if (doctor?.employee_registration_no) {
    const { data: doctorProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('registration_no', doctor.employee_registration_no)
      .maybeSingle()
    if (doctorProfile?.id) {
      sends.push(notify({ ...base, recipientId: doctorProfile.id, link: '/dashboard/doctor/follow-ups?range=today' }))
    }
  }
  await Promise.all(sends)
}
