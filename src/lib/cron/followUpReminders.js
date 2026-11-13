/**
 * Follow-up reminders: tell a patient, two days ahead, that their doctor asked
 * to see them again.
 *
 * Run once a day by the cron route (src/app/api/cron/daily). Takes the
 * Supabase client as an argument (it must be the service-role client -- this
 * reads every hospital's prescriptions and writes notifications for patients),
 * so it can also be run from a script.
 *
 * Which follow-ups get a reminder: prescriptions that are issued or amended
 * (never drafts or cancelled ones) whose follow_up_date is 1 or 2 days away,
 * in India time. Including "tomorrow" means a missed or late cron run still
 * reminds people, and so does a follow-up booked at short notice. Each patient
 * record is reminded once per follow-up date -- the code checks, and the
 * unique index from migration 034 guarantees it even if two runs overlap.
 */

export const FOLLOW_UP_KIND = 'follow_up_reminder'
const REMINDABLE_STATUSES = ['issued', 'amended']
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000

/** Today's date in India as YYYY-MM-DD, whatever the server's timezone. */
export function todayInIndia(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(fromIso, toIso) {
  return Math.round((new Date(`${toIso}T00:00:00Z`) - new Date(`${fromIso}T00:00:00Z`)) / 86400000)
}

function prettyDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })
}

/**
 * Title, body and link of a follow-up reminder -- shared by the nightly job and
 * the "Remind" button on the Follow-ups page so patients get one wording.
 */
export function followUpReminderMessage({ doctorName, hospitalName, followUpDate, today, booked = null }) {
  const days = daysBetween(today, followUpDate)
  const when =
    days === 0 ? 'today' : days === 1 ? 'tomorrow' : days > 1 ? `in ${days} days` : `was due ${prettyDate(followUpDate)}`
  const name = String(doctorName || '').trim()
  const doctor = name ? `Dr. ${name.replace(/^dr\.?\s+/i, '')}` : 'Your doctor'
  const hospital = String(hospitalName || '').trim() || 'the hospital'
  const date = prettyDate(followUpDate)
  const asked = days >= 0
    ? `${doctor} asked to see you again on ${date} at ${hospital}.`
    : `${doctor} asked to see you again on ${date} at ${hospital}, and that date has passed.`

  return {
    title: `Follow-up visit ${when}`,
    body: booked
      ? `${asked} You're booked${booked.appointment_slot ? ` for ${booked.appointment_slot}` : ''}${booked.appointment_date && booked.appointment_date !== followUpDate ? ` on ${prettyDate(booked.appointment_date)}` : ''}. See you then.`
      : `${asked} Please book your visit${days >= 0 ? " if you haven't yet" : ' as soon as you can'}.`,
    link: booked ? '/dashboard/patient/appointments' : '/dashboard/patient/book',
  }
}

/** Stable per patient record + date, so the unique index can dedupe. */
export function followUpKey(patientId, followUpDate) {
  return `${patientId}:${followUpDate}`
}

const byId = (rows, key = 'id') => Object.fromEntries((rows || []).map((r) => [r[key], r]))

/**
 * @param {object} supabase  service-role Supabase client
 * @param {object} [opts]
 * @param {Date}   [opts.now]        defaults to the current time
 * @param {number} [opts.daysAhead]  how far ahead to remind (default 2)
 * @param {boolean}[opts.dryRun]     work everything out but write nothing
 */
