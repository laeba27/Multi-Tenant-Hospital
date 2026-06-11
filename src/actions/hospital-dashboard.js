'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Resolve the signed-in hospital admin + their hospital.
 * profiles.hospital_id stores the hospital's registration_no (text);
 * departments key off the hospital UUID, everything else off registration_no.
 */
async function getHospitalContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, role, hospital_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'hospital_admin') redirect('/dashboard')

  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, registration_no, name')
    .eq('registration_no', profile.hospital_id)
    .single()

  return { supabase, profile, hospital }
}

/**
 * Hospital-wide analytics: staff, patients, appointments and department activity.
 * Mirrors the doctor analytics shape so the views stay consistent.
 */
export async function getHospitalAnalytics() {
  const { supabase, profile, hospital } = await getHospitalContext()

  const empty = {
    hospital: { name: hospital?.name || 'Hospital' },
    totals: { staff: 0, doctors: 0, patients: 0, appointments: 0, departments: 0 },
    staffByRole: [],
    apptByType: [],
    apptByStatus: [],
    byDepartment: [],
    monthly: [],
  }
  if (!hospital?.registration_no) return empty

  const regNo = hospital.registration_no
  const hospitalUuid = hospital.id

  const [staffRes, patientsRes, apptRes, deptRes] = await Promise.all([
    supabase.from('staff').select('id, role').eq('hospital_id', regNo),
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('hospital_id', regNo),
    supabase
      .from('appointments')
      .select('id, appointment_type, status, appointment_date, department_id')
      .eq('hospital_id', regNo),
    supabase.from('departments').select('id, name').eq('hospital_id', hospitalUuid),
  ])

  const staff = staffRes.data || []
  const appts = apptRes.data || []
  const departments = deptRes.data || []

  // Staff breakdown by role.
  const roleCounts = {}
  for (const s of staff) {
    const r = s.role || 'other'
    roleCounts[r] = (roleCounts[r] || 0) + 1
  }

  // Appointment type + status breakdowns.
  const typeCounts = { consultation: 0, treatment: 0, both: 0, other: 0 }
  const statusCounts = {}
  for (const a of appts) {
    const t = (a.appointment_type || 'consultation').toLowerCase()
    if (typeCounts[t] != null) typeCounts[t] += 1
    else typeCounts.other += 1
    const s = a.status || 'scheduled'
    statusCounts[s] = (statusCounts[s] || 0) + 1
  }

  // Appointments per department.
  const deptNames = new Map(departments.map((d) => [d.id, d.name]))
  const deptCounts = {}
  for (const a of appts) {
    if (!a.department_id) continue
    deptCounts[a.department_id] = (deptCounts[a.department_id] || 0) + 1
  }

  // Monthly appointment activity (last 6 months).
  const monthly = lastSixMonths()
  const monthIndex = new Map(monthly.map((m, i) => [m.key, i]))
  for (const a of appts) {
    const key = monthKey(a.appointment_date)
    if (key && monthIndex.has(key)) monthly[monthIndex.get(key)].appointments += 1
  }

  return {
    hospital: { name: hospital.name },
    totals: {
      staff: staff.length,
      doctors: roleCounts.doctor || 0,
      patients: patientsRes.count || 0,
      appointments: appts.length,
      departments: departments.length,
    },
    staffByRole: Object.entries(roleCounts).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
    })),
    apptByType: [
      { name: 'Consultation', value: typeCounts.consultation },
      { name: 'Treatment', value: typeCounts.treatment },
      { name: 'Both', value: typeCounts.both },
      ...(typeCounts.other ? [{ name: 'Other', value: typeCounts.other }] : []),
    ].filter((d) => d.value > 0),
    apptByStatus: Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
    })),
    byDepartment: Object.entries(deptCounts)
      .map(([id, value]) => ({ name: deptNames.get(id) || 'Unknown', value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    monthly,
  }
}

function monthKey(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function lastSixMonths() {
  const out = []
  const now = new Date()
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      appointments: 0,
    })
  }
  return out
}
