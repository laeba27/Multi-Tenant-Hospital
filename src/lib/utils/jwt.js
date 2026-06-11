import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

function assertJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT secret is not configured')
  }
}

// Generate a staff invite token
export function generateStaffInviteToken(staffData) {
  assertJwtSecret()
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

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // Token valid for 7 days
    issuer: 'smile-returns',
    audience: 'staff-invitation'
  })

  return token
}

// Verify and decode a staff invite token (server-side only)
export function verifyStaffInviteToken(token) {
  try {
    assertJwtSecret()
    const decoded = jwt.verify(token, JWT_SECRET, {
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
  assertJwtSecret()
  const payload = {
    user_id,
    email,
    registration_no,
    type: 'password_reset',
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h', // short-lived reset link
    issuer: 'smile-returns',
    audience: 'password-reset',
  })
}

// Verify and decode a password reset token (server-side only)
export function verifyPasswordResetToken(token) {
  try {
    assertJwtSecret()
    const decoded = jwt.verify(token, JWT_SECRET, {
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

// Decode a password reset token without verifying signature (client display only)
export function decodePasswordResetToken(token) {
  try {
    const decoded = jwt.decode(token)
    if (!decoded || decoded.type !== 'password_reset') {
      throw new Error('Invalid reset token')
    }
    return { valid: true, data: decoded }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

// Decode token payload without verifying signature (for client-side display only)
export function decodeStaffInviteToken(token) {
  try {
    const decoded = jwt.decode(token)
    if (!decoded) {
      throw new Error('Invalid invitation token')
    }

    if (decoded.type !== 'staff_invite') {
      throw new Error('Invalid token type')
    }

    return { valid: true, data: decoded }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}
