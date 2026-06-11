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

/**
 * Suspend or reactivate a hospital's portal access.
 * grant=false → hospital + its admins lose access (status 'Suspended').
 * grant=true  → restored to 'Active' with access granted.
 */
export async function setHospitalAccess(hospitalRegistrationNo, grant) {
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
        account_status: grant ? 'Active' : 'Suspended',
        updated_at: now,
      })
      .eq('registration_no', hospitalRegistrationNo)
      .select('registration_no, name')
      .single()

    if (hospitalError) throw hospitalError

    const { error: adminsError } = await adminClient
      .from('profiles')
      .update({
        access_granted: grant,
        status: grant ? 'active' : 'suspended',
        updated_at: now,
      })
      .eq('role', 'hospital_admin')
      .eq('hospital_id', hospitalRegistrationNo)

    if (adminsError) throw adminsError

    return {
      success: true,
      message: grant
        ? `Access restored for ${hospital.name}`
        : `${hospital.name} suspended`,
    }
  } catch (error) {
    console.error('Error updating hospital access:', error)
    return { success: false, error: error.message || 'Failed to update hospital access' }
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

function monthKey(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function lastSixMonths() {
  const out = []
  const now = new Date()
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      appointments: 0,
    })
  }
  return out
}

/**
 * Per-hospital analytics for the super admin — profiles created (staff, doctors,
 * patients), appointment breakdowns and department activity for ANY hospital.
 * Mirrors the hospital-admin analytics shape so the views stay consistent.
 */
