import { generateHospitalId, generateUserId } from '@/lib/utils'

// Create admin client
function createAdminClient() {
  return require('@supabase/supabase-js').createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export async function POST(request) {
  try {
    const body = await request.json()

    const {
      fullName,
      email,
      phone,
      password,
      hospitalName,
      licenseNumber,
      administratorName,
      administratorEmail,
      administratorPhone,
      address,
      city,
      state,
      postalCode,
      hospitalType,
      website,
      totalBeds,
      icuBeds,
      services,
      feedbackEnabled,
    } = body

    // Validate required fields
    if (!email || !password || !hospitalName || !licenseNumber) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create admin client
    const adminClient = createAdminClient()

    // Step 1: Create Supabase Auth user using admin API (with email confirmation)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email to skip email verification
      user_metadata: {
        fullName,
        phone,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return Response.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return Response.json(
        { error: 'User creation failed' },
        { status: 400 }
      )
    }

    const userId = authData.user.id
    const hospitalId = generateHospitalId()
    const userRegistrationNo = generateUserId('hospital_admin')

    // Step 2: Create hospital record
    const { data: hospitalData, error: hospitalError } = await adminClient
      .from('hospitals')
      .insert({
        registration_no: hospitalId,
        name: hospitalName,
        license_number: licenseNumber,
        administrator_name: administratorName,
        email: administratorEmail || email,
        phone: administratorPhone,
        address: address,
        city: city,
        state: state,
        postal_code: postalCode,
        hospital_type: hospitalType || null,
        website: website || null,
        total_beds: totalBeds || null,
        icu_beds: icuBeds || null,
        emergency_services: services?.emergency || false,
        inpatient_services: services?.inpatient || false,
        ambulance_services: services?.ambulance || false,
        feedback_enabled: feedbackEnabled || false,
        account_status: 'Active',
      })
      .select()
      .single()

    if (hospitalError) {
      console.error('Hospital creation error:', hospitalError)
      // Delete the auth user since hospital creation failed
      await adminClient.auth.admin.deleteUser(userId)
      return Response.json(
        { error: 'Failed to register hospital: ' + hospitalError.message },
        { status: 400 }
      )
    }

    // Step 3: Create profile record with hospital reference
    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: userId,
        registration_no: userRegistrationNo,
        name: fullName,
        email: email,
        mobile: phone,
        role: 'hospital_admin',
        hospital_id: hospitalId,
        status: 'active',
        access_granted: true,
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Delete hospital and auth user since profile creation failed
      await adminClient.from('hospitals').delete().eq('registration_no', hospitalId)
      await adminClient.auth.admin.deleteUser(userId)
      return Response.json(
        { error: 'Failed to create profile: ' + profileError.message },
        { status: 400 }
      )
    }

    return Response.json(
      {
        success: true,
        message: 'Hospital registered successfully',
        data: {
          userId,
          hospitalId,
          userRegistrationNo,
          email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return Response.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
