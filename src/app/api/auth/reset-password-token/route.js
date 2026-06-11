import { NextResponse } from 'next/server'
import { verifyPasswordResetToken } from '@/lib/utils/jwt'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Complete a password reset using the emailed JWT link.
 * Mirrors the staff-invite mechanism: verify the token, then set the new
 * password via the admin client. No Supabase email reset is involved.
 */
export async function POST(request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // 1. Verify the reset token.
    const verification = verifyPasswordResetToken(token)
    if (!verification.valid) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 401 }
      )
    }

    const { user_id, email, registration_no } = verification.data
    const supabaseAdmin = await createAdminClient()

    // 2. Resolve the auth user (by id, falling back to email lookup).
    let userId = user_id
    if (!userId && email) {
      const { users } = await supabaseAdmin.auth.admin.listUsers()
      userId = users?.find((u) => u.email === email)?.id
    }
    if (!userId) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 })
    }

    // 3. Set the new password.
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password, email_confirm: true }
    )
    if (updateError) {
      console.error('[ResetPasswordToken] update error:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Your password has been reset. You can now sign in.',
        registration_no: registration_no || null,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[ResetPasswordToken] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
