'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

function todayBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    todayISO: start.toISOString().slice(0, 10),
    monthStartISO: monthStart.toISOString(),
  }
}

/**
 * Top-line stats + recent patients + latest notices for the doctor dashboard.
 */
export async function getDoctorDashboard() {
  const { supabase, profile, doctorRecord } = await getDoctorContext()
  const empty = {
    doctor: { name: profile.name },
    stats: { todayPatients: 0, pending: 0, totalPatients: 0, prescriptionsThisMonth: 0 },
    recentPatients: [],
    notices: [],
  }
  if (!doctorRecord?.id) return empty

  const { todayISO, monthStartISO } = todayBounds()

  const [apptRes, prescriptionRes, noticesRes] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id, patient_id, appointment_date, appointment_slot, appointment_type, status, reason,
        patients:patient_id ( id, registration_no, profile:profiles!profile_id ( name, avatar_url ) ),
        prescriptions:prescriptions!appointment_id ( id, status )
      `)
      .eq('doctor_id', doctorRecord.id)
      .order('appointment_date', { ascending: false }),
    supabase
      .from('prescriptions')
      .select('id, created_at, status')
      .eq('doctor_id', doctorRecord.id)
      .gte('created_at', monthStartISO),
    // Notices table may not exist yet; fail soft to an empty list.
    supabase
      .from('notices')
      .select('id, title, body, category, is_pinned, published_at')
      .eq('hospital_id', doctorRecord.hospital_id)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(4),
  ])

  const appts = apptRes.data || []
  const uniquePatients = new Set()
  let todayPatients = 0
  let pending = 0

  for (const a of appts) {
    if (a.patient_id) uniquePatients.add(a.patient_id)
    if (a.appointment_date === todayISO) todayPatients += 1
    const rx = Array.isArray(a.prescriptions) ? a.prescriptions : []
    const hasRx = rx.some((r) => r.status !== 'cancelled')
    if (!hasRx && a.status !== 'cancelled' && a.status !== 'completed') pending += 1
  }

  const recentPatients = []
  const seen = new Set()
  for (const a of appts) {
    const pr = a.patients
    if (!pr || seen.has(pr.id)) continue
    seen.add(pr.id)
    recentPatients.push({
      id: pr.id,
      registrationNo: pr.registration_no || '',
      name: pr.profile?.name || 'Unknown patient',
      lastVisit: a.appointment_date,
      reason: a.reason || '',
      type: a.appointment_type || 'consultation',
    })
    if (recentPatients.length >= 6) break
  }

  return {
    doctor: { name: profile.name, specialization: doctorRecord.specialization },
    stats: {
      todayPatients,
      pending,
      totalPatients: uniquePatients.size,
      prescriptionsThisMonth: (prescriptionRes.data || []).filter((p) => p.status !== 'cancelled').length,
    },
    recentPatients,
    notices: noticesRes.data || [],
  }
}

/**
 * The notices at this doctor's hospital that are ADDRESSED TO THEM.
 *
 * No audience filter here on purpose: the RLS policy on `notices` (migration
 * 031) matches audience_roles against the caller's role, so a notice sent to
 * pharmacists simply isn't returned. Before 031 this selected the old scalar
 * `audience` column and ignored it, so doctors saw every notice at the hospital
 * regardless of who it was for.
 */
export async function getHospitalNotices() {
  const { supabase, doctorRecord } = await getDoctorContext()
  if (!doctorRecord?.hospital_id) return []

  const { data, error } = await supabase
    .from('notices')
    .select('id, title, body, category, audience_roles, is_pinned, published_at, expires_at')
    .eq('hospital_id', doctorRecord.hospital_id)
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching notices:', error)
    return []
  }
  return data || []
}

/**
 * Analytics for the doctor + hospital-level staffing context.
 */
export async function getDoctorAnalytics() {
  const { supabase, profile, doctorRecord } = await getDoctorContext()
  const empty = {
    doctor: { name: profile.name },
    totals: { patients: 0, appointments: 0, prescriptions: 0, consultations: 0, treatments: 0, both: 0 },
    byType: [],
    byStatus: [],
    monthly: [],
    hospital: { doctors: 0, totalStaff: 0, departments: 0, byRole: [] },
  }
  if (!doctorRecord?.id) return empty

  const [apptRes, prescriptionRes, staffRes, deptRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, patient_id, appointment_type, status, appointment_date')
      .eq('doctor_id', doctorRecord.id),
    supabase
      .from('prescriptions')
      .select('id, created_at, status')
      .eq('doctor_id', doctorRecord.id),
    supabase
      .from('staff')
      .select('id, role')
      .eq('hospital_id', doctorRecord.hospital_id),
    supabase
      .from('departments')
      .select('id')
      .eq('hospital_id', doctorRecord.hospital_id),
  ])

  const appts = apptRes.data || []
  const prescriptions = prescriptionRes.data || []
  const staff = staffRes.data || []

  // Appointment type breakdown.
  const typeCounts = { consultation: 0, treatment: 0, both: 0, other: 0 }
  const statusCounts = {}
  const patients = new Set()
  for (const a of appts) {
    if (a.patient_id) patients.add(a.patient_id)
    const t = (a.appointment_type || 'consultation').toLowerCase()
    if (typeCounts[t] != null) typeCounts[t] += 1
    else typeCounts.other += 1
    const s = a.status || 'scheduled'
    statusCounts[s] = (statusCounts[s] || 0) + 1
  }

  // Monthly appointments + prescriptions for the last 6 months.
  const monthly = lastSixMonths()
  const monthIndex = new Map(monthly.map((m, i) => [m.key, i]))
  for (const a of appts) {
    const key = monthKey(a.appointment_date)
    if (key && monthIndex.has(key)) monthly[monthIndex.get(key)].appointments += 1
  }
  for (const p of prescriptions) {
    const key = monthKey(p.created_at)
    if (key && monthIndex.has(key)) monthly[monthIndex.get(key)].prescriptions += 1
  }

  // Hospital staffing by role.
  const roleCounts = {}
  for (const s of staff) {
    const r = s.role || 'other'
    roleCounts[r] = (roleCounts[r] || 0) + 1
  }

  return {
    doctor: { name: profile.name, specialization: doctorRecord.specialization },
    totals: {
      patients: patients.size,
      appointments: appts.length,
      prescriptions: prescriptions.filter((p) => p.status !== 'cancelled').length,
      consultations: typeCounts.consultation,
      treatments: typeCounts.treatment,
      both: typeCounts.both,
    },
    byType: [
      { name: 'Consultation', value: typeCounts.consultation },
      { name: 'Treatment', value: typeCounts.treatment },
      { name: 'Both', value: typeCounts.both },
      ...(typeCounts.other ? [{ name: 'Other', value: typeCounts.other }] : []),
    ].filter((d) => d.value > 0),
    byStatus: Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
    })),
    monthly,
    hospital: {
      doctors: roleCounts.doctor || 0,
      totalStaff: staff.length,
      departments: (deptRes.data || []).length,
      byRole: Object.entries(roleCounts).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
      })),
    },
  }
}

function monthKey(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function lastSixMonths() {
  // Built from the current date; safe in a server action (not a workflow).
  const out = []
  const now = new Date()
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      appointments: 0,
      prescriptions: 0,
    })
  }
  return out
}
