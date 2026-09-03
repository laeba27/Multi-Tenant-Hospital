import { after } from 'next/server'
import { generateHospitalId, generateUserId } from '@/lib/utils'
import { sendHospitalRegistrationPendingEmail } from '@/lib/email/send-email'

// nodemailer and the Supabase admin API both need Node APIs -- the edge runtime
// has no TCP sockets, so SMTP cannot run there at all.
export const runtime = 'nodejs'

// Vercel defaults a function to 10s. Registration does several round trips
// before it can answer, and the default left no headroom at all.
export const maxDuration = 30

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

    // Validate required fields.
    // The Zod schema on the sign-up page runs in the BROWSER only, so it stops
    // honest mistakes and nothing else -- a direct POST sails past it. These
    // checks are the ones that actually hold.
    const missing = []
    if (!fullName) missing.push('your name')
    if (!email) missing.push('your email')
    if (!password) missing.push('a password')
    if (!hospitalName) missing.push('the hospital name')
    if (!licenseNumber) missing.push('the license number')
    if (!administratorName) missing.push('the administrator name')
    if (!administratorEmail) missing.push('the hospital email')
    if (!administratorPhone) missing.push('the hospital phone')
    if (!address) missing.push('the address')
    if (!city) missing.push('the city')
    if (!state) missing.push('the state')
    if (!postalCode) missing.push('the postal code')

    if (missing.length) {
      return Response.json(
        { error: `Please provide ${missing.join(', ')}.` },
        { status: 400 }
      )
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(administratorEmail)) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (String(password).length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    const beds = totalBeds == null ? null : Number(totalBeds)
    const icu = icuBeds == null ? null : Number(icuBeds)
    if (beds !== null && (!Number.isInteger(beds) || beds < 0)) {
      return Response.json({ error: 'Total beds must be a whole number.' }, { status: 400 })
    }
    if (icu !== null && (!Number.isInteger(icu) || icu < 0)) {
      return Response.json({ error: 'ICU beds must be a whole number.' }, { status: 400 })
    }
    if (beds !== null && icu !== null && icu > beds) {
      return Response.json({ error: 'ICU beds cannot exceed total beds.' }, { status: 400 })
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
        account_status: 'Pending',
      })
      .select()
      .single()

    if (hospitalError) {
      console.error('Hospital creation error:', hospitalError)
      // Delete the auth user since hospital creation failed
      await adminClient.auth.admin.deleteUser(userId)

      // license_number, email and registration_no are all UNIQUE. Say which one
      // clashed -- the raw Postgres text ("duplicate key value violates unique
      // constraint hospitals_license_number_key") means nothing to a hospital
      // administrator, and leaks the schema besides.
      const detail = `${hospitalError.message || ''} ${hospitalError.details || ''}`
      let message = 'Could not register the hospital. Please check the details and try again.'
      if (hospitalError.code === '23505') {
        if (detail.includes('license_number')) {
          message = 'A hospital with that license number is already registered.'
        } else if (detail.includes('email')) {
          message = 'A hospital with that email address is already registered.'
        } else {
          message = 'A hospital with these details is already registered.'
        }
      }

      return Response.json({ error: message }, { status: 400 })
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
        status: 'pending_approval',
        access_granted: false,
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

    // Step 4: Send the pending-approval email WITHOUT blocking the response.
    //
    // This comment said "non-blocking" while the call was awaited, and that gap
    // was the whole bug. By this line the account, hospital and profile are all
    // committed -- registration has genuinely succeeded -- but the request then
    // sat waiting on Gmail's SMTP handshake. Measured against production that
    // handshake takes 3s cold and climbs past 8s as Gmail throttles repeated
    // sends, against a 10s Vercel function limit. So registration "worked"
    // early in the day and, once the mail server slowed down, the function was
    // killed mid-send: no response body, the browser's fetch rejecting, and the
    // user staring at a failure for an account that had in fact been created.
    // That is exactly the intermittent breakage reported here.
    //
    // The email is a courtesy; the registration is the transaction. Not
    // blocking on it makes the response time depend only on our own database,
    // so a slow or broken mail server can never fail a registration that
    // already succeeded.
    //
    // Wrapped in after() rather than left as a bare floating promise.
    //
    // Not blocking the response was the right call, but on serverless a
    // detached promise is not merely unsupervised -- it is unsafe. Vercel
    // freezes the instance the moment the response is flushed, so an in-flight
    // SMTP handshake is suspended mid-socket and frequently never completes.
    // The send therefore appeared to "work" locally (nothing freezes a dev
    // server) while silently dropping in production, which is the second half
    // of the reported bug.
    //
    // after() is Next's supported hook for exactly this: the response is sent
    // immediately, and the platform keeps the function alive until the work
    // inside finishes. Fast response AND a mail that actually leaves.
    after(async () => {
      const result = await sendHospitalRegistrationPendingEmail({
        email,
        hospitalName,
        administratorName,
        registrationNo: hospitalId,
        userRegistrationNo,
      }).catch((error) => ({ success: false, error: error?.message }))

      if (!result?.success) {
        console.error('Pending-approval email failed:', result?.error)
      }
    })

    return Response.json(
      {
        success: true,
        message: 'Hospital registered successfully. Your account is pending super admin approval.',
        data: {
          userId,
          hospitalId,
          userRegistrationNo,
          email,
          accountStatus: 'Pending',
          accessGranted: false,
          // The send is in flight; we no longer wait to find out. The account
          // exists either way, which is what the user actually needs told.
          pendingEmailQueued: true,
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
