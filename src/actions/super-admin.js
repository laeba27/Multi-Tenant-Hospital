'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateUserRegistrationNo } from '@/lib/utils/id-generator'
import {
  sendHospitalApprovalEmail,
  sendHospitalDetailsRequestEmail,
} from '@/lib/email/send-email'

const ACTIVE_HOSPITAL_STATUSES = new Set(['active', 'approved'])
const PENDING_HOSPITAL_STATUSES = new Set(['pending', 'pending approval', 'pending_approval'])

function normalizeStatus(value) {
  return (value || '').trim().toLowerCase()
}

function isHospitalActive(status) {
  return ACTIVE_HOSPITAL_STATUSES.has(normalizeStatus(status))
}

function isHospitalPending(status) {
  return PENDING_HOSPITAL_STATUSES.has(normalizeStatus(status))
}

async function requireSuperAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'super_admin') {
    throw new Error('Only super admins can perform this action')
  }

  return { user, profile }
}

function buildHospitalAdminMap(adminProfiles) {
  return adminProfiles.reduce((acc, adminProfile) => {
    const key = adminProfile.hospital_id
    if (!key) return acc
    acc[key] = adminProfile
    return acc
  }, {})
}

function attachAdminDetails(hospitals, hospitalAdminMap) {
  return hospitals.map((hospital) => ({
    ...hospital,
    admin_profile: hospitalAdminMap[hospital.registration_no] || null,
  }))
}

function computeHospitalStats(allHospitals, allHospitalAdmins, totalSuperAdmins) {
  const adminMap = buildHospitalAdminMap(allHospitalAdmins)

  let pendingHospitals = 0
  let approvedHospitals = 0

  for (const hospital of allHospitals) {
    const adminProfile = adminMap[hospital.registration_no]
    const hasAccess = adminProfile?.access_granted === true

    if (isHospitalActive(hospital.account_status) && hasAccess) {
      approvedHospitals += 1
    } else if (isHospitalPending(hospital.account_status) || !hasAccess) {
      pendingHospitals += 1
    }
  }

  return {
    totalHospitals: allHospitals.length,
    pendingHospitals,
    approvedHospitals,
    totalSuperAdmins,
  }
}

export async function getSuperAdminDashboardData(emailFilter = '') {
  try {
    await requireSuperAdmin()
    const adminClient = await createAdminClient()

    let hospitalQuery = adminClient
      .from('hospitals')
      .select(
        `
        id,
        registration_no,
        name,
        email,
        phone,
        city,
        state,
        administrator_name,
        license_number,
        account_status,
        created_at,
        updated_at
      `
      )
      .order('created_at', { ascending: false })

    const normalizedFilter = emailFilter.trim()
    if (normalizedFilter) {
      hospitalQuery = hospitalQuery.ilike('email', `%${normalizedFilter}%`)
    }

    const { data: hospitals, error: hospitalsError } = await hospitalQuery

    if (hospitalsError) {
      throw hospitalsError
    }

    const { data: hospitalAdminProfiles, error: hospitalAdminProfilesError } = await adminClient
      .from('profiles')
      .select('id, registration_no, name, email, mobile, role, status, access_granted, hospital_id')
      .eq('role', 'hospital_admin')

    if (hospitalAdminProfilesError) {
      throw hospitalAdminProfilesError
    }

    const hospitalAdminMap = buildHospitalAdminMap(hospitalAdminProfiles || [])
    const hospitalsWithAdmin = attachAdminDetails(hospitals || [], hospitalAdminMap)

    const pendingApprovalHospitals = hospitalsWithAdmin.filter((hospital) => {
      const adminProfile = hospital.admin_profile
      const hasAccess = adminProfile?.access_granted === true
      return isHospitalPending(hospital.account_status) || !hasAccess
    })

    const [allHospitalsResult, allHospitalAdminsResult, superAdminsResult] = await Promise.all([
      adminClient.from('hospitals').select('registration_no, account_status'),
      adminClient
        .from('profiles')
        .select('hospital_id, access_granted')
        .eq('role', 'hospital_admin'),
      adminClient
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'super_admin'),
    ])

    if (allHospitalsResult.error) throw allHospitalsResult.error
    if (allHospitalAdminsResult.error) throw allHospitalAdminsResult.error
    if (superAdminsResult.error) throw superAdminsResult.error

    const stats = computeHospitalStats(
      allHospitalsResult.data || [],
      allHospitalAdminsResult.data || [],
      superAdminsResult.count || 0
    )

    return {
      success: true,
      data: {
        stats,
        hospitals: hospitalsWithAdmin,
        pendingApprovalHospitals,
      },
    }
  } catch (error) {
    console.error('Error loading super admin dashboard data:', error)
    return {
      success: false,
      error: error.message || 'Failed to load super admin dashboard data',
    }
  }
}

