'use server'

/**
 * Super-admin views across every hospital:
 *   - subscriptions: what each hospital pays for the portal, and who is paid
 *     up, due or overdue (tables from migration 039)
 *   - analytics: which hospitals are most / least active
 *   - activity log: a timeline of what happened, where and by whom
 *
 * Every action checks the caller is a super admin first, then reads with the
 * service role (RLS would otherwise apply to the signed-in user -- see
 * createServiceRoleClient).
 */

import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { todayInIndia } from '@/lib/cron/followUpReminders'
import {
  BILLING_CYCLES,
  periodFor,
  subscriptionStanding,
  monthlyValue,
} from '@/lib/finance/subscriptions'

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'card', 'upi', 'other']
const PLAN_STATUSES = ['active', 'paused', 'cancelled']
const DAY = 86400000

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'super_admin') throw new Error('Only super admins can do this')
  return { profile, svc: createServiceRoleClient() }
}

const fail = (e) => ({ success: false, error: e?.message || 'Something went wrong' })
const must = (res, what) => {
  if (res.error) throw new Error(`Could not read ${what}: ${res.error.message}`)
  return res.data || []
}
/** Some timestamp columns have no time zone; they're stored in UTC. */
const toIso = (v) => {
  if (!v) return null
  const s = String(v)
  return /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? new Date(s).toISOString() : new Date(`${s.replace(' ', 'T')}Z`).toISOString()
}
const byKey = (rows, key = 'id') => Object.fromEntries((rows || []).map((r) => [r[key], r]))

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */

export async function getSubscriptionsOverview() {
  try {
    const { svc } = await requireSuperAdmin()
    const today = todayInIndia()

    const [hospitals, plans, payments, admins] = await Promise.all([
      svc.from('hospitals').select('registration_no, name, city, account_status, email, created_at').order('name').then((r) => must(r, 'hospitals')),
      svc.from('hospital_subscriptions').select('*').then((r) => must(r, 'subscriptions')),
      svc.from('subscription_payments').select('*').order('paid_on', { ascending: false }).then((r) => must(r, 'subscription payments')),
      svc.from('profiles').select('id, name, email, hospital_id').eq('role', 'hospital_admin').then((r) => must(r, 'hospital admins')),
    ])

    const recorderIds = [...new Set(payments.map((p) => p.recorded_by).filter(Boolean))]
    const recorders = recorderIds.length
      ? byKey(must(await svc.from('profiles').select('id, name').in('id', recorderIds), 'profiles'))
      : {}

    const planBy = byKey(plans, 'hospital_id')
    const adminBy = byKey(admins, 'hospital_id')
    const paymentsBy = {}
    for (const p of payments) (paymentsBy[p.hospital_id] ||= []).push(p)

    const rows = hospitals.map((h) => {
      const plan = planBy[h.registration_no] || null
      const list = paymentsBy[h.registration_no] || []
      return {
        hospitalId: h.registration_no,
        name: String(h.name || '').trim() || h.registration_no,
        city: h.city || '',
        accountStatus: h.account_status || '',
        contact: adminBy[h.registration_no]?.email || h.email || '',
        plan,
        standing: subscriptionStanding(plan, list, today),
        payments: list.map((p) => ({ ...p, recorded_by_name: recorders[p.recorded_by]?.name || null })),
      }
    })

    const monthStart = `${today.slice(0, 7)}-01`
    const collectedThisMonth = payments
      .filter((p) => String(p.paid_on) >= monthStart && String(p.paid_on) <= today)
      .reduce((s, p) => s + Number(p.amount || 0), 0)
    const count = (st) => rows.filter((r) => r.standing.status === st).length

    return {
      success: true,
      today,
      summary: {
        expectedMonthly: Math.round(plans.reduce((s, p) => s + monthlyValue(p), 0)),
        collectedThisMonth,
        collectedAllTime: payments.reduce((s, p) => s + Number(p.amount || 0), 0),
        outstanding: rows.reduce((s, r) => s + r.standing.amountOwed, 0),
        paid: count('paid'),
        due: count('due'),
        overdue: count('overdue'),
        noPlan: count('no_plan'),
        inactive: count('paused') + count('cancelled'),
      },
      rows,
    }
  } catch (e) {
    return fail(e)
  }
}

