'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
 * Check if a user has a specific permission
 * @param {string} hospitalId - Hospital registration number
 * @param {string} staffId - Staff UUID (optional)
 * @param {string} role - Staff role (optional)
 * @param {string} permission - Permission to check (e.g., 'book_appointment')
 * @returns {Promise<boolean>}
 */
export async function checkPermission(hospitalId, staffId, role, permission) {
  const supabase = await createClient()

  try {
    // Check if user is hospital_admin - they have all permissions
    if (role === 'hospital_admin' || role === 'super_admin') {
      return true
    }

    // Check for specific staff permission
    if (staffId) {
      const { data: staffRule } = await supabase
        .from('rbac')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('staff_id', staffId)
        .eq('is_allowed', true)
        .single()

      if (staffRule) {
        const permissions = staffRule.permissions || {}
        return permissions[permission] === true
      }
    }

    // Check for role-based permission
    if (role) {
      const { data: roleRule } = await supabase
        .from('rbac')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('target_type', 'role')
        .eq('role', role)
        .eq('is_allowed', true)
        .single()

      if (roleRule) {
        const permissions = roleRule.permissions || {}
        return permissions[permission] === true
      }
    }

    // Check for "all" target permission
    const { data: allRule } = await supabase
      .from('rbac')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('target_type', 'all')
      .eq('is_allowed', true)
      .single()

    if (allRule) {
      const permissions = allRule.permissions || {}
      return permissions[permission] === true
    }

    // Default: deny if no explicit permission found
    return false
  } catch (error) {
    console.error('Check Permission Error:', error)
    return false
  }
}

/**
 * Create or update RBAC rule
 */
export async function upsertRbacRule(ruleData, hospitalId) {
  const supabaseAdmin = await createAdminClient()

  try {
    const { target_type, staff_id, role, permissions, is_allowed } = ruleData

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
          permissions,
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
            permissions,
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
  const supabaseAdmin = await createAdminClient()

  try {
    const { error } = await supabaseAdmin
      .from('rbac')
      .delete()
      .eq('id', ruleId)

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
