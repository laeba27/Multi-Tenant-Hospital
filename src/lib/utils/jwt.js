import 'server-only'
import jwt from 'jsonwebtoken'

/**
 * Read the secret at call time, not at module load.
 *
 * Read at module scope, JWT_SECRET is captured once when the module is first
 * imported. On a serverless platform that can happen during the build, before
 * runtime environment variables are attached -- so the constant froze to
 * undefined and every later sign/verify failed, while a long-lived local dev
 * server (which always has the variable by then) worked fine. A function call
 * sees whatever is actually set at the moment it runs.
 *
 * The `server-only` import above makes importing this file from a client
 * component a build error, so the signing path can never reach the browser.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim()

  if (!secret) {
    throw new Error(
      'JWT_SECRET is not configured. Set it in the Vercel project environment variables.'
    )
  }

  return secret
}

// Generate a staff invite token
export function generateStaffInviteToken(staffData) {
  const payload = {
    email: staffData.email,
    name: staffData.name,
    role: staffData.role,
    hospital_id: staffData.hospital_id,
    registration_no: staffData.registration_no,
    mobile: staffData.mobile,
    user_id: staffData.user_id,
    type: 'staff_invite'
  }

  const token = jwt.sign(payload, getJwtSecret(), {
    expiresIn: '7d', // Token valid for 7 days
    issuer: 'smile-returns',
    audience: 'staff-invitation'
  })

  return token
}

// Verify and decode a staff invite token (server-side only)
export function verifyStaffInviteToken(token) {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'smile-returns',
      audience: 'staff-invitation'
    })

    if (decoded.type !== 'staff_invite') {
      throw new Error('Invalid token type')
    }

    return { valid: true, data: decoded }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

// Generate a password reset token (own flow -- not Supabase's email reset)
export function generatePasswordResetToken({ user_id, email, registration_no }) {
  const payload = {
    user_id,
    email,
    registration_no,
    type: 'password_reset',
  }

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '1h', // short-lived reset link
    issuer: 'smile-returns',
    audience: 'password-reset',
  })
}

// Verify and decode a password reset token (server-side only)
export function verifyPasswordResetToken(token) {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'smile-returns',
      audience: 'password-reset',
    })

    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid token type')
    }

    return { valid: true, data: decoded }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

// The signature-free decoders moved to ./jwt-decode.js so client components can
// use them without importing this server-only module. Re-exported here so
// existing server-side imports keep working.
export { decodeStaffInviteToken, decodePasswordResetToken } from './jwt-decode'