export async function saveHospitalSubscription(input) {
  try {
    const { profile, svc } = await requireSuperAdmin()
    const hospitalId = String(input?.hospitalId || '').trim()
    if (!hospitalId) throw new Error('Choose a hospital')
    const amount = Number(input.amount)
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter a valid plan fee')
    if (!BILLING_CYCLES[input.billingCycle]) throw new Error('Choose a billing cycle')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.startDate || ''))) throw new Error('Choose a start date')
    const grace = Number.isInteger(Number(input.graceDays)) ? Number(input.graceDays) : 7
    if (grace < 0 || grace > 90) throw new Error('Grace days must be between 0 and 90')

    const { error } = await svc.from('hospital_subscriptions').upsert(
      {
        hospital_id: hospitalId,
        plan_name: String(input.planName || '').trim() || 'Standard',
        amount,
        billing_cycle: input.billingCycle,
        start_date: input.startDate,
        grace_days: grace,
        status: PLAN_STATUSES.includes(input.status) ? input.status : 'active',
        notes: String(input.notes || '').trim() || null,
        created_by: profile.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'hospital_id' }
    )
    if (error) throw error
    revalidatePath('/dashboard/super-admin/payments')
    return { success: true }
  } catch (e) {
    return fail(e)
  }
}

/**
 * Record a payment. By default it covers the next unpaid period(s): `cycles`
 * billing cycles starting the day after the hospital is currently paid to.
 */
