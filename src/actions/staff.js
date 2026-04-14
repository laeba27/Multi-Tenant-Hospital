'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateUserRegistrationNo } from '@/lib/utils/id-generator'
import { sendStaffInviteEmail } from '@/lib/email/send-email'
import { generateStaffInviteToken } from '@/lib/utils/jwt'
import { randomUUID } from 'crypto'

/**
 * Invite a new staff member
 * @param {object} staffData 
 * @param {string} hospitalName
 * @returns {Promise<{success: boolean, error?: string, warning?: string}>}
 */
export async function inviteStaff(staffData, hospitalName) {
  const supabaseAdmin = await createAdminClient()

  try {
    console.log('Inviting staff:', staffData.email, staffData.role)

    // Validate required fields
    if (!staffData.email || !staffData.name || !staffData.role || !staffData.hospital_id) {
      return { success: false, error: 'Name, email, role, and hospital ID are required' }
    }

    // 1. Check if email already exists in auth.users
    const { users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('List users error:', listError)
      return { success: false, error: 'Failed to validate existing account' }
    }

    const emailExists = users?.some(u => u.email === staffData.email)
    
    if (emailExists) {
      return { success: false, error: 'User with this email already exists.' }
    }

    // 2. Generate Registration Number
    const registrationNo = generateUserRegistrationNo(staffData.role)
    console.log('Generated Reg No:', registrationNo)

    // 3. Create auth user (unverified status, no password yet)
    console.log('Creating auth user...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: staffData.email,
      email_confirm: false,
      user_metadata: {
        name: staffData.name,
        role: staffData.role,
        registration_no: registrationNo
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return { success: false, error: `Failed to create account: ${authError.message}` }
    }

    const userId = authData.user.id
    console.log('Auth user created with ID:', userId)

    // 4. Create profiles entry with 'invited' status
    console.log('Creating profile entry...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: userId,
          registration_no: registrationNo,
          name: staffData.name,
          email: staffData.email,
          mobile: staffData.mobile || null,
          role: staffData.role,
          status: 'invited',
          hospital_id: staffData.hospital_id,
          created_at: new Date().toISOString()
        }
      ])

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Rollback: delete the auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      } catch (deleteError) {
        console.error('Failed to rollback auth user:', deleteError)
      }
      return { success: false, error: `Failed to create profile: ${profileError.message}` }
    }

    console.log('Profile created with status: invited')

    // 5. Create entry in staff table (for all roles)
    console.log('Creating staff table entry for role:', staffData.role)
    console.log('Staff table insert data:', {
      hospital_id: staffData.hospital_id,
      employee_registration_no: registrationNo,
      name: staffData.name,
      role: staffData.role,
      is_active: true,
      created_at: new Date().toISOString()
    })

    // Helper function to convert empty strings to null
    const emptyToNull = (value) => {
      if (value === '' || value === undefined) return null
      return value
    }

    // Helper function to convert empty strings to null for numbers
    const emptyStringToNull = (value) => {
      if (value === '' || value === undefined || value === null) return null
      if (typeof value === 'number') return value
      const num = parseFloat(value)
      return isNaN(num) ? null : num
    }

    // Helper function to convert empty strings to null for integers
    const emptyStringToNullInt = (value) => {
      if (value === '' || value === undefined || value === null) return null
      if (typeof value === 'number') return value
      const num = parseInt(value, 10)
      return isNaN(num) ? null : num
    }

    const { error: staffTableError } = await supabaseAdmin
      .from('staff')
      .insert([
        {
          hospital_id: staffData.hospital_id,
          employee_registration_no: registrationNo,
          name: staffData.name,
          role: staffData.role,
          department_id: emptyToNull(staffData.department_id),
          employment_type: emptyToNull(staffData.employment_type),
          joining_date: emptyToNull(staffData.joining_date),
          specialization: emptyToNull(staffData.specialization),
          qualification: emptyToNull(staffData.qualification),
          license_number: emptyToNull(staffData.license_number),
          license_expiry: emptyToNull(staffData.license_expiry),
          years_of_experience: emptyStringToNullInt(staffData.years_of_experience),
          gender: emptyToNull(staffData.gender),
          date_of_birth: emptyToNull(staffData.date_of_birth),
          shift_name: emptyToNull(staffData.shift_name),
          shift_start_time: emptyToNull(staffData.shift_start_time),
          shift_end_time: emptyToNull(staffData.shift_end_time),
          consultation_fee: emptyStringToNull(staffData.consultation_fee),
          max_patients_per_day: emptyStringToNullInt(staffData.max_patients_per_day),
          address: emptyToNull(staffData.address),
          emergency_contact: emptyToNull(staffData.emergency_contact),
          salary: emptyStringToNull(staffData.salary),
          avatar_url: emptyToNull(staffData.avatar_url),
          notes: emptyToNull(staffData.notes),
          work_days: staffData.work_days && staffData.work_days.length > 0 ? staffData.work_days : null,
          is_active: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (staffTableError) {
      console.error('Staff table error:', staffTableError)
      console.error('Error details:', JSON.stringify(staffTableError, null, 2))
      return { success: false, error: `Failed to create staff entry: ${staffTableError.message}` }
    }

    console.log('Staff table entry created successfully for role:', staffData.role)

    // 6. Generate JWT token with staff details
    console.log('Generating JWT token...')
    const inviteToken = generateStaffInviteToken({
      email: staffData.email,
      name: staffData.name,
      role: staffData.role,
      registration_no: registrationNo,
      hospital_id: staffData.hospital_id,
      mobile: staffData.mobile,
      user_id: userId
    })

    // 7. Send Invitation Email with JWT token
    console.log('Sending invitation email...')
    const emailResult = await sendStaffInviteEmail({
      email: staffData.email,
      name: staffData.name,
      hospitalName: hospitalName,
      role: staffData.role,
      staffData: {
        email: staffData.email,
        name: staffData.name,
        role: staffData.role,
        registration_no: registrationNo,
        hospital_id: staffData.hospital_id,
        mobile: staffData.mobile,
        user_id: userId
      },
      token: inviteToken
    })

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error)
      return { success: false, error: `Email failed to send: ${emailResult.error}` }
    }

    console.log('Staff invited successfully')
    revalidatePath('/dashboard/hospital/staff')
    
    return { success: true }
  } catch (error) {
    console.error('Invite Staff Error:', error)
    return { success: false, error: error.message || 'Failed to invite staff' }
  }
}