export async function approveHospitalRegistration(hospitalRegistrationNo) {
  try {
    await requireSuperAdmin()

    if (!hospitalRegistrationNo) {
      return { success: false, error: 'Hospital registration number is required' }
    }

    const adminClient = await createAdminClient()
    const now = new Date().toISOString()

    const { data: hospital, error: hospitalError } = await adminClient
      .from('hospitals')
      .update({
        account_status: 'Active',
        updated_at: now,
      })
      .eq('registration_no', hospitalRegistrationNo)
      .select('registration_no, name, email, administrator_name')
      .single()

    if (hospitalError) {
      throw hospitalError
    }

    const { data: hospitalAdmins, error: hospitalAdminsError } = await adminClient
      .from('profiles')
      .update({
        access_granted: true,
        status: 'active',
        updated_at: now,
      })
      .eq('role', 'hospital_admin')
      .eq('hospital_id', hospitalRegistrationNo)
      .select('name, email, registration_no')

    if (hospitalAdminsError) {
      throw hospitalAdminsError
    }

    const adminRecipients = (hospitalAdmins || []).filter((adminProfile) => !!adminProfile.email)

    if (adminRecipients.length > 0) {
      await Promise.all(
        adminRecipients.map((adminProfile) =>
          sendHospitalApprovalEmail({
            email: adminProfile.email,
            hospitalName: hospital.name,
            administratorName: adminProfile.name || hospital.administrator_name || 'Hospital Admin',
            registrationNo: hospital.registration_no,
            userRegistrationNo: adminProfile.registration_no,
          })
        )
      )
    }

    return {
      success: true,
      message: `Hospital ${hospital.name} approved successfully`,
    }
  } catch (error) {
    console.error('Error approving hospital registration:', error)
    return {
      success: false,
      error: error.message || 'Failed to approve hospital registration',
    }
  }
}

export async function requestHospitalDetails(hospitalRegistrationNo, note = '') {
  try {
    const { profile } = await requireSuperAdmin()

    if (!hospitalRegistrationNo) {
      return { success: false, error: 'Hospital registration number is required' }
    }

    const adminClient = await createAdminClient()

    const { data: hospital, error: hospitalError } = await adminClient
      .from('hospitals')
      .select('registration_no, name, email, administrator_name')
      .eq('registration_no', hospitalRegistrationNo)
      .single()

    if (hospitalError) {
      throw hospitalError
    }

    const { data: hospitalAdmins, error: hospitalAdminsError } = await adminClient
      .from('profiles')
      .select('name, email')
      .eq('role', 'hospital_admin')
      .eq('hospital_id', hospitalRegistrationNo)

    if (hospitalAdminsError) {
      throw hospitalAdminsError
    }

    const recipients = (hospitalAdmins || [])
      .filter((adminProfile) => !!adminProfile.email)
      .map((adminProfile) => ({
        email: adminProfile.email,
        administratorName: adminProfile.name || hospital.administrator_name || 'Hospital Admin',
      }))

    if (recipients.length === 0 && hospital.email) {
      recipients.push({
        email: hospital.email,
        administratorName: hospital.administrator_name || 'Hospital Admin',
      })
    }

    if (recipients.length === 0) {
      return {
        success: false,
        error: 'No email recipient found for this hospital registration',
      }
    }

    await Promise.all(
      recipients.map((recipient) =>
        sendHospitalDetailsRequestEmail({
          email: recipient.email,
          hospitalName: hospital.name,
          administratorName: recipient.administratorName,
          requestedBy: profile.email || profile.name || 'Super Admin',
          note,
        })
      )
    )

    return {
      success: true,
      message: 'Details request email sent successfully',
    }
  } catch (error) {
    console.error('Error requesting hospital details:', error)
    return {
      success: false,
      error: error.message || 'Failed to request details',
    }
  }
}

export async function createSuperAdminAccount(formData) {
  try {
    await requireSuperAdmin()

    const { name, email, mobile, password, registrationNo } = formData || {}

    if (!name || !email || !mobile || !password) {
      return {
        success: false,
        error: 'Name, email, mobile, and password are required',
      }
    }

    const adminClient = await createAdminClient()

    // Ensure a unique registration number.
    let finalRegistrationNo = (registrationNo || '').trim().toUpperCase()
    if (!finalRegistrationNo) {
      finalRegistrationNo = generateUserRegistrationNo('super_admin')
    }

    for (let i = 0; i < 5; i += 1) {
      const { data: existingProfile, error: existingProfileError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('registration_no', finalRegistrationNo)
        .maybeSingle()

      if (existingProfileError) {
        throw existingProfileError
      }

      if (!existingProfile) {
        break
      }

      finalRegistrationNo = generateUserRegistrationNo('super_admin')
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        fullName: name,
        role: 'super_admin',
      },
    })

    if (authError || !authData?.user) {
      throw new Error(authError?.message || 'Failed to create auth account')
    }

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: authData.user.id,
      registration_no: finalRegistrationNo,
      name,
      email,
      mobile,
      role: 'super_admin',
      status: 'active',
      access_granted: true,
      hospital_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    return {
      success: true,
      data: {
        email,
        registrationNo: finalRegistrationNo,
      },
      message: 'Super admin account created successfully',
    }
  } catch (error) {
    console.error('Error creating super admin account:', error)
    return {
      success: false,
      error: error.message || 'Failed to create super admin account',
    }
  }
}