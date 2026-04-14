'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import { generatePatientRegistrationNo, generateHospitalPatientId } from '@/lib/utils/id-generator'

/**
 * Search for an existing patient profile by email
 * Used during patient onboarding to detect duplicates
 */
export async function searchPatientByEmail(email) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('role', 'patient')
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  } catch (error) {
    console.error('Error searching patient by email:', error)
    throw error
  }
}

/**
 * Get all patients for a hospital
 */
export async function getHospitalPatients(hospitalId) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('patients')
      .select(
        `
        *,
        profile:profiles!profile_id(
          id,
          name,
          email,
          mobile,
          gender,
          date_of_birth,
          avatar_url,
          registration_no
        )
      `
      )
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching hospital patients:', error)
    throw error
  }
}

/**
 * Get a single patient record
 */
export async function getPatient(patientId, hospitalId) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('patients')
      .select(
        `
        *,
        profile:profiles!profile_id(
          *
        )
      `
      )
      .eq('id', patientId)
      .eq('hospital_id', hospitalId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching patient:', error)
    throw error
  }
}

/**
 * Core onboarding function: Two-step process
 * Step 1: Check if patient exists, create profile if needed
 * Step 2: Link patient to hospital via patients table
 */
export async function onboardPatient(patientData, hospitalId, currentUserId) {
  const adminClient = await createAdminClient()
  
  let patientId = null
  let isNewProfile = false
  let registrationNo = null

  try {
    // Step 1: Check if patient already exists

    // First, try by email if provided
    if (patientData.email) {
      const { data } = await adminClient
        .from('profiles')
        .select('id, name, email, registration_no')
        .eq('email', patientData.email)
        .eq('role', 'patient')
        .single()

      if (data) {
        // Verify name matches (to avoid false positives)
        if (
          data.name.toLowerCase().trim() ===
          patientData.name.toLowerCase().trim()
        ) {
          patientId = data.id
          registrationNo = data.registration_no || null
        }
      }
    }

    // If no patient found by email, create new profile
    if (!patientId) {
      isNewProfile = true
      
      let newUserId = randomUUID()
      
      // If email is provided, create an actual Supabase Auth User
      if (patientData.email) {
        // Format date_of_birth (YYYY-MM-DD) to DDMMYYYY for password
        let password = 'Password@123'
        if (patientData.date_of_birth) {
          const dobParts = patientData.date_of_birth.split('-') // [YYYY, MM, DD]
          if (dobParts.length === 3) {
            password = `${dobParts[2]}${dobParts[1]}${dobParts[0]}`
          }
        }
        
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: patientData.email,
          password: password,
          email_confirm: true,
        })
        
        if (authError) throw authError
        newUserId = authData.user.id
      }
      
      patientId = newUserId

      registrationNo = generatePatientRegistrationNo()

      const { error: profileError } = await adminClient
        .from('profiles')
        .insert({
          id: patientId,
          registration_no: registrationNo,
          name: patientData.name,
          email: patientData.email || null,
          mobile: patientData.mobile,
          role: 'patient',
          status: 'active',
          hospital_id: null, // Key: hospital_id remains null for patients
          access_granted: false,
          gender: patientData.gender || null,
          date_of_birth: patientData.date_of_birth || null,
          address: patientData.address || null,
          city: patientData.city || null,
          state: patientData.state || null,
          pincode: patientData.pincode || null,
          country: patientData.country || null,
          aadhaar_number: patientData.aadhaar_number || null,
          blood_group: patientData.blood_group || null,
        })

      if (profileError) throw profileError
    }

    if (!registrationNo) {
      registrationNo = generatePatientRegistrationNo()
    }

    // Step 2: Link patient to hospital via patients table
    // Generate hospital-specific patient ID: HOSP-PAT-XXXXX
    const hospitalPatientId = generateHospitalPatientId()

    const { data: linkedPatient, error: linkError } = await adminClient
      .from('patients')
      .insert({
        id: hospitalPatientId, // Hospital-specific patient ID: HOSP-PAT-XXXXX
        profile_id: patientId,
        hospital_id: hospitalId,
        registration_no: hospitalPatientId, // Store hospital patient ID in registration_no as well
        is_active: true,
        height: patientData.height ? parseFloat(patientData.height) : null,
        weight: patientData.weight ? parseFloat(patientData.weight) : null,
        marital_status: patientData.marital_status || null,
        emergency_contact_name: patientData.emergency_contact_name || null,
        emergency_contact_mobile: patientData.emergency_contact_mobile || null,
        insurance_provider: patientData.insurance_provider || null,
        insurance_number: patientData.insurance_number || null,
        allergies: patientData.allergies || null,
        chronic_conditions: patientData.chronic_conditions || null,
        medical_notes: patientData.medical_notes || null,
        registered_by: currentUserId,
      })
      .select(`
        *,
        profile:profiles!profile_id(*)
      `)

    if (linkError) throw linkError

    return {
      success: true,
      patientId,
      isNewProfile,
      patient: linkedPatient[0],
      message: isNewProfile
        ? 'New patient profile created and linked to hospital successfully'
        : 'Existing patient linked to hospital successfully',
    }
  } catch (error) {
    console.error('Error during patient onboarding:', error)
    throw error
  }
}

