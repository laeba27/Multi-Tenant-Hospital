import { NextResponse } from 'next/server'
import { verifyStaffInviteToken } from '@/lib/utils/jwt'
import { createAdminClient } from '@/lib/supabase/server'

// The Supabase admin API needs Node APIs the edge runtime does not have, and
// walking the user pages can outlast the default limit on a large tenant.
export const runtime = 'nodejs'
export const maxDuration = 30

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

        // Do NOT bail out here. getUserById returns a 404 user_not_found
        // whenever the id in the token no longer resolves -- the account was
        // recreated, or the invite was reissued and carries an older id. This
        // used to return 400 immediately, which made the email fallback below
        // dead code for every token that carried a user_id (i.e. all of them)
        // and surfaced as "Failed to find user account" on a link that was
        // perfectly valid. Log it and let the email lookup decide.
        if (getUserError) {
          console.warn('[VerifyInvite] Lookup by id failed, trying email:', getUserError.message)
        }
        existingUser = userById?.user || null
        console.log('[VerifyInvite] Lookup by ID result:', existingUser ? 'found' : 'not found')
      }

      if (!existingUser) {
        console.log('[VerifyInvite] Falling back to paged listUsers search for email')

        // listUsers() is paginated and defaults to 50 per page. A single bare
        // call silently stopped looking after the 50th user, so on a tenant
        // with more accounts than that the invite failed in production while
        // still working on a small local database. Walk the pages.
        let listFailed = false
        for (let page = 1; ; page += 1) {
          const { data: pageData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: 200,
          })
          if (listError) {
            console.error('List users error:', listError)
            listFailed = true
            break
          }

          const batch = pageData?.users || []
          existingUser = batch.find((u) => u.email?.toLowerCase() === String(email).toLowerCase())
          if (existingUser || batch.length < 200) break
        }

        if (!existingUser && listFailed) {
          return NextResponse.json(
            { error: 'Failed to find user account' },
            { status: 400 }
          )
        }
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

        // Deliberately NOT deleting the auth user here. This route does not
        // create that account -- inviteStaff already did, before the email went
        // out -- so deleting it destroys a real staff member's login over a
        // transient profile-update failure and makes the invite permanently
        // unusable. The password is already set, so the row can be corrected
        // and the invite retried.
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
