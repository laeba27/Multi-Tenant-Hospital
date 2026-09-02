/**
 * Signature-free token decoding, safe for the browser.
 *
 * This is deliberately separate from ./jwt.js. That module reads JWT_SECRET and
 * signs tokens, so importing it from a client component dragged the whole
 * `jsonwebtoken` library -- and a module that expects a server-only secret --
 * into the browser bundle. The decode helpers below need no secret at all, so
 * client pages import this file instead and the signing code stays on the
 * server where it belongs.
 *
 * Decoding does NOT verify anything. Treat the result as untrusted display data
 * only; the server re-verifies the signature before acting on any of it.
 */

/** Decode a base64url segment without pulling in a JWT library. */
function decodeSegment(segment) {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

  // atob exists in browsers and in modern Node; Buffer covers older Node.
  const json =
    typeof atob === 'function'
      ? decodeURIComponent(
          atob(padded)
            .split('')
            .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('')
        )
      : Buffer.from(padded, 'base64').toString('utf8')

  return JSON.parse(json)
}

function decodePayload(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) {
    throw new Error('Malformed token')
  }
  return decodeSegment(parts[1])
}

// Decode a staff invite token for display only (no signature check).
export function decodeStaffInviteToken(token) {
  try {
    const decoded = decodePayload(token)
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

// Decode a password reset token for display only (no signature check).
export function decodePasswordResetToken(token) {
  try {
    const decoded = decodePayload(token)
    if (!decoded || decoded.type !== 'password_reset') {
      throw new Error('Invalid reset token')
    }
    return { valid: true, data: decoded }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}