/**
 * Update patient information
 */
export async function updatePatient(patientId, hospitalId, updateData) {
  try {
    const supabase = await createClient()

    // Update patient record
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId)
      .eq('hospital_id', hospitalId)
      .select()

    if (patientError) throw patientError

    return {
      success: true,
      patient: patient[0],
    }
  } catch (error) {
    console.error('Error updating patient:', error)
    throw error
  }
}

/**
 * Update patient profile information (in profiles table)
 */
export async function updatePatientProfile(patientId, profileData) {
  try {
    const adminClient = await createAdminClient()

    const { data: profile, error } = await adminClient
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId)
      .eq('role', 'patient')
      .select()

    if (error) throw error

    return {
      success: true,
      profile: profile[0],
    }
  } catch (error) {
    console.error('Error updating patient profile:', error)
    throw error
  }
}

/**
 * Unlink patient from hospital (soft delete by changing status)
 */
export async function unlinkPatientFromHospital(patientId, hospitalId) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('patients')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId)
      .eq('hospital_id', hospitalId)

    if (error) throw error

    return {
      success: true,
      message: 'Patient unlinked from hospital',
    }
  } catch (error) {
    console.error('Error unlinking patient:', error)
    throw error
  }
}

/**
 * Delete patient record permanently
 */
export async function deletePatient(patientId, hospitalId) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId)
      .eq('hospital_id', hospitalId)

    if (error) throw error

    return {
      success: true,
      message: 'Patient record deleted successfully',
    }
  } catch (error) {
    console.error('Error deleting patient:', error)
    throw error
  }
}

/**
 * Get patient count for a hospital
 */
export async function getPatientCount(hospitalId) {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error getting patient count:', error)
    return 0
  }
}

/**
 * Search patients by name or patient number
 */
export async function searchPatients(hospitalId, query) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('patients')
      .select(
        `
        *,
        profile:profiles!profile_id(
          name,
          email,
          mobile,
          avatar_url,
          registration_no
        )
      `
      )
      .eq('hospital_id', hospitalId)
      .or(
        `id.ilike.%${query}%,profile.name.ilike.%${query}%,profile.email.ilike.%${query}%,profile.mobile.ilike.%${query}%`
      )
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error searching patients:', error)
    return []
  }
}

/**
 * Search for patient in a specific hospital by ID, email, phone, or name
 * Used when starting new appointment booking to find existing patients
 */
export async function searchPatientForHospital(hospitalId, searchType, searchValue) {
  try {
    const supabase = await createClient()

    const normalizedSearchValue = searchValue.toUpperCase().replace(/\s+/g, '')

    let query = supabase
      .from('patients')
      .select(
        `
        *,
        profile:profiles!profile_id(
          id,
          name,
          email,
          mobile,
          gender,
          date_of_birth,
          avatar_url,
          registration_no
        )
      `
      )
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)

    // Apply filter based on search type
    switch (searchType) {
      case 'id':
        // Search by hospital patient ID (HOSP-PAT-XXXXX) or profile registration no (PATIENT-XXXXXX)
        if (/^HOSP-PAT-\d+$/.test(normalizedSearchValue)) {
          // Direct match for HOSP-PAT-XXXXX format
          query = query.eq('id', normalizedSearchValue)
        } else if (/^PATIENT\d+$/.test(normalizedSearchValue)) {
          // Handle PATIENTXXXXX -> PATIENT-XXXXX
          const withHyphen = normalizedSearchValue.replace(/^PATIENT/, 'PATIENT-')
          query = query.eq('profile.registration_no', withHyphen)
        } else {
          // Try to match against patients.id (hospital patient ID)
          query = query.eq('id', normalizedSearchValue)
        }
        break
      case 'email':
        query = query.eq('profile.email', searchValue.toLowerCase())
        break
      case 'phone':
        query = query.eq('profile.mobile', searchValue)
        break
      case 'name':
        query = query.ilike('profile.name', `%${searchValue}%`)
        break
      default:
        return null
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  } catch (error) {
    console.error('Error searching patient for hospital:', error)
    throw error
  }
}
