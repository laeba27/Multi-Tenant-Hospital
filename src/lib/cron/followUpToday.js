/**
 * Follow-up day notifications, run once a day at ~12 AM IST by the cron route
 * (src/app/api/cron/daily), right after the two-days-ahead reminders.
 *
 * For every follow-up due TODAY (issued/amended prescriptions whose
 * follow_up_date is today, India time):
 *   - the patient gets "your follow-up is today", with a link to the
 *     dashboard where they answer whether they're coming
 *   - each doctor gets one summary: how many of their patients are due
 *   - each receptionist at the hospital gets one summary: how many are due,
 *     per doctor
 *
 * Everything is sent at most once per day: the code checks what was already
 * sent, and the unique indexes from migration 037 guarantee it even if two
 * runs overlap. Takes the service-role client, like followUpReminders.js.
 */

import { todayInIndia, followUpKey } from '@/lib/cron/followUpReminders'

export const FOLLOW_UP_TODAY_KIND = 'follow_up_today'
export const FOLLOW_UP_DIGEST_KIND = 'follow_up_digest'
const REMINDABLE_STATUSES = ['issued', 'amended']
const NAMES_IN_SUMMARY = 5

const byId = (rows, key = 'id') => Object.fromEntries((rows || []).map((r) => [r[key], r]))
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export function doctorLabel(name) {
  const n = String(name || '').trim().replace(/^dr\.?\s+/i, '')
  return n ? `Dr. ${n}` : 'Unknown doctor'
}

/** "Asha, Ravi, Meena and 2 more" */
function nameList(names) {
  const shown = names.slice(0, NAMES_IN_SUMMARY)
  const rest = names.length - shown.length
  return rest > 0 ? `${shown.join(', ')} and ${rest} more` : shown.join(', ')
}

/** "2 coming, 1 not coming, 3 no reply" -- only the parts that aren't zero. */
export function responseSummary(items) {
  const coming = items.filter((i) => i.response === 'coming').length
  const notComing = items.filter((i) => i.response === 'not_coming').length
  const noReply = items.length - coming - notComing
  return [
    coming && `${coming} coming`,
    notComing && `${notComing} not coming`,
    noReply && `${noReply} no reply yet`,
  ].filter(Boolean).join(', ')
}

/**
 * @param {object} supabase  service-role Supabase client
 * @param {object} [opts]
 * @param {Date}   [opts.now]     defaults to the current time
 * @param {boolean}[opts.dryRun]  work everything out but write nothing
 */