export async function recordSubscriptionPayment(input) {
  try {
    const { profile, svc } = await requireSuperAdmin()
    const hospitalId = String(input?.hospitalId || '').trim()
    const amount = Number(input?.amount)
    if (!hospitalId) throw new Error('Choose a hospital')
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter the amount received')

    const { data: plan, error: planError } = await svc
      .from('hospital_subscriptions').select('*').eq('hospital_id', hospitalId).maybeSingle()
    if (planError) throw planError
    if (!plan) throw new Error('Set a plan for this hospital first')

    let { periodStart, periodEnd } = input
    if (!periodStart || !periodEnd) {
      const { data: existing, error: payError } = await svc
        .from('subscription_payments').select('amount, period_end, paid_on').eq('hospital_id', hospitalId)
      if (payError) throw payError
      const standing = subscriptionStanding(plan, existing || [], todayInIndia())
      const cycles = Math.min(Math.max(parseInt(input.cycles, 10) || 1, 1), 24)
      const p = periodFor(standing.nextDue, plan.billing_cycle, cycles)
      periodStart = p.start
      periodEnd = p.end
    }
    if (periodEnd < periodStart) throw new Error('The period ends before it starts')

    const { error } = await svc.from('subscription_payments').insert({
      hospital_id: hospitalId,
      amount,
      period_start: periodStart,
      period_end: periodEnd,
      paid_on: /^\d{4}-\d{2}-\d{2}$/.test(String(input.paidOn || '')) ? input.paidOn : todayInIndia(),
      payment_method: PAYMENT_METHODS.includes(input.paymentMethod) ? input.paymentMethod : null,
      reference: String(input.reference || '').trim() || null,
      notes: String(input.notes || '').trim() || null,
      recorded_by: profile.id,
    })
    if (error) throw error
    revalidatePath('/dashboard/super-admin/payments')
    return { success: true, periodStart, periodEnd }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteSubscriptionPayment(id) {
  try {
    const { svc } = await requireSuperAdmin()
    if (!id) throw new Error('Missing payment')
    const { error } = await svc.from('subscription_payments').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/dashboard/super-admin/payments')
    return { success: true }
  } catch (e) {
    return fail(e)
  }
}

/* ------------------------------------------------------------------ */
/* Events: shared by the analytics and the activity log                */
/* ------------------------------------------------------------------ */

// Not exported: a 'use server' file may only export async functions.
const ACTIVITY_TYPES = {
  appointment_booked: 'Appointment booked',
  appointment_cancelled: 'Appointment cancelled',
  patient_registered: 'Patient registered',
  prescription_issued: 'Prescription issued',
  invoice_raised: 'Invoice raised',
  payment_received: 'Patient payment',
  ledger_entry: 'Finance entry',
  staff_added: 'Staff added',
  issue_reported: 'Issue reported',
  hospital_registered: 'Hospital registered',
  subscription_payment: 'Subscription payment',
}

/**
 * Every event since `sinceIso`, newest first, with names resolved. The tables
 * are small enough today to read the window in full; if they grow into the
 * hundreds of thousands this should move into a SQL view or RPC.
 */
async function loadEvents(svc, sinceIso) {
  const sinceDate = sinceIso.slice(0, 10)
  const [hospitals, appts, patients, rxs, invoices, pays, ledger, staffAdded, issues, subPays] = await Promise.all([
    svc.from('hospitals').select('registration_no, name, created_at').then((r) => must(r, 'hospitals')),
    svc.from('appointments')
      .select('id, hospital_id, patient_id, doctor_id, appointment_date, appointment_slot, appointment_type, status, booked_by, booked_by_type, created_at, updated_at, cancellation_reason')
      .or(`created_at.gte."${sinceIso}",and(status.eq.cancelled,updated_at.gte."${sinceIso}")`)
      .then((r) => must(r, 'appointments')),
    svc.from('patients').select('id, hospital_id, profile_id, registered_by, created_at').gte('created_at', sinceIso).then((r) => must(r, 'patients')),
    svc.from('prescriptions').select('id, hospital_id, patient_id, doctor_id, status, issued_at').in('status', ['issued', 'amended']).gte('issued_at', sinceIso).then((r) => must(r, 'prescriptions')),
    svc.from('invoices').select('id, hospital_id, patient_id, total_amount, payment_status, created_by, created_at').gte('created_at', sinceIso).then((r) => must(r, 'invoices')),
    svc.from('invoice_payments').select('id, invoice_id, hospital_id, amount, payment_method, created_by, paid_at').gte('paid_at', sinceIso).then((r) => must(r, 'payments')),
    svc.from('finance_transactions').select('id, hospital_id, direction, category, party, amount, created_by, created_at').gte('created_at', sinceIso).then((r) => must(r, 'finance entries')),
    svc.from('staff').select('id, hospital_id, name, role, created_at').gte('created_at', sinceIso).then((r) => must(r, 'staff')),
    svc.from('issues').select('id, hospital_id, title, priority, raised_by, created_at').gte('created_at', sinceIso).then((r) => must(r, 'issues')),
    svc.from('subscription_payments').select('id, hospital_id, amount, period_start, period_end, recorded_by, created_at').gte('created_at', sinceIso).then((r) => must(r, 'subscription payments')),
  ])

  // Names: patients (via their profile), doctors (staff), and actors (profiles).
  const patientIds = [...new Set([...appts, ...rxs, ...invoices].map((x) => x.patient_id).filter(Boolean))]
  const invoiceIdsForPays = [...new Set(pays.map((p) => p.invoice_id))]
  const [patientRows, payInvoices] = await Promise.all([
    patientIds.length
      ? svc.from('patients').select('id, profile:profiles!profile_id(name)').in('id', patientIds).then((r) => must(r, 'patient names'))
      : [],
    invoiceIdsForPays.length
      ? svc.from('invoices').select('id, patient_id').in('id', invoiceIdsForPays).then((r) => must(r, 'invoices'))
      : [],
  ])
  const morePatientIds = payInvoices.map((i) => i.patient_id).filter((id) => id && !patientIds.includes(id))
  const morePatients = morePatientIds.length
    ? must(await svc.from('patients').select('id, profile:profiles!profile_id(name)').in('id', morePatientIds), 'patient names')
    : []
  const patientName = Object.fromEntries([...patientRows, ...morePatients].map((p) => [p.id, p.profile?.name?.trim() || p.id]))
  const invoicePatient = Object.fromEntries(payInvoices.map((i) => [i.id, i.patient_id]))

  const doctorIds = [...new Set([...appts, ...rxs].map((x) => x.doctor_id).filter(Boolean))]
  const doctors = doctorIds.length ? byKey(must(await svc.from('staff').select('id, name').in('id', doctorIds), 'doctors')) : {}
  const dr = (id) => {
    const n = String(doctors[id]?.name || '').trim().replace(/^dr\.?\s+/i, '')
    return n ? `Dr. ${n}` : null
  }

  const actorIds = [...new Set([
    ...appts.map((a) => a.booked_by), ...patients.map((p) => p.registered_by), ...patients.map((p) => p.profile_id),
    ...invoices.map((i) => i.created_by), ...pays.map((p) => p.created_by), ...ledger.map((l) => l.created_by),
    ...issues.map((i) => i.raised_by), ...subPays.map((s) => s.recorded_by),
  ].filter(Boolean))]
  const actors = actorIds.length ? byKey(must(await svc.from('profiles').select('id, name, role').in('id', actorIds), 'profiles')) : {}
  const who = (id) => (id && actors[id] ? { name: String(actors[id].name || '').trim() || 'Someone', role: actors[id].role || null } : null)

  const hospitalName = Object.fromEntries(hospitals.map((h) => [h.registration_no, String(h.name || '').trim() || h.registration_no]))
  const events = []
  const push = (e) => { if (e.at && e.at >= sinceIso) events.push({ ...e, hospitalName: hospitalName[e.hospitalId] || e.hospitalId || 'Platform' }) }
  const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

  for (const h of hospitals) {
    push({ id: `h:${h.registration_no}`, type: 'hospital_registered', at: toIso(h.created_at), hospitalId: h.registration_no, title: 'Hospital registered on the portal', actor: null })
  }
  for (const a of appts) {
    const p = patientName[a.patient_id] || 'A patient'
    const when = [a.appointment_date, a.appointment_slot].filter(Boolean).join(' ')
    if (toIso(a.created_at) >= sinceIso) {
      push({
        id: `a:${a.id}`, type: 'appointment_booked', at: toIso(a.created_at), hospitalId: a.hospital_id,
        title: `${p} booked${dr(a.doctor_id) ? ` with ${dr(a.doctor_id)}` : ''}`,
        detail: [when && `For ${when}`, a.booked_by_type && `via ${a.booked_by_type}`].filter(Boolean).join(' · '),
        actor: who(a.booked_by),
      })
    }
    if (a.status === 'cancelled' && a.updated_at) {
      push({
        id: `ac:${a.id}`, type: 'appointment_cancelled', at: toIso(a.updated_at), hospitalId: a.hospital_id,
        title: `${p}'s appointment cancelled`, detail: [when, a.cancellation_reason].filter(Boolean).join(' · '), actor: null,
      })
    }
  }
  for (const p of patients) {
    push({
      id: `p:${p.id}`, type: 'patient_registered', at: toIso(p.created_at), hospitalId: p.hospital_id,
      title: `${String(actors[p.profile_id]?.name || '').trim() || 'A patient'} registered`, detail: p.id, actor: who(p.registered_by),
    })
  }
  for (const r of rxs) {
    push({
      id: `rx:${r.id}`, type: 'prescription_issued', at: toIso(r.issued_at), hospitalId: r.hospital_id,
      title: `Prescription for ${patientName[r.patient_id] || 'a patient'}`, detail: r.status === 'amended' ? 'Amended' : null,
      actor: dr(r.doctor_id) ? { name: dr(r.doctor_id), role: 'doctor' } : null,
    })
  }
  for (const i of invoices) {
    push({
      id: `inv:${i.id}`, type: 'invoice_raised', at: toIso(i.created_at), hospitalId: i.hospital_id,
      title: `Invoice ${i.id} for ${patientName[i.patient_id] || 'a patient'}`, detail: `${money(i.total_amount)} · ${String(i.payment_status || '').replace('_', ' ')}`,
      amount: Number(i.total_amount || 0), actor: who(i.created_by),
    })
  }
  for (const p of pays) {
    push({
      id: `pay:${p.id}`, type: 'payment_received', at: toIso(p.paid_at), hospitalId: p.hospital_id,
      title: `${money(p.amount)} received from ${patientName[invoicePatient[p.invoice_id]] || 'a patient'}`,
      detail: [p.payment_method && p.payment_method.toUpperCase(), `Invoice ${p.invoice_id}`].filter(Boolean).join(' · '),
      amount: Number(p.amount || 0), actor: who(p.created_by),
    })
  }
  for (const l of ledger) {
    push({
      id: `fin:${l.id}`, type: 'ledger_entry', at: toIso(l.created_at), hospitalId: l.hospital_id,
      title: `${l.direction === 'outgoing' ? 'Paid out' : 'Received'} ${money(l.amount)} · ${l.category}`,
      detail: l.party || null, amount: Number(l.amount || 0) * (l.direction === 'outgoing' ? -1 : 1), actor: who(l.created_by),
    })
  }
  for (const s of staffAdded) {
    push({ id: `st:${s.id}`, type: 'staff_added', at: toIso(s.created_at), hospitalId: s.hospital_id, title: `${s.name || 'Staff member'} joined`, detail: s.role || null, actor: null })
  }
  for (const i of issues) {
    push({ id: `is:${i.id}`, type: 'issue_reported', at: toIso(i.created_at), hospitalId: i.hospital_id, title: i.title || 'Issue reported', detail: i.priority ? `${i.priority} priority` : null, actor: who(i.raised_by) })
  }
  for (const s of subPays) {
    push({
      id: `sub:${s.id}`, type: 'subscription_payment', at: toIso(s.created_at), hospitalId: s.hospital_id,
      title: `Subscription payment ${money(s.amount)}`, detail: `Covers ${s.period_start} to ${s.period_end}`, amount: Number(s.amount || 0), actor: who(s.recorded_by),
    })
  }

  events.sort((a, b) => b.at.localeCompare(a.at))
  return { events, hospitals, hospitalName, sinceDate }
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

const ACTIVITY_WEIGHTS = {
  appointment_booked: 1, patient_registered: 1, prescription_issued: 1,
  invoice_raised: 1, payment_received: 1, staff_added: 1, ledger_entry: 1,
}

function bucketKey(iso, mode) {
  const d = iso.slice(0, 10)
  if (mode === 'day') return d
  if (mode === 'month') return d.slice(0, 7)
  // week: the Monday of that week
  const dt = new Date(`${d}T00:00:00Z`)
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7))
  return dt.toISOString().slice(0, 10)
}

export async function getPlatformAnalytics({ days = 30 } = {}) {
  try {
    const { svc } = await requireSuperAdmin()
    const range = Math.min(Math.max(parseInt(days, 10) || 30, 7), 365)
    const now = Date.now()
    const sinceIso = new Date(now - range * DAY).toISOString()
    // A longer look-back so "last active" means something even for hospitals
    // that were quiet during the chosen range.
    const lookbackIso = new Date(now - Math.max(range, 180) * DAY).toISOString()

    const [{ events, hospitals }, staff, patientsAll, admins, plans, subPays] = await Promise.all([
      loadEvents(svc, lookbackIso),
      svc.from('staff').select('hospital_id, role, is_active').then((r) => must(r, 'staff')),
      svc.from('patients').select('hospital_id').then((r) => must(r, 'patients')),
      svc.from('profiles').select('id, hospital_id, name').eq('role', 'hospital_admin').then((r) => must(r, 'hospital admins')),
      svc.from('hospital_subscriptions').select('*').then((r) => must(r, 'subscriptions')),
      svc.from('subscription_payments').select('hospital_id, amount, period_end, paid_on').then((r) => must(r, 'subscription payments')),
    ])

    // Hospital admins' last sign-in, from Supabase Auth.
    const lastSignIn = {}
    try {
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) break
        for (const u of data?.users || []) lastSignIn[u.id] = u.last_sign_in_at || null
        if ((data?.users || []).length < 1000) break
      }
    } catch { /* sign-in times are a nice-to-have */ }

    const today = todayInIndia()
    const planBy = byKey(plans, 'hospital_id')
    const subPaysBy = {}
    for (const p of subPays) (subPaysBy[p.hospital_id] ||= []).push(p)

    const inRange = events.filter((e) => e.at >= sinceIso)
    const per = Object.fromEntries(hospitals.map((h) => [h.registration_no, {
      hospitalId: h.registration_no,
      name: String(h.name || '').trim() || h.registration_no,
      appointments: 0, cancelled: 0, newPatients: 0, prescriptions: 0, invoices: 0,
      payments: 0, collected: 0, billed: 0, score: 0, lastActivity: null,
      staff: 0, doctors: 0, patients: 0, adminLastSignIn: null,
    }]))

    for (const e of events) {
      const row = per[e.hospitalId]
      if (!row || e.type === 'hospital_registered' || e.type === 'subscription_payment') continue
      if (!row.lastActivity || e.at > row.lastActivity) row.lastActivity = e.at
    }
    for (const e of inRange) {
      const row = per[e.hospitalId]
      if (!row) continue
      if (e.type === 'appointment_booked') row.appointments++
      if (e.type === 'appointment_cancelled') row.cancelled++
      if (e.type === 'patient_registered') row.newPatients++
      if (e.type === 'prescription_issued') row.prescriptions++
      if (e.type === 'invoice_raised') { row.invoices++; row.billed += e.amount || 0 }
      if (e.type === 'payment_received') { row.payments++; row.collected += e.amount || 0 }
      row.score += ACTIVITY_WEIGHTS[e.type] || 0
    }
    for (const s of staff) {
      const row = per[s.hospital_id]
      if (!row || s.is_active === false) continue
      row.staff++
      if (s.role === 'doctor') row.doctors++
    }
    for (const p of patientsAll) if (per[p.hospital_id]) per[p.hospital_id].patients++
    for (const a of admins) {
      const row = per[a.hospital_id]
      if (!row) continue
      const t = lastSignIn[a.id]
      if (t && (!row.adminLastSignIn || t > row.adminLastSignIn)) row.adminLastSignIn = t
    }

    const rows = Object.values(per).map((r) => ({
      ...r,
      subscription: subscriptionStanding(planBy[r.hospitalId] || null, subPaysBy[r.hospitalId] || [], today).status,
    })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))

    // Platform trend over the range.
    const mode = range <= 31 ? 'day' : range <= 120 ? 'week' : 'month'
    const buckets = new Map()
    const startMs = now - range * DAY
    for (let t = startMs; t <= now; t += DAY) {
      const k = bucketKey(new Date(t).toISOString(), mode)
      if (!buckets.has(k)) buckets.set(k, { key: k, appointments: 0, prescriptions: 0, patients: 0, payments: 0, collected: 0 })
    }
    for (const e of inRange) {
      const b = buckets.get(bucketKey(e.at, mode))
      if (!b) continue
      if (e.type === 'appointment_booked') b.appointments++
      if (e.type === 'prescription_issued') b.prescriptions++
      if (e.type === 'patient_registered') b.patients++
      if (e.type === 'payment_received') { b.payments++; b.collected += e.amount || 0 }
    }

    const totals = rows.reduce((t, r) => ({
      appointments: t.appointments + r.appointments,
      newPatients: t.newPatients + r.newPatients,
      prescriptions: t.prescriptions + r.prescriptions,
      collected: t.collected + r.collected,
      billed: t.billed + r.billed,
    }), { appointments: 0, newPatients: 0, prescriptions: 0, collected: 0, billed: 0 })

    return {
      success: true,
      range,
      mode,
      totals: {
        ...totals,
        hospitals: rows.length,
        activeHospitals: rows.filter((r) => r.score > 0).length,
        quietHospitals: rows.filter((r) => r.score === 0).length,
      },
      rows,
      trend: [...buckets.values()],
      byType: Object.entries(
        inRange.reduce((m, e) => ({ ...m, [e.type]: (m[e.type] || 0) + 1 }), {})
      ).map(([type, count]) => ({ type, label: ACTIVITY_TYPES[type] || type, count })).sort((a, b) => b.count - a.count),
    }
  } catch (e) {
    return fail(e)
  }
}

/* ------------------------------------------------------------------ */
/* Activity log                                                        */
/* ------------------------------------------------------------------ */

export async function getActivityLog({ days = 7, hospitalId = '', type = '', limit = 300 } = {}) {
  try {
    const { svc } = await requireSuperAdmin()
    const range = Math.min(Math.max(parseInt(days, 10) || 7, 1), 365)
    const sinceIso = new Date(Date.now() - range * DAY).toISOString()
    const { events, hospitals } = await loadEvents(svc, sinceIso)
    const filtered = events.filter((e) => (!hospitalId || e.hospitalId === hospitalId) && (!type || e.type === type))
    const cap = Math.min(Math.max(parseInt(limit, 10) || 300, 50), 2000)
    return {
      success: true,
      range,
      total: filtered.length,
      events: filtered.slice(0, cap),
      hospitals: hospitals
        .map((h) => ({ id: h.registration_no, name: String(h.name || '').trim() || h.registration_no }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      types: Object.entries(ACTIVITY_TYPES).map(([value, label]) => ({ value, label })),
    }
  } catch (e) {
    return fail(e)
  }
}