export async function sendFollowUpReminders(supabase, { now = new Date(), daysAhead = 2, dryRun = false } = {}) {
  const today = todayInIndia(now)
  const from = addDays(today, 1)
  const to = addDays(today, daysAhead)
  const summary = { today, window: { from, to }, candidates: 0, sent: 0, alreadySent: 0, skipped: [], failed: [], preview: [] }

  const { data: prescriptions, error } = await supabase
    .from('prescriptions')
    .select('id, hospital_id, patient_id, doctor_id, follow_up_date, issued_at, created_at')
    .in('status', REMINDABLE_STATUSES)
    .gte('follow_up_date', from)
    .lte('follow_up_date', to)
    .order('issued_at', { ascending: false, nullsFirst: false })
  if (error) throw new Error(`Could not read prescriptions: ${error.message}`)
  if (!prescriptions?.length) return summary

  // Several prescriptions can point at the same follow-up (e.g. two visits
  // that both said "come back on the 14th"). One reminder covers them; the
  // newest prescription's doctor is named.
  const groups = new Map()
  for (const rx of prescriptions) {
    const key = followUpKey(rx.patient_id, rx.follow_up_date)
    if (!groups.has(key)) groups.set(key, rx)
  }
  summary.candidates = groups.size

  const patientIds = [...new Set(prescriptions.map((p) => p.patient_id))]
  const doctorIds = [...new Set(prescriptions.map((p) => p.doctor_id).filter(Boolean))]
  const hospitalIds = [...new Set(prescriptions.map((p) => p.hospital_id))]
  const keys = [...groups.keys()]

  const [patientsRes, doctorsRes, hospitalsRes, sentRes, apptsRes] = await Promise.all([
    supabase.from('patients').select('id, profile_id, is_active').in('id', patientIds),
    doctorIds.length
      ? supabase.from('staff').select('id, name').in('id', doctorIds)
      : Promise.resolve({ data: [] }),
    supabase.from('hospitals').select('registration_no, name').in('registration_no', hospitalIds),
    // Only automatic reminders count: a reminder reception sent by hand days
    // earlier shouldn't stop the two-days-before one.
    supabase.from('notifications').select('entity_id').eq('kind', FOLLOW_UP_KIND).eq('entity_type', 'follow_up').in('entity_id', keys),
    // A follow-up the patient has already booked gets a "see you then"
    // reminder with the time, instead of being told to book.
    supabase
      .from('appointments')
      .select('patient_id, appointment_date, appointment_slot, status')
      .in('patient_id', patientIds)
      .gte('appointment_date', from)
      .lte('appointment_date', to)
      .neq('status', 'cancelled'),
  ])
  for (const [name, res] of Object.entries({ patients: patientsRes, doctors: doctorsRes, hospitals: hospitalsRes, notifications: sentRes, appointments: apptsRes })) {
    if (res.error) throw new Error(`Could not read ${name}: ${res.error.message}`)
  }

  const patients = byId(patientsRes.data)
  const doctors = byId(doctorsRes.data)
  const hospitals = byId(hospitalsRes.data, 'registration_no')
  const alreadySent = new Set((sentRes.data || []).map((n) => n.entity_id))
  const bookedOn = new Map()
  for (const a of apptsRes.data || []) {
    const k = followUpKey(a.patient_id, a.appointment_date)
    if (!bookedOn.has(k)) bookedOn.set(k, a)
  }

  for (const [key, rx] of groups) {
    if (alreadySent.has(key)) { summary.alreadySent++; continue }

    const patient = patients[rx.patient_id]
    if (!patient?.profile_id) {
      // No login to notify -- e.g. a walk-in registered without an account.
      summary.skipped.push({ key, reason: 'patient has no account' })
      continue
    }
    if (patient.is_active === false) {
      summary.skipped.push({ key, reason: 'patient record inactive' })
      continue
    }

    const notification = {
      recipient_id: patient.profile_id,
      hospital_id: rx.hospital_id,
      kind: FOLLOW_UP_KIND,
      ...followUpReminderMessage({
        doctorName: doctors[rx.doctor_id]?.name,
        hospitalName: hospitals[rx.hospital_id]?.name,
        followUpDate: rx.follow_up_date,
        today,
        booked: bookedOn.get(key),
      }),
      entity_type: 'follow_up',
      entity_id: key,
    }

    if (dryRun) { summary.preview.push(notification); continue }

    // One insert per reminder so a single bad row (or a duplicate caught by
    // the unique index) doesn't sink the rest of the batch.
    const { error: insertError } = await supabase.from('notifications').insert(notification)
    if (!insertError) summary.sent++
    else if (insertError.code === '23505') summary.alreadySent++
    else summary.failed.push({ key, error: insertError.message })
  }

  return summary
}
