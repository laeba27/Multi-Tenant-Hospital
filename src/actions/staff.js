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
  // Everything lives inside the try, including building the admin client.
  // Constructing it reads SUPABASE_SERVICE_ROLE_KEY and touches cookies(); when
  // that threw from out here the whole server action crashed, and a crashed
  // action returns Next's HTML error page rather than a value -- which the
  // client then fails to JSON.parse ("Unexpected token '<'").
  try {
    const supabaseAdmin = await createAdminClient()

    console.log('Inviting staff:', staffData.email, staffData.role)

    // Validate required fields
    if (!staffData.email || !staffData.name || !staffData.role || !staffData.hospital_id) {
      return { success: false, error: 'Name, email, role, and hospital ID are required' }
    }

    // 1. Check if email already exists in auth.users.
    // listUsers() is paginated and defaults to 50 per page, so the old
    // single-call version silently stopped looking after the 50th user and
    // would happily issue a duplicate invite to anyone past it. Walk the pages.
    let emailExists = false
    for (let page = 1; ; page++) {
      const { data: pageData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      })
      if (listError) {
        console.error('List users error:', listError)
        return { success: false, error: 'Failed to validate existing account' }
      }

      const users = pageData?.users || []
      if (users.some((u) => u.email === staffData.email)) {
        emailExists = true
        break
      }
      if (users.length < 200) break
    }

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
    // Guard against an error escaping the sender entirely (killed socket,
    // unconstructable transport). An uncaught throw here crashes the server
    // action, and the client gets Next's HTML error page instead of a result --
    // which surfaces as "Unexpected token '<'" when it's parsed as JSON.
    let emailResult
    try {
      emailResult = await sendStaffInviteEmail({
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
    } catch (error) {
      console.error('inviteStaff: invitation email threw:', error)
      emailResult = { success: false, error: error.message }
    }

    console.log('Staff invited successfully')
    revalidatePath('/dashboard/hospital/staff')

    // A failed email must NOT be reported as a failed invitation.
    //
    // By this point the auth user, the profile and the staff row all exist --
    // the invitation succeeded. Returning `success: false` because Gmail was
    // slow told the admin it had failed, so they invited the same person again
    // and hit "email already registered" on an account that was created the
    // first time. The staff member is left real but un-emailable, and the admin
    // has no way to tell.
    //
    // Report the truth instead: the staff member was created, and say
    // separately whether the email got out, so the UI can offer to resend
    // rather than pretend nothing happened.
    if (!emailResult.success) {
      console.error('Failed to send invite email:', emailResult.error)
      return {
        success: true,
        emailSent: false,
        emailError: emailResult.error,
      }
    }

    return { success: true, emailSent: true }
  } catch (error) {
    console.error('Invite Staff Error:', error)
    return { success: false, error: error.message || 'Failed to invite staff' }
  }
}

/**
 * Re-send the invitation email to a staff member who never received one.
 *
 * inviteStaff() creates the account and then mails the link. When the mail
 * fails, the account still exists -- so there has to be a way to get a link out
 * without inviting the person a second time (which only collides with the
 * account already created). This mints a FRESH token rather than storing the
 * original: invite tokens last 7 days, and a stored one would be both stale and
 * a standing credential sitting in the database.
 */
export async function resendStaffInvite(staffId) {
  try {
    // Only an admin of the staff member's own hospital may trigger this -- the
    // email carries a token that sets up the account, so it must not be
    // something any signed-in user can cause to be sent anywhere.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    const supabaseAdmin = await createAdminClient()

    const { data: actor } = await supabaseAdmin
      .from('profiles')
      .select('id, role, hospital_id')
      .eq('id', user.id)
      .single()

    if (!actor || !['hospital_admin', 'super_admin'].includes(actor.role)) {
      return { success: false, error: 'Only hospital administrators can resend invitations.' }
    }

    // `staff` carries no email/mobile -- those live on the linked profile, keyed
    // by employee_registration_no.
    const { data: staffRow } = await supabaseAdmin
      .from('staff')
      .select('id, name, role, hospital_id, employee_registration_no')
      .eq('id', staffId)
      .maybeSingle()

    if (!staffRow) return { success: false, error: 'Staff member not found.' }

    if (actor.role !== 'super_admin' && staffRow.hospital_id !== actor.hospital_id) {
      return { success: false, error: 'That staff member belongs to another hospital.' }
    }

    // The invite token identifies the auth user, so resolve it from the profile
    // rather than trusting anything passed in.
    const { data: staffProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, mobile, status')
      .eq('registration_no', staffRow.employee_registration_no)
      .maybeSingle()

    if (!staffProfile) {
      return { success: false, error: 'No account found for that staff member.' }
    }
    if (!staffProfile.email) {
      return { success: false, error: 'That staff member has no email address on file.' }
    }

    if (staffProfile.status === 'active') {
      return {
        success: false,
        error: 'That staff member has already completed their registration.',
      }
    }

    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .select('name')
      .eq('registration_no', staffRow.hospital_id)
      .maybeSingle()

    const payload = {
      email: staffProfile.email,
      name: staffRow.name || staffProfile.name,
      role: staffRow.role,
      registration_no: staffRow.employee_registration_no,
      hospital_id: staffRow.hospital_id,
      mobile: staffProfile.mobile || null,
      user_id: staffProfile.id,
    }

    const result = await sendStaffInviteEmail({
      email: staffProfile.email,
      name: payload.name,
      hospitalName: hospital?.name || 'your hospital',
      role: staffRow.role,
      staffData: payload,
      token: generateStaffInviteToken(payload),
    })

    if (!result.success) {
      return { success: false, error: result.error || 'Could not send the invitation email.' }
    }

    return { success: true }
  } catch (error) {
    console.error('resendStaffInvite error:', error)
    return { success: false, error: error.message || 'Could not resend the invitation.' }
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
                profiles:employee_registration_no(email, mobile, status)
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
