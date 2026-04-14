'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Create a new treatment
 */
export async function createTreatment(treatmentData, hospitalId) {
  const supabaseAdmin = await createAdminClient()

  try {
    console.log('Creating treatment:', treatmentData.treatment_name)

    const payload = {
      hospital_id: hospitalId,
      treatment_name: treatmentData.treatment_name,
      treatment_code: treatmentData.treatment_code || null,
      description: treatmentData.description || null,
      department_id: treatmentData.department_id || null,
      base_price: treatmentData.base_price,
      duration_minutes: treatmentData.duration_minutes || null,
      preparation_instructions: treatmentData.preparation_instructions || null,
      post_treatment_instructions: treatmentData.post_treatment_instructions || null,
      is_active: treatmentData.is_active !== undefined ? treatmentData.is_active : true,
    }

    const { data, error } = await supabaseAdmin
      .from('treatments')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    console.log('Treatment created successfully')
    revalidatePath('/dashboard/hospital/treatments')
    return { success: true, data, error: null }
  } catch (error) {
    console.error('Create Treatment Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Fetch treatments list
 */
export async function getTreatments(hospitalId) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('treatments')
      .select(`
        *,
        departments:department_id(name)
      `)
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Fetch Treatments Error:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Get a single treatment
 */
export async function getTreatmentById(treatmentId) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('treatments')
      .select(`
        *,
        departments:department_id(name, id)
      `)
      .eq('id', treatmentId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Fetch Treatment Error:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Update a treatment
 */
export async function updateTreatment(treatmentId, treatmentData) {
  const supabaseAdmin = await createAdminClient()

  try {
    console.log('Updating treatment:', treatmentId)

    const payload = {
      treatment_name: treatmentData.treatment_name,
      treatment_code: treatmentData.treatment_code || null,
      description: treatmentData.description || null,
      department_id: treatmentData.department_id || null,
      base_price: treatmentData.base_price,
      duration_minutes: treatmentData.duration_minutes || null,
      preparation_instructions: treatmentData.preparation_instructions || null,
      post_treatment_instructions: treatmentData.post_treatment_instructions || null,
      is_active: treatmentData.is_active !== undefined ? treatmentData.is_active : true,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabaseAdmin
      .from('treatments')
      .update(payload)
      .eq('id', treatmentId)

    if (error) throw error

    console.log('Treatment updated successfully')
    revalidatePath('/dashboard/hospital/treatments')
    return { success: true, error: null }
  } catch (error) {
    console.error('Update Treatment Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a treatment
 */
export async function deleteTreatment(treatmentId) {
  const supabaseAdmin = await createAdminClient()

  try {
    console.log('Deleting treatment:', treatmentId)

    const { error } = await supabaseAdmin
      .from('treatments')
      .delete()
      .eq('id', treatmentId)

    if (error) throw error

    console.log('Treatment deleted successfully')
    revalidatePath('/dashboard/hospital/treatments')
    return { success: true, error: null }
  } catch (error) {
    console.error('Delete Treatment Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update treatment status
 */
export async function updateTreatmentStatus(treatmentId, isActive) {
  const supabaseAdmin = await createAdminClient()

  try {
    const { error } = await supabaseAdmin
      .from('treatments')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', treatmentId)

    if (error) throw error

    revalidatePath('/dashboard/hospital/treatments')
    return { success: true, error: null }
  } catch (error) {
    console.error('Update Treatment Status Error:', error)
    return { success: false, error: error.message }
  }
}
