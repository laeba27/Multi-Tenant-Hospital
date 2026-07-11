'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Staff Shift & Slot Management.
 *
 * The schedule a hospital admin configures here is what the booking screens
 * read: working days, shift hours, break, block length, and how many patients
 * fit in one block. Plus leave/holidays, which close a diary outright.
 */

/** The signed-in user, if they may manage schedules at `hospitalId`. */
async function requireScheduleAdmin(hospitalId) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const adminClient = await createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role, hospital_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Not signed in' }
  if (profile.role === 'super_admin') return { profile, adminClient }
  if (profile.role !== 'hospital_admin') {
    return { error: 'Only a hospital administrator can manage schedules.' }
  }
  if (hospitalId && profile.hospital_id !== hospitalId) {
    return { error: 'That hospital is not yours.' }
  }
  return { profile, adminClient }
}

/**
 * Every staff member's schedule at a hospital, doctors first (they're the ones
 * whose schedule drives booking).
 */
export async function getStaffSchedules(hospitalId) {
  const auth = await requireScheduleAdmin(hospitalId)
  if (auth.error) return { success: false, error: auth.error, staff: [] }

  const { data, error } = await auth.adminClient
    .from('staff')
    .select(
      'id, name, role, specialization, is_active, department_id, ' +
        'shift_name, shift_start_time, shift_end_time, work_days, ' +
        'break_start_time, break_end_time, ' +
        'slot_duration_minutes, max_patients_per_slot, max_patients_per_day, ' +
        'consultation_fee, departments:department_id(name)'
    )
    .eq('hospital_id', hospitalId)
    .order('role', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('getStaffSchedules failed:', error)
    return { success: false, error: error.message, staff: [] }
  }

  // Doctors first — their schedule is the one that gates appointments.
  const staff = (data || []).sort((a, b) => {
    if (a.role === 'doctor' && b.role !== 'doctor') return -1
    if (b.role === 'doctor' && a.role !== 'doctor') return 1
    return (a.name || '').localeCompare(b.name || '')
  })

  return { success: true, staff }
}

/**
 * Save one staff member's schedule.
 *
 * Deliberately a PARTIAL update: `updateStaff` in actions/staff.js overwrites
 * every column it knows about, so calling it from here would blank a doctor's
 * salary and licence while saving their shift.
 */
export async function updateStaffSchedule(staffId, schedule = {}) {
  const supabase = await createClient()

  const { data: member } = await supabase
    .from('staff')
    .select('id, hospital_id')
    .eq('id', staffId)
    .maybeSingle()

  if (!member) return { success: false, error: 'That staff member no longer exists.' }

  const auth = await requireScheduleAdmin(member.hospital_id)
  if (auth.error) return { success: false, error: auth.error }

  const patch = { updated_at: new Date().toISOString() }

  if (schedule.shiftName !== undefined) patch.shift_name = schedule.shiftName || null
  if (schedule.shiftStart !== undefined) patch.shift_start_time = schedule.shiftStart || null
  if (schedule.shiftEnd !== undefined) patch.shift_end_time = schedule.shiftEnd || null

  // Both or neither — a half-specified break fails the DB check constraint.
  if (schedule.breakStart !== undefined || schedule.breakEnd !== undefined) {
    const bs = schedule.breakStart || null
    const be = schedule.breakEnd || null
    if ((bs && !be) || (be && !bs)) {
      return { success: false, error: 'Give both a break start and a break end, or neither.' }
    }
    if (bs && be && be <= bs) {
      return { success: false, error: 'The break must end after it starts.' }
    }
    patch.break_start_time = bs
    patch.break_end_time = be
  }

  if (schedule.workDays !== undefined) {
    patch.work_days = Array.isArray(schedule.workDays) && schedule.workDays.length
      ? schedule.workDays
      : null
  }

  if (schedule.slotDuration !== undefined) {
    const d = Number(schedule.slotDuration)
    if (![15, 20, 30, 45, 60, 90, 120].includes(d)) {
      return { success: false, error: 'Choose a valid slot length.' }
    }
    patch.slot_duration_minutes = d
  }

  if (schedule.maxPerSlot !== undefined) {
    const n = Number(schedule.maxPerSlot)
    if (!Number.isInteger(n) || n < 1) {
      return { success: false, error: 'Patients per slot must be at least 1.' }
    }
    patch.max_patients_per_slot = n
  }

  if (schedule.maxPerDay !== undefined) {
    const n = schedule.maxPerDay === '' || schedule.maxPerDay === null
      ? null
      : Number(schedule.maxPerDay)
    if (n !== null && (!Number.isInteger(n) || n < 1)) {
      return { success: false, error: 'Patients per day must be at least 1.' }
    }
    patch.max_patients_per_day = n
  }

  const shiftStart = patch.shift_start_time ?? undefined
  const shiftEnd = patch.shift_end_time ?? undefined
  if (shiftStart && shiftEnd && shiftStart === shiftEnd) {
    return { success: false, error: 'The shift must start and end at different times.' }
  }

  const { error } = await auth.adminClient.from('staff').update(patch).eq('id', staffId)

  if (error) {
    console.error('updateStaffSchedule failed:', error)
    return { success: false, error: 'Could not save that schedule.' }
  }

  revalidatePath('/dashboard/hospital/schedules')
  revalidatePath('/dashboard/hospital/staff')
  return { success: true }
}

