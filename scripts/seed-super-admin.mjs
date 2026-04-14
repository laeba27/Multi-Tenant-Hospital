import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const [email, password, registrationNo, nameArg, mobileArg] = process.argv.slice(2)

if (!email || !password || !registrationNo) {
  console.error('Usage: node scripts/seed-super-admin.mjs <email> <password> <registrationNo> [name] [mobile]')
  process.exit(1)
}

const name = nameArg || 'Primary Super Admin'
const mobile = mobileArg || '9999999999'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function findUserByEmail(targetEmail) {
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const users = data?.users || []
    const matchedUser = users.find((user) => user.email?.toLowerCase() === targetEmail.toLowerCase())

    if (matchedUser) return matchedUser
    if (users.length < perPage) return null

    page += 1
  }
}

async function run() {
  try {
    let authUser = await findUserByEmail(email)

    if (!authUser) {
      const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          fullName: name,
          role: 'super_admin',
        },
      })

      if (createUserError || !createdUserData?.user) {
        throw new Error(createUserError?.message || 'Failed to create auth user')
      }

      authUser = createdUserData.user
      console.log('Created auth user:', authUser.id)
    } else {
      const { error: updateUserError } = await adminClient.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          fullName: name,
          role: 'super_admin',
        },
      })

      if (updateUserError) {
        throw new Error(updateUserError.message || 'Failed to update existing auth user')
      }

      console.log('Updated existing auth user:', authUser.id)
    }

    const { data: existingRegistration, error: existingRegistrationError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('registration_no', registrationNo)
      .maybeSingle()

    if (existingRegistrationError) {
      throw existingRegistrationError
    }

    if (existingRegistration && existingRegistration.id !== authUser.id) {
      throw new Error(`Registration number ${registrationNo} is already used by another account`)
    }

    const { error: upsertProfileError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          registration_no: registrationNo,
          name,
          email,
          mobile,
          role: 'super_admin',
          status: 'active',
          access_granted: true,
          hospital_id: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (upsertProfileError) {
      throw upsertProfileError
    }

    console.log('Super admin profile is ready.')
    console.log(`Email: ${email}`)
    console.log(`Registration No: ${registrationNo}`)
  } catch (error) {
    console.error('Failed to seed super admin:', error.message)
    process.exit(1)
  }
}

run()
