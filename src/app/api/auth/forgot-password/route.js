import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPasswordResetEmail } from '@/lib/email/send-email'

// nodemailer needs real TCP sockets, which the edge runtime does not have.
export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Forgot-password (own JWT flow, NOT Supabase's email reset).
 * Accepts a registration number, looks up the on-file email, and emails a
 * short-lived JWT reset link. Always responds with a generic success so the
 * endpoint can't be used to discover which registration numbers exist.
 */
export async function POST(request) {
  const generic = NextResponse.json(
    {
      success: true,
      message: 'If an account exists for that registration number, a reset link has been sent.',
    },
    { status: 200 }
  )

  try {
    const { registrationNo } = await request.json()
    if (!registrationNo || !registrationNo.trim()) {
      return NextResponse.json(
        { error: 'Registration number is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = await createAdminClient()
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, registration_no, status, role')
      .eq('registration_no', registrationNo.trim())
      .single()

    // Unknown registration or no email on file -> stay generic.
    if (!profile || !profile.email) return generic

    // Send without blocking the response -- same reason as the registration
    // route. This endpoint deliberately answers the same way whether or not the
    // account exists, so there is nothing in the reply that depends on the send
    // succeeding; awaiting Gmail only exposed the request to a serverless
    // timeout, which turned "we mailed you a link" into no response at all.
    sendPasswordResetEmail({
      email: profile.email,
      name: profile.name,
      registration_no: profile.registration_no,
      user_id: profile.id,
    })
      .then((result) => {
        if (!result?.success) {
          console.error('[ForgotPassword] email failed:', result?.error)
        }
      })
      .catch((error) => {
        console.error('[ForgotPassword] email threw:', error)
      })

    return generic
  } catch (error) {
    console.error('[ForgotPassword] error:', error)
    // Still generic on unexpected errors to avoid leaking internals.
    return generic
  }
}
