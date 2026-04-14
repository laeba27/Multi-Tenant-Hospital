'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Fetch all departments for a given hospital
 * @param {string} hospitalId 
 * @returns {Promise<{data: any[], error: any}>}
 */
export async function getDepartments(hospitalId) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching departments:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Create a new department
 * @param {object} departmentData 
 * @returns {Promise<{data: any, error: any}>}
 */
export async function createDepartment(departmentData) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('departments')
      .insert([{ ...departmentData, name: departmentData.name.toLowerCase() }])
      .select()
      .single()

    if (error) throw error
    
    revalidatePath('/dashboard/hospital/departments')
    return { data, error: null }
  } catch (error) {
    console.error('Error creating department:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Update an existing department
 * @param {string} id 
 * @param {object} departmentData 
 * @returns {Promise<{data: any, error: any}>}
 */
export async function updateDepartment(id, departmentData) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('departments')
      .update({ ...departmentData, name: departmentData.name.toLowerCase() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    
    revalidatePath('/dashboard/hospital/departments')
    return { data, error: null }
  } catch (error) {
    console.error('Error updating department:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Delete a department
 * @param {string} id 
 * @returns {Promise<{error: any}>}
 */
export async function deleteDepartment(id) {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id)

    if (error) throw error
    
    revalidatePath('/dashboard/hospital/departments')
    return { error: null }
  } catch (error) {
    console.error('Error deleting department:', error)
    return { error: error.message }
  }
}