// ─────────────────────────────────────────────────────────
// Leave / holidays
// ─────────────────────────────────────────────────────────

/**
 * Upcoming and current absences at a hospital. Past ones are dropped — they
 * can't affect a future booking, and the list stays readable.
 */
export async function getUnavailability(hospitalId, { includePast = false } = {}) {
  const auth = await requireScheduleAdmin(hospitalId)
  if (auth.error) return { success: false, error: auth.error, entries: [] }

  let query = auth.adminClient
    .from('staff_unavailability')
    .select('id, staff_id, kind, starts_on, ends_on, starts_at_time, ends_at_time, reason, created_at, staff:staff_id(name, role)')
    .eq('hospital_id', hospitalId)
    .order('starts_on', { ascending: true })

  if (!includePast) {
    query = query.gte('ends_on', new Date().toISOString().slice(0, 10))
  }

  const { data, error } = await query
  if (error) {
    console.error('getUnavailability failed:', error)
    return { success: false, error: error.message, entries: [] }
  }
  return { success: true, entries: data || [] }
}

/**
 * Mark a leave, holiday, or one-off absence.
 *
 * `staffId: null` makes it hospital-wide — one row closes every doctor's diary
 * for a public holiday, rather than a row per doctor.
 */
export async function createUnavailability({
  hospitalId,
  staffId = null,
  kind = 'leave',
  startsOn,
  endsOn,
  startsAtTime = null,
  endsAtTime = null,
  reason = null,
}) {
  const auth = await requireScheduleAdmin(hospitalId)
  if (auth.error) return { success: false, error: auth.error }

  if (!['leave', 'holiday', 'unavailable'].includes(kind)) {
    return { success: false, error: 'Unknown type.' }
  }
  if (!startsOn) return { success: false, error: 'A start date is required.' }

  const end = endsOn || startsOn
  if (end < startsOn) {
    return { success: false, error: 'The end date cannot be before the start date.' }
  }
  if ((startsAtTime && !endsAtTime) || (endsAtTime && !startsAtTime)) {
    return { success: false, error: 'Give both a start and an end time, or neither.' }
  }
  if (startsAtTime && endsAtTime && endsAtTime <= startsAtTime) {
    return { success: false, error: 'The end time must be after the start time.' }
  }
  // A leave belongs to somebody; a holiday closes the hospital.
  if (kind === 'leave' && !staffId) {
    return { success: false, error: 'Choose whose leave this is.' }
  }

  const { data, error } = await auth.adminClient
    .from('staff_unavailability')
    .insert({
      hospital_id: hospitalId,
      staff_id: staffId || null,
      kind,
      starts_on: startsOn,
      ends_on: end,
      starts_at_time: startsAtTime || null,
      ends_at_time: endsAtTime || null,
      reason: (reason || '').trim() || null,
      created_by: auth.profile.id,
    })
    .select()
    .single()

  if (error) {
    console.error('createUnavailability failed:', error)
    return { success: false, error: 'Could not save that.' }
  }

  revalidatePath('/dashboard/hospital/schedules')
  return { success: true, entry: data }
}

export async function deleteUnavailability(entryId) {
  const supabase = await createClient()
  const { data: entry } = await supabase
    .from('staff_unavailability')
    .select('id, hospital_id')
    .eq('id', entryId)
    .maybeSingle()

  if (!entry) return { success: false, error: 'That entry no longer exists.' }

  const auth = await requireScheduleAdmin(entry.hospital_id)
  if (auth.error) return { success: false, error: auth.error }

  const { error } = await auth.adminClient
    .from('staff_unavailability')
    .delete()
    .eq('id', entryId)

  if (error) {
    console.error('deleteUnavailability failed:', error)
    return { success: false, error: 'Could not remove that entry.' }
  }

  revalidatePath('/dashboard/hospital/schedules')
  return { success: true }
}