export async function sendFollowUpDayNotifications(supabase, { now = new Date(), dryRun = false } = {}) {
  const today = todayInIndia(now)
  const summary = {
    today,
    followUps: 0,
    patients: { sent: 0, alreadySent: 0, skipped: [] },
    doctors: { sent: 0, alreadySent: 0, skipped: [] },
    reception: { sent: 0, alreadySent: 0 },
    failed: [],
    preview: [],
  }

  const { data: prescriptions, error } = await supabase
    .from('prescriptions')
    .select('id, hospital_id, patient_id, doctor_id, follow_up_date, issued_at')
    .in('status', REMINDABLE_STATUSES)
    .eq('follow_up_date', today)
    .order('issued_at', { ascending: false, nullsFirst: false })
  if (error) throw new Error(`Could not read prescriptions: ${error.message}`)
  if (!prescriptions?.length) return summary

  // One follow-up per patient record + date; the newest prescription names
  // the doctor (same rule as the reminder job and the Follow-ups page).
  const groups = new Map()
  for (const rx of prescriptions) {
    const key = followUpKey(rx.patient_id, rx.follow_up_date)
    if (!groups.has(key)) groups.set(key, rx)
  }
  summary.followUps = groups.size

  const patientIds = [...new Set([...groups.values()].map((r) => r.patient_id))]
  const doctorIds = [...new Set([...groups.values()].map((r) => r.doctor_id).filter(Boolean))]
  const hospitalIds = [...new Set([...groups.values()].map((r) => r.hospital_id))]

  const [patientsRes, doctorsRes, hospitalsRes, responsesRes, apptsRes, receptionRes] = await Promise.all([
    supabase.from('patients').select('id, profile_id, is_active, profile:profiles!profile_id(name)').in('id', patientIds),
    doctorIds.length
      ? supabase.from('staff').select('id, name, hospital_id, employee_registration_no').in('id', doctorIds)
      : Promise.resolve({ data: [] }),
    supabase.from('hospitals').select('registration_no, name').in('registration_no', hospitalIds),
    supabase.from('follow_up_responses').select('patient_id, response').in('patient_id', patientIds).eq('follow_up_date', today),
    supabase
      .from('appointments')
      .select('patient_id, appointment_slot, status')
      .in('patient_id', patientIds)
      .eq('appointment_date', today)
      .neq('status', 'cancelled'),
    supabase.from('profiles').select('id, hospital_id').eq('role', 'receptionist').in('hospital_id', hospitalIds),
  ])
  for (const [name, res] of Object.entries({
    patients: patientsRes, doctors: doctorsRes, hospitals: hospitalsRes,
    responses: responsesRes, appointments: apptsRes, receptionists: receptionRes,
  })) {
    if (res.error) throw new Error(`Could not read ${name}: ${res.error.message}`)
  }

  const patients = byId(patientsRes.data)
  const doctors = byId(doctorsRes.data)
  const hospitals = byId(hospitalsRes.data, 'registration_no')
  const responses = byId(responsesRes.data, 'patient_id')
  const apptByPatient = byId(apptsRes.data, 'patient_id')

  // Doctors' logins: staff.employee_registration_no = profiles.registration_no.
  const regNos = (doctorsRes.data || []).map((d) => d.employee_registration_no).filter(Boolean)
  const { data: doctorProfiles, error: dpError } = regNos.length
    ? await supabase.from('profiles').select('id, registration_no').in('registration_no', regNos)
    : { data: [] }
  if (dpError) throw new Error(`Could not read doctor profiles: ${dpError.message}`)
  const profileIdByRegNo = Object.fromEntries((doctorProfiles || []).map((p) => [p.registration_no, p.id]))

  // Everything this run could send, keyed by its once-a-day entity_id.
  const outgoing = []

  const items = [...groups.entries()].map(([key, rx]) => ({
    key,
    rx,
    patientName: patients[rx.patient_id]?.profile?.name?.trim() || rx.patient_id,
    doctorName: doctors[rx.doctor_id]?.name,
    response: responses[rx.patient_id]?.response || null,
  }))

  // 1. Patients
  for (const item of items) {
    const { key, rx } = item
    const patient = patients[rx.patient_id]
    if (!patient?.profile_id) { summary.patients.skipped.push({ key, reason: 'patient has no account' }); continue }
    if (patient.is_active === false) { summary.patients.skipped.push({ key, reason: 'patient record inactive' }); continue }
    if (item.response === 'not_coming') { summary.patients.skipped.push({ key, reason: 'patient said not coming' }); continue }

    const appt = apptByPatient[rx.patient_id]
    const hospital = String(hospitals[rx.hospital_id]?.name || '').trim() || 'the hospital'
    const parts = [`${item.doctorName ? doctorLabel(item.doctorName) : 'Your doctor'} asked to see you again today at ${hospital}.`]
    if (appt) parts.push(`You're booked${appt.appointment_slot ? ` for ${appt.appointment_slot}` : ''}.`)
    if (!item.response) parts.push("Let us know if you're coming.")

    outgoing.push({
      group: 'patients',
      row: {
        recipient_id: patient.profile_id,
        hospital_id: rx.hospital_id,
        kind: FOLLOW_UP_TODAY_KIND,
        title: 'Your follow-up visit is today',
        body: parts.join(' '),
        link: '/dashboard/patient',
        entity_type: 'follow_up',
        entity_id: key,
      },
    })
  }

  // 2. Doctors: one summary each.
  const byDoctor = new Map()
  for (const item of items) {
    if (!item.rx.doctor_id) continue
    if (!byDoctor.has(item.rx.doctor_id)) byDoctor.set(item.rx.doctor_id, [])
    byDoctor.get(item.rx.doctor_id).push(item)
  }
  for (const [doctorId, list] of byDoctor) {
    const doctor = doctors[doctorId]
    const profileId = profileIdByRegNo[doctor?.employee_registration_no]
    if (!profileId) { summary.doctors.skipped.push({ doctorId, reason: 'doctor has no login' }); continue }
    outgoing.push({
      group: 'doctors',
      row: {
        recipient_id: profileId,
        hospital_id: doctor.hospital_id,
        kind: FOLLOW_UP_DIGEST_KIND,
        title: `${plural(list.length, 'follow-up')} today`,
        body: `Patients: ${nameList(list.map((i) => i.patientName))}. ${responseSummary(list)}.`,
        link: '/dashboard/doctor/follow-ups?range=today',
        entity_type: 'follow_up_digest',
        entity_id: `${profileId}:${today}`,
      },
    })
  }

  // 3. Reception: one summary per receptionist, broken down by doctor.
  for (const hospitalId of hospitalIds) {
    const list = items.filter((i) => i.rx.hospital_id === hospitalId)
    const perDoctor = new Map()
    for (const i of list) {
      const label = i.rx.doctor_id ? doctorLabel(i.doctorName) : 'No doctor'
      perDoctor.set(label, (perDoctor.get(label) || 0) + 1)
    }
    const breakdown = [...perDoctor.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, n]) => `${label}: ${n}`)
      .join(' · ')

    for (const r of (receptionRes.data || []).filter((p) => p.hospital_id === hospitalId)) {
      outgoing.push({
        group: 'reception',
        row: {
          recipient_id: r.id,
          hospital_id: hospitalId,
          kind: FOLLOW_UP_DIGEST_KIND,
          title: `${plural(list.length, 'follow-up')} today`,
          body: `${breakdown}. ${responseSummary(list)}.`,
          link: '/dashboard/reception/follow-ups?range=today',
          entity_type: 'follow_up_digest',
          entity_id: `${r.id}:${today}`,
        },
      })
    }
  }

  if (!outgoing.length) return summary

  const { data: sentRows, error: sentError } = await supabase
    .from('notifications')
    .select('entity_id')
    .in('kind', [FOLLOW_UP_TODAY_KIND, FOLLOW_UP_DIGEST_KIND])
    .in('entity_id', outgoing.map((o) => o.row.entity_id))
  if (sentError) throw new Error(`Could not read notifications: ${sentError.message}`)
  const alreadySent = new Set((sentRows || []).map((n) => n.entity_id))

  for (const { group, row } of outgoing) {
    if (alreadySent.has(row.entity_id)) { summary[group].alreadySent++; continue }
    if (dryRun) { summary.preview.push(row); continue }

    // One insert per row so a single failure doesn't sink the batch.
    const { error: insertError } = await supabase.from('notifications').insert(row)
    if (!insertError) summary[group].sent++
    else if (insertError.code === '23505') summary[group].alreadySent++
    else summary.failed.push({ entity_id: row.entity_id, error: insertError.message })
  }

  return summary
}
