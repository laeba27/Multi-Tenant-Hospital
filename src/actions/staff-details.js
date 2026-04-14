'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Fetch staff member details by their profile ID
 */
export async function getStaffDetails(profileId) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('staff')
      .select(`
        *,
        departments:department_id(id, name),
        profiles:employee_registration_no(id, name, email, mobile, registration_no)
      `)
      .eq('id', profileId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching staff details:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Fetch staff by user ID (auth user ID)
 */
export async function getStaffByUserId(userId) {
  try {
    const supabase = await createClient()

    // First get the profile's registration_no
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('registration_no')
      .eq('id', userId)
      .single()

    if (profileError) throw profileError

    // Then use registration_no to query staff table
    const { data, error } = await supabase
      .from('staff')
      .select(`
        *,
        departments:department_id(id, name),
        hospitals:hospital_id(id, name, registration_no, email, phone, address, city)
      `)
      .eq('employee_registration_no', profile.registration_no)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching staff by user ID:', error)
    return { data: null, error: error.message }
  }
}
