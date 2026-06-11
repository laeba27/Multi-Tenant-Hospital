import { NextResponse } from 'next/server'
import { createClient as createStatelessClient } from '@supabase/supabase-js'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Self-service password reset for a signed-in user.
 * Mirrors the staff-invite mechanism (admin updateUserById) instead of the
 * Supabase email reset flow: verify the current password, then set the new one.
 */
export async function POST(request) {
  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current and new password are required' },
        { status: 400 }
      )
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: 'New password must be different from the current one' },
        { status: 400 }
      )
    }

    // 1. Confirm the caller is signed in.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 2. Verify the current password by attempting a sign-in with it.
    //    Uses a stateless client (no cookie persistence) so the active
    //    session cookies are never overwritten by this check.
    const verifyClient = createStatelessClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // 3. Set the new password using the admin client (same as staff invite).
    const supabaseAdmin = await createAdminClient()
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )
    if (updateError) {
      console.error('[ResetPassword] update error:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Password updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[ResetPassword] API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