/**
 * Fetch staff list
 * @param {string} hospitalId
 */
export async function getStaff(hospitalId) {
    const supabase = await createClient()
    
    try {
        const { data, error } = await supabase
            .from('staff')
            .select(`
                *,
                departments:department_id(name),
                profiles:employee_registration_no(email, mobile)
            `)
            .eq('hospital_id', hospitalId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return { data, error: null }
    } catch (error) {
        console.error('Fetch Staff Error:', error)
        return { data: null, error: error.message }
    }
}

/**
 * Update staff status (active/inactive)
 * @param {string} staffId - The staff UUID
 * @param {boolean} isActive - The new active status
 */
export async function updateStaffStatus(staffId, isActive) {
    const supabaseAdmin = await createAdminClient()
    
    try {
        console.log(`Updating staff ${staffId} status to ${isActive ? 'active' : 'inactive'}`)

        const { error } = await supabaseAdmin
            .from('staff')
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq('id', staffId)

        if (error) throw error

        revalidatePath('/dashboard/hospital/staff')
        console.log('Staff status updated successfully')
        return { success: true, error: null }
    } catch (error) {
        console.error('Update Staff Status Error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Fetch a single staff member by ID
 * @param {string} staffId - The staff UUID
 */
export async function getStaffById(staffId) {
    const supabase = await createClient()
    
    try {
        const { data, error } = await supabase
            .from('staff')
            .select(`
                *,
                departments:department_id(name, id),
                profiles:employee_registration_no(email, mobile)
            `)
            .eq('id', staffId)
            .single()

        if (error) throw error
        return { data, error: null }
    } catch (error) {
        console.error('Fetch Staff By ID Error:', error)
        return { data: null, error: error.message }
    }
}

/**
 * Update staff member details
 * @param {string} staffId - The staff UUID
 * @param {object} staffData - Updated staff data
 */
export async function updateStaff(staffId, staffData) {
    const supabaseAdmin = await createAdminClient()
    
    try {
        console.log('Updating staff:', staffId)

        // Helper function to convert empty strings to null
        const emptyToNull = (value) => {
            if (value === '' || value === undefined) return null
            return value
        }

        // Helper function to convert empty strings to null for numbers
        const emptyStringToNull = (value) => {
            if (value === '' || value === undefined || value === null) return null
            if (typeof value === 'number') return value
            const num = parseFloat(value)
            return isNaN(num) ? null : num
        }

        // Helper function to convert empty strings to null for integers
        const emptyStringToNullInt = (value) => {
            if (value === '' || value === undefined || value === null) return null
            if (typeof value === 'number') return value
            const num = parseInt(value, 10)
            return isNaN(num) ? null : num
        }

        // Build update payload with all fields
        const updatePayload = {
            name: staffData.name,
            gender: emptyToNull(staffData.gender),
            date_of_birth: emptyToNull(staffData.date_of_birth),
            specialization: emptyToNull(staffData.specialization),
            qualification: emptyToNull(staffData.qualification),
            license_number: emptyToNull(staffData.license_number),
            license_expiry: emptyToNull(staffData.license_expiry),
            years_of_experience: emptyStringToNullInt(staffData.years_of_experience),
            shift_name: emptyToNull(staffData.shift_name),
            shift_start_time: emptyToNull(staffData.shift_start_time),
            shift_end_time: emptyToNull(staffData.shift_end_time),
            consultation_fee: emptyStringToNull(staffData.consultation_fee),
            max_patients_per_day: emptyStringToNullInt(staffData.max_patients_per_day),
            address: emptyToNull(staffData.address),
            emergency_contact: emptyToNull(staffData.emergency_contact),
            employment_type: emptyToNull(staffData.employment_type),
            joining_date: emptyToNull(staffData.joining_date),
            salary: emptyStringToNull(staffData.salary),
            avatar_url: emptyToNull(staffData.avatar_url),
            notes: emptyToNull(staffData.notes),
            work_days: staffData.work_days && staffData.work_days.length > 0 ? staffData.work_days : null,
            updated_at: new Date().toISOString(),
            is_active: staffData.is_active !== undefined ? staffData.is_active : true,
        }

        const { error } = await supabaseAdmin
            .from('staff')
            .update(updatePayload)
            .eq('id', staffId)

        if (error) throw error

        console.log('Staff updated successfully')
        revalidatePath('/dashboard/hospital/staff')
        return { success: true, error: null }
    } catch (error) {
        console.error('Update Staff Error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Delete a staff member
 * @param {string} staffId - The staff UUID
 */
export async function deleteStaff(staffId) {
    const supabaseAdmin = await createAdminClient()
    
    try {
        console.log('Deleting staff:', staffId)

        // First, get the staff member to retrieve the user ID
        const { data: staffData, error: fetchError } = await supabaseAdmin
            .from('staff')
            .select('employee_registration_no')
            .eq('id', staffId)
            .single()

        if (fetchError) throw new Error(`Fetch Error: ${fetchError.message}`)

        // Delete staff record
        const { error: deleteError } = await supabaseAdmin
            .from('staff')
            .delete()
            .eq('id', staffId)

        if (deleteError) throw new Error(`Delete Error: ${deleteError.message}`)

        console.log('Staff deleted successfully')
        revalidatePath('/dashboard/hospital/staff')
        return { success: true, error: null }
    } catch (error) {
        console.error('Delete Staff Error:', error)
        return { success: false, error: error.message }
    }
}