export async function getHospitalAnalyticsForSuperAdmin(registrationNo) {
  try {
    await requireSuperAdmin()

    if (!registrationNo) {
      return { success: false, error: 'Hospital registration number is required' }
    }

    const adminClient = await createAdminClient()

    const { data: hospital, error: hospitalError } = await adminClient
      .from('hospitals')
      .select('id, registration_no, name, email, phone, city, state, administrator_name, license_number, account_status, created_at')
      .eq('registration_no', registrationNo)
      .single()

    if (hospitalError || !hospital) {
      return { success: false, error: 'Hospital not found' }
    }

    const regNo = hospital.registration_no
    const hospitalUuid = hospital.id

    const [staffRes, patientsRes, apptRes, deptRes, adminRes] = await Promise.all([
      adminClient.from('staff').select('id, role').eq('hospital_id', regNo),
      adminClient.from('patients').select('id', { count: 'exact', head: true }).eq('hospital_id', regNo),
      adminClient
        .from('appointments')
        .select('id, appointment_type, status, appointment_date, department_id')
        .eq('hospital_id', regNo),
      adminClient.from('departments').select('id, name').eq('hospital_id', hospitalUuid),
      adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'hospital_admin')
        .eq('hospital_id', regNo),
    ])

    const staff = staffRes.data || []
    const appts = apptRes.data || []
    const departments = deptRes.data || []

    // Staff breakdown by role.
    const roleCounts = {}
    for (const s of staff) {
      const r = s.role || 'other'
      roleCounts[r] = (roleCounts[r] || 0) + 1
    }

    // Appointment type + status breakdowns.
    const typeCounts = { consultation: 0, treatment: 0, both: 0, other: 0 }
    const statusCounts = {}
    for (const a of appts) {
      const t = (a.appointment_type || 'consultation').toLowerCase()
      if (typeCounts[t] != null) typeCounts[t] += 1
      else typeCounts.other += 1
      const s = a.status || 'scheduled'
      statusCounts[s] = (statusCounts[s] || 0) + 1
    }

    // Appointments per department.
    const deptNames = new Map(departments.map((d) => [d.id, d.name]))
    const deptCounts = {}
    for (const a of appts) {
      if (!a.department_id) continue
      deptCounts[a.department_id] = (deptCounts[a.department_id] || 0) + 1
    }

    // Monthly appointment activity (last 6 months).
    const monthly = lastSixMonths()
    const monthIndex = new Map(monthly.map((m, i) => [m.key, i]))
    for (const a of appts) {
      const key = monthKey(a.appointment_date)
      if (key && monthIndex.has(key)) monthly[monthIndex.get(key)].appointments += 1
    }

    return {
      success: true,
      data: {
        hospital: {
          name: hospital.name,
          registration_no: hospital.registration_no,
          email: hospital.email,
          phone: hospital.phone,
          city: hospital.city,
          state: hospital.state,
          administrator_name: hospital.administrator_name,
          license_number: hospital.license_number,
          account_status: hospital.account_status,
          created_at: hospital.created_at,
        },
        totals: {
          staff: staff.length,
          doctors: roleCounts.doctor || 0,
          patients: patientsRes.count || 0,
          appointments: appts.length,
          departments: departments.length,
          admins: adminRes.count || 0,
        },
        staffByRole: Object.entries(roleCounts).map(([name, value]) => ({
          name: name.replace(/_/g, ' '),
          value,
        })),
        apptByType: [
          { name: 'Consultation', value: typeCounts.consultation },
          { name: 'Treatment', value: typeCounts.treatment },
          { name: 'Both', value: typeCounts.both },
          ...(typeCounts.other ? [{ name: 'Other', value: typeCounts.other }] : []),
        ].filter((d) => d.value > 0),
        apptByStatus: Object.entries(statusCounts).map(([name, value]) => ({
          name: name.replace(/_/g, ' '),
          value,
        })),
        byDepartment: Object.entries(deptCounts)
          .map(([id, value]) => ({ name: deptNames.get(id) || 'Unknown', value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8),
        monthly,
      },
    }
  } catch (error) {
    console.error('Error loading hospital analytics for super admin:', error)
    return { success: false, error: error.message || 'Failed to load hospital analytics' }
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

/**
 * Recent notices across ALL hospitals (global feed for the super admin).
 * Fails soft to an empty list if the notices table is not present yet.
 */
export async function getGlobalNotices(limit = 30) {
  try {
    await requireSuperAdmin()
    const adminClient = await createAdminClient()

    const { data, error } = await adminClient
      .from('notices')
      .select('id, hospital_id, title, body, category, is_pinned, published_at')
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error loading notices:', error.message)
      return { success: true, data: [] }
    }

    const hospitalIds = [...new Set((data || []).map((n) => n.hospital_id).filter(Boolean))]
    let nameMap = {}
    if (hospitalIds.length > 0) {
      const { data: hosp } = await adminClient
        .from('hospitals')
        .select('registration_no, name')
        .in('registration_no', hospitalIds)
      nameMap = Object.fromEntries((hosp || []).map((h) => [h.registration_no, h.name]))
    }

    return {
      success: true,
      data: (data || []).map((n) => ({ ...n, hospital_name: nameMap[n.hospital_id] || n.hospital_id })),
    }
  } catch (error) {
    console.error('Error loading global notices:', error)
    return { success: false, error: error.message || 'Failed to load notices', data: [] }
  }
}


/**
 * Super admin creates a new hospital + its hospital_admin account.
 * Optionally auto-approves (grants access immediately).
 */
export async function createHospital(formData) {
  try {
    await requireSuperAdmin()
    const adminClient = await createAdminClient()

    const {
      hospitalName,
      licenseNumber,
      adminName,
      email,
      password,
      phone,
      address,
      city,
      state,
      postalCode,
      autoApprove = false,
    } = formData || {}

    if (!hospitalName?.trim() || !licenseNumber?.trim() || !email?.trim() || !password) {
      return { success: false, error: 'Hospital name, license, admin email and password are required' }
    }

    // 1) Auth user for the hospital admin.
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { fullName: adminName || hospitalName, role: 'hospital_admin' },
    })
    if (authError || !authData?.user) {
      return { success: false, error: authError?.message || 'Failed to create admin account' }
    }
    const userId = authData.user.id

    const hospitalId = generateHospitalRegistrationNo()
    const userRegistrationNo = generateUserRegistrationNo('hospital_admin')
    const now = new Date().toISOString()

    // 2) Hospital.
    const { error: hospitalError } = await adminClient.from('hospitals').insert({
      registration_no: hospitalId,
      name: hospitalName.trim(),
      license_number: licenseNumber.trim(),
      administrator_name: adminName || null,
      email: email.trim(),
      phone: phone || null,
      address: address || null,
      city: city || null,
      state: state || null,
      postal_code: postalCode || null,
      account_status: autoApprove ? 'Active' : 'Pending',
      created_at: now,
      updated_at: now,
    })
    if (hospitalError) {
      await adminClient.auth.admin.deleteUser(userId)
      return { success: false, error: 'Failed to create hospital: ' + hospitalError.message }
    }

    // 3) Hospital admin profile.
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: userId,
      registration_no: userRegistrationNo,
      name: adminName || hospitalName.trim(),
      email: email.trim(),
      mobile: phone || null,
      role: 'hospital_admin',
      hospital_id: hospitalId,
      status: autoApprove ? 'active' : 'pending_approval',
      access_granted: !!autoApprove,
    })
    if (profileError) {
      await adminClient.from('hospitals').delete().eq('registration_no', hospitalId)
      await adminClient.auth.admin.deleteUser(userId)
      return { success: false, error: 'Failed to create admin profile: ' + profileError.message }
    }

    return {
      success: true,
      message: `Hospital ${hospitalName} created${autoApprove ? ' and approved' : ' (pending approval)'}`,
      data: { hospitalId, userRegistrationNo },
    }
  } catch (error) {
    console.error('Error creating hospital:', error)
    return { success: false, error: error.message || 'Failed to create hospital' }
  }
}
