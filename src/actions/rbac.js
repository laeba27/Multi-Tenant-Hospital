'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  PERMISSION_KEYS,
  SUPER_ROLES,
  defaultsForRole,
} from '@/lib/rbac/permissions'

/**
 * Fetch all RBAC rules for a hospital
 */
export async function getRbacRules(hospitalId) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('rbac')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Fetch RBAC Error:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Every permission this person holds, resolved.
 *
 * Precedence, most specific first:
 *   1. a rule naming this staff member
 *   2. a rule for their role
 *   3. a hospital-wide 'all' rule
 *   4. the built-in defaults for their role
 *
 * (4) is the important one. The old code denied by default, and no hospital has
 * ever had an rbac row -- so a receptionist at any hospital but this one could
 * not book anything, and nobody would know why. Defaults make the product work
 * unconfigured; the RBAC page overrides them.
 */
export async function getPermissionsFor(hospitalId, staffId, role) {
  const resolved = defaultsForRole(role)

  if (SUPER_ROLES.includes(role)) return resolved

  try {
    const supabase = await createAdminClient()

    const { data: rules } = await supabase
      .from('rbac')
      .select('target_type, staff_id, role, permissions, is_allowed')
      .eq('hospital_id', hospitalId)
      .eq('is_allowed', true)

    if (!rules?.length) return resolved

    // Apply least-specific first so the most specific rule wins.
    const order = ['all', 'role', 'user']
    const applicable = rules
      .filter((r) => {
        if (r.target_type === 'all') return true
        if (r.target_type === 'role') return r.role === role
        if (r.target_type === 'user') return staffId && r.staff_id === staffId
        return false
      })
      .sort((a, b) => order.indexOf(a.target_type) - order.indexOf(b.target_type))

    for (const rule of applicable) {
      const perms = rule.permissions || {}
      for (const key of PERMISSION_KEYS) {
        // Only keys the rule actually mentions override the default -- a rule
        // that predates a new permission must not silently revoke it.
        if (key in perms) resolved[key] = perms[key] === true
      }
    }

    return resolved
  } catch (error) {
    console.error('getPermissionsFor error:', error)
    return resolved
  }
}

/**
 * Does this user hold `permission`?
 */
export async function checkPermission(hospitalId, staffId, role, permission) {
  if (SUPER_ROLES.includes(role)) return true
  const perms = await getPermissionsFor(hospitalId, staffId, role)
  return perms[permission] === true
}

/**
 * THE SERVER-SIDE GUARD. Call this at the top of any action a permission gates.
 *
 * Until now RBAC only hid UI: `book_appointment` was checked in exactly one
 * page component, and `bookAppointment` itself never looked. A receptionist
 * whose permission was revoked could still book -- the button was gone, the
 * action was not. Hiding a button is not access control.
 *
 * Returns { allowed, profile, error }.
 */
export async function requirePermission(permission) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { allowed: false, error: 'Not signed in' }

  const adminClient = await createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, name, role, hospital_id, registration_no')
    .eq('id', user.id)
    .single()

  if (!profile) return { allowed: false, error: 'Not signed in' }

  if (SUPER_ROLES.includes(profile.role)) {
    return { allowed: true, profile }
  }

  // rbac.staff_id points at `staff.id`, not `profiles.id` -- resolve the staff
  // row before asking about a staff-specific rule, or a per-person override
  // would silently never match.
  const { data: staffRow } = await adminClient
    .from('staff')
    .select('id, role')
    .eq('hospital_id', profile.hospital_id)
    .eq('employee_registration_no', profile.registration_no || '')
    .maybeSingle()

  const effectiveRole = staffRow?.role || profile.role

  const allowed = await checkPermission(
    profile.hospital_id,
    staffRow?.id || null,
    effectiveRole,
    permission
  )

  return {
    allowed,
    profile,
    error: allowed ? null : 'You do not have permission to do that.',
  }
}

/**
 * Only an admin may rewrite the rules, and only for their own hospital.
 *
 * These actions previously trusted their caller completely: a server action is
 * a public POST endpoint, so any signed-in user -- a patient, a receptionist
 * whose billing had just been revoked -- could call upsertRbacRule() directly
 * and grant themselves every permission, at any hospital whose id they passed.
 * That made the entire RBAC system advisory. The hospital is now taken from
 * the caller's own profile rather than from the argument, so an admin cannot
 * reach into another hospital either.
 */
async function requireRbacAdmin(hospitalId) {
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

  if (!profile || !SUPER_ROLES.includes(profile.role)) {
    return { error: 'Only hospital administrators can manage permissions.' }
  }

  // super_admin may act across hospitals; a hospital_admin is pinned to theirs.
  if (profile.role !== 'super_admin') {
    if (!profile.hospital_id) return { error: 'Your account has no hospital.' }
    if (hospitalId && hospitalId !== profile.hospital_id) {
      return { error: 'You can only manage permissions for your own hospital.' }
    }
    return { adminClient, profile, hospitalId: profile.hospital_id }
  }

  if (!hospitalId) return { error: 'A hospital is required.' }
  return { adminClient, profile, hospitalId }
}

/**
 * Create or update RBAC rule
 */
export async function upsertRbacRule(ruleData, hospitalId) {
  try {
    const auth = await requireRbacAdmin(hospitalId)
    if (auth.error) return { success: false, data: null, error: auth.error }
    const supabaseAdmin = auth.adminClient
    hospitalId = auth.hospitalId

    const { target_type, staff_id, role, permissions, is_allowed } = ruleData

    // Keep only keys the catalogue defines, coerced to real booleans -- the
    // permissions object arrives as free-form JSON from the client and is
    // written straight to the row the resolver reads.
    const cleanPermissions = Object.fromEntries(
      PERMISSION_KEYS.filter((key) => key in (permissions || {})).map((key) => [
        key,
        permissions[key] === true,
      ])
    )

    // Check if rule already exists
    const existingQuery = supabaseAdmin
      .from('rbac')
      .select('*')

    if (target_type === 'user' && staff_id) {
      existingQuery.eq('staff_id', staff_id)
    } else if (target_type === 'role' && role) {
      existingQuery.eq('target_type', 'role').eq('role', role)
    } else if (target_type === 'all') {
      existingQuery.eq('target_type', 'all')
    }

    existingQuery.eq('hospital_id', hospitalId)

    const { data: existing } = await existingQuery.maybeSingle()

    let result
    if (existing) {
      // Update existing rule
      const { data, error } = await supabaseAdmin
        .from('rbac')
        .update({
          permissions: cleanPermissions,
          is_allowed,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new rule
      const { data, error } = await supabaseAdmin
        .from('rbac')
        .insert([
          {
            hospital_id: hospitalId,
            target_type,
            staff_id: target_type === 'user' ? staff_id : null,
            role: target_type === 'role' ? role : null,
            permissions: cleanPermissions,
            is_allowed
          }
        ])
        .select()
        .single()

      if (error) throw error
      result = data
    }

    revalidatePath('/dashboard/hospital/rbac')
    return { success: true, data: result, error: null }
  } catch (error) {
    console.error('Upsert RBAC Error:', error)
    return { success: false, data: null, error: error.message }
  }
}

/**
 * Delete RBAC rule
 */
export async function deleteRbacRule(ruleId) {
  try {
    // Same hole as upsertRbacRule: unauthenticated deletion of any hospital's
    // rules. Resolve the rule first so we can check its hospital against the
    // caller's, then scope the delete to that hospital -- an id alone must not
    // be enough to strip another hospital's permissions.
    const supabase = await createAdminClient()
    const { data: rule } = await supabase
      .from('rbac')
      .select('id, hospital_id')
      .eq('id', ruleId)
      .maybeSingle()

    if (!rule) return { success: false, error: 'Rule not found.' }

    const auth = await requireRbacAdmin(rule.hospital_id)
    if (auth.error) return { success: false, error: auth.error }
    const supabaseAdmin = auth.adminClient

    const { error } = await supabaseAdmin
      .from('rbac')
      .delete()
      .eq('id', ruleId)
      .eq('hospital_id', auth.hospitalId)

    if (error) throw error

    revalidatePath('/dashboard/hospital/rbac')
    return { success: true, error: null }
  } catch (error) {
    console.error('Delete RBAC Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get staff list for RBAC assignment
 */
export async function getStaffForRbac(hospitalId) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role, employee_registration_no')
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Fetch Staff for RBAC Error:', error)
    return { data: null, error: error.message }
  }
}
