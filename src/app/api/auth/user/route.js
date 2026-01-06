import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    )

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with hospital info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        `
        id,
        registration_no,
        name,
        email,
        mobile,
        role,
        status,
        hospital_id,
        access_granted,
        avatar_url,
        created_at,
        hospitals:hospital_id(
          id,
          registration_no,
          name,
          email,
          phone,
          address,
          city,
          state,
          postal_code,
          hospital_type,
          total_beds,
          icu_beds
        )
      `
      )
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile query error:', profileError)
      return Response.json(
        { error: `Failed to fetch profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    if (!profile) {
      return Response.json(
        { error: 'Profile not found for this user' },
        { status: 404 }
      )
    }

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        profile: profile,
      },
    })
  } catch (error) {
    console.error('Error fetching user details:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
