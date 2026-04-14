import { NextResponse } from 'next/server'
import { verifyStaffInviteToken } from '@/lib/utils/jwt'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Verify JWT token
    const verification = verifyStaffInviteToken(token)
    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation link' },
        { status: 401 }
      )
    }

    const { email, name, role, hospital_id, registration_no, mobile, user_id } = verification.data
    console.log('[VerifyInvite] Token payload:', {
      email,
      role,
      hospital_id,
      registration_no,
      user_id
    })

    const supabaseAdmin = await createAdminClient()

    try {
      // 1. Find the auth user that was created during invite
      console.log('[VerifyInvite] Looking up auth user for:', email)
      let existingUser = null

      if (user_id) {
        console.log('[VerifyInvite] Attempting lookup by user_id:', user_id)
        const { data: userById, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user_id)
        if (getUserError) {
          console.error('Get user by id error:', getUserError)
          return NextResponse.json(
            { error: 'Failed to find user account' },
            { status: 400 }
          )
        }
        existingUser = userById?.user
        console.log('[VerifyInvite] Lookup by ID result:', existingUser ? 'found' : 'not found')
      }

      if (!existingUser) {
        console.log('[VerifyInvite] Falling back to listUsers search for email')
        const { users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (listError) {
          console.error('List users error:', listError)
          return NextResponse.json(
            { error: 'Failed to find user account' },
            { status: 400 }
          )
        }
        console.log('[VerifyInvite] Users returned:', users?.length || 0)
        existingUser = users?.find(u => u.email === email)
      }

      if (!existingUser) {
        console.warn('[VerifyInvite] No auth user matched token details')
        return NextResponse.json(
          { error: 'User account not found' },
          { status: 404 }
        )
      }

      console.log('[VerifyInvite] Auth user found:', {
        id: existingUser.id,
        email: existingUser.email,
        email_confirmed_at: existingUser.email_confirmed_at
      })

      const userId = existingUser.id
      console.log('Auth user found with ID:', userId)

      // 2. Update auth user with password and verified status
      console.log('Updating auth user with password...')
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true
      })

      if (updateAuthError) {
        console.error('Auth update error:', updateAuthError)
        return NextResponse.json(
          { error: updateAuthError.message || 'Failed to update account' },
          { status: 400 }
        )
      }

      console.log('Auth user password set and verified')

      // 3. Update profile status from 'invited' to 'active'
      console.log('Updating profile to active status...')
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          status: 'active',
          access_granted: true,
          updated_at: new Date().toISOString()
        })
        .eq('registration_no', registration_no)

      if (updateError) {
        console.error('Profile update error:', updateError)
        // Try to delete the auth user we just created
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId)
        } catch (deleteError) {
          console.error('Failed to rollback auth user:', deleteError)
        }
        return NextResponse.json(
          { error: 'Failed to verify registration' },
          { status: 500 }
        )
      }

      console.log('Staff verification successful')

      return NextResponse.json(
        {
          success: true,
          message: 'Your account has been successfully created!',
          user: {
            id: userId,
            email: email,
            name: name
          }
        },
        { status: 200 }
      )
    } catch (error) {
      console.error('Verification error:', error)
      return NextResponse.json(
        { error: error.message || 'Verification failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
