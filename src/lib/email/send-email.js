import nodemailer from 'nodemailer'
import { generateStaffInviteToken, generatePasswordResetToken } from '@/lib/utils/jwt'
import {
  layout,
  button,
  linkFallback,
  detailsTable,
  codeRow,
  notice,
  p as para,
  fineprint,
  currentYear,
} from './template'

/**
 * The base URL every link in an email is built from.
 *
 * This used to be inlined four times with two different fallbacks -- one file
 * said 'https://smile-returns.com', three said 'http://localhost:3000'. So a
 * deployment that forgot NEXT_PUBLIC_APP_URL silently mailed real users a
 * localhost sign-in link, and a localhost staff-invite link, and a localhost
 * password-reset link. One helper, one fallback, and never localhost in prod.
 */
const PROD_FALLBACK = 'https://multi-tenant-hospital.vercel.app'

function appUrl(path = '') {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production' ? PROD_FALLBACK : 'http://localhost:3000')

  return `${base.replace(/\/$/, '')}${path}`
}

/**
 * Build the SMTP transport.
 *
 * The timeouts are the important part. Nodemailer's defaults let a socket hang
 * for ~2 minutes, which is longer than a Vercel serverless function is allowed
 * to live. When Gmail's SMTP handshake was slow the function got killed
 * mid-connect, so the caller never got a return value at all -- a server action
 * that dies this way sends back Next's HTML error page, and the client's
 * JSON.parse on it throws "Unexpected token '<'". Locally nothing is killed, so
 * the same code always appeared to work. Bounding the timeouts below the
 * function limit turns a fatal hang into an ordinary caught error.
 *
 * Port 465 (implicit TLS) connects in one step. Port 587 starts in the clear
 * and upgrades via STARTTLS, which is the leg that tends to stall on serverless
 * networks -- so 465 is the default here, and `secure` is derived from whatever
 * port is actually configured rather than hardcoded.
 */
const createTransporter = () => {
  const port = Number(process.env.EMAIL_PORT) || 465

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    // 465 is implicit TLS; 587/25 begin plaintext and upgrade.
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
}

/**
 * Fail loudly and early when SMTP isn't configured.
 *
 * Without credentials nodemailer still builds a transport and only fails deep
 * inside the connection, producing an error that reads like a network problem
 * rather than "you forgot to set EMAIL_USER in Vercel". Every sender calls this
 * first so a missing variable names itself.
 */
function assertEmailConfigured() {
  const missing = ['EMAIL_USER', 'EMAIL_PASSWORD'].filter((key) => !process.env[key]?.trim())

  if (missing.length) {
    throw new Error(
      `Email is not configured: ${missing.join(', ')} missing. ` +
        `Set these in the Vercel project's environment variables.`
    )
  }
}

// Send registration acknowledgement email while access is pending approval
export async function sendHospitalRegistrationPendingEmail({
  email,
  hospitalName,
  administratorName,
  registrationNo,
  userRegistrationNo,
}) {
  try {
    assertEmailConfigured()
    const transporter = createTransporter()
    const signInLink = appUrl('/auth/sign-in')

    const html = layout({
      title: 'Registration received',
      preheader: `${hospitalName} is awaiting approval. We will email you once access is enabled.`,
      content: `
        ${para(`Hello ${administratorName},`)}
        ${para(
          `Your registration for <strong>${hospitalName}</strong> has been submitted successfully.`
        )}
        ${notice(
          '<strong>Status: pending approval.</strong> A super administrator will review your registration and enable login access. We will email you as soon as that happens.'
        )}
        ${detailsTable(
          codeRow('Hospital registration', registrationNo) +
            codeRow('Admin registration', userRegistrationNo)
        )}
        ${para('Once approved, you will be able to sign in here:')}
        ${button('Go to sign in', signInLink)}
      `,
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: `Registration Pending Approval - ${hospitalName}`,
      html,
      text: `Hello ${administratorName},

Your hospital registration for ${hospitalName} has been received.
Status: Pending Approval

Hospital registration: ${registrationNo}
Admin registration: ${userRegistrationNo}

A super administrator will review your registration and enable login access.
You will receive another email once your account is approved.

Sign in: ${signInLink}

(c) ${currentYear()} Smile Return. All rights reserved.`,
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending pending registration email:', error)
    return { success: false, error: error.message }
  }
}

// Send approval email when super admin enables hospital access
export async function sendHospitalApprovalEmail({
  email,
  hospitalName,
  administratorName,
  registrationNo,
  userRegistrationNo,
}) {
  try {
    assertEmailConfigured()
    const transporter = createTransporter()
    const signInLink = appUrl('/auth/sign-in')

    const html = layout({
      title: 'Your hospital is approved',
      preheader: `${hospitalName} has been approved. You can sign in now.`,
      content: `
        ${para(`Hello ${administratorName},`)}
        ${para(
          `Good news &mdash; <strong>${hospitalName}</strong> has been approved and your login access is now enabled.`
        )}
        ${notice(
          '<strong>You are ready to go.</strong> Sign in to set up departments, doctors and staff.',
          'success'
        )}
        ${detailsTable(
          codeRow('Hospital registration', registrationNo) +
            codeRow('Admin registration', userRegistrationNo)
        )}
        ${button('Sign in to your dashboard', signInLink)}
      `,
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: `Hospital Approved - ${hospitalName}`,
      html,
      text: `Hello ${administratorName},

Your hospital ${hospitalName} has been approved and your login access is now enabled.

Hospital registration: ${registrationNo}
Admin registration: ${userRegistrationNo}

Sign in here:
${signInLink}

(c) ${currentYear()} Smile Return. All rights reserved.`,
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending hospital approval email:', error)
    return { success: false, error: error.message }
  }
}

// Send details request email from super admin to hospital admin
export async function sendHospitalDetailsRequestEmail({
  email,
  hospitalName,
  administratorName,
  requestedBy,
  note,
}) {
  try {
    assertEmailConfigured()
    const transporter = createTransporter()

    const detail =
      note ||
      'Please reply with any missing legal or registration documents and contact details.'

    const html = layout({
      title: 'Additional details requested',
      preheader: `More information is needed to review ${hospitalName}.`,
      content: `
        ${para(`Hello ${administratorName},`)}
        ${para(
          `A super administrator has requested additional details before your registration for <strong>${hospitalName}</strong> can be reviewed.`
        )}
        ${notice(`<strong>Requested by ${requestedBy}</strong><br />${detail}`)}
        ${para('Please reply to this email with the requested information.')}
      `,
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: `Additional Details Required - ${hospitalName}`,
      html,
      text: `Hello ${administratorName},

Additional details are required for your hospital registration: ${hospitalName}.
Requested by: ${requestedBy}

${detail}

Please reply to this email with the requested information.

(c) ${currentYear()} Smile Return. All rights reserved.`,
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending details request email:', error)
    return { success: false, error: error.message }
  }
}

// Send staff invitation email
export async function sendStaffInviteEmail({ email, name, hospitalName, role, staffData, token }) {
  try {
    assertEmailConfigured()
    const transporter = createTransporter()

    // Use provided token or generate from staffData
    const jwtToken = token || generateStaffInviteToken(staffData)
    const inviteLink = appUrl(`/auth/staff-invite?token=${jwtToken}`)

    // Never log the token itself -- it is a 7-day credential that sets up the
    // account, and Vercel's logs are not the place for one.
    console.log('Sending staff invite to:', email, '| link length:', inviteLink.length)

    const roleLabel = String(role || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

    const registrationNo = staffData?.registration_no || ''

    const html = layout({
      title: `You have been invited to ${hospitalName}`,
      preheader: `Set up your ${roleLabel} account at ${hospitalName}. This invitation expires in 7 days.`,
      content: `
        ${para(`Hello ${name},`)}
        ${para(
          `You have been invited to join <strong>${hospitalName}</strong> on Smile Return as a <strong>${roleLabel}</strong>.`
        )}
        ${detailsTable(
          codeRow('Hospital', hospitalName) +
            codeRow('Role', roleLabel) +
            codeRow('Email', email) +
            (registrationNo ? codeRow('Registration', registrationNo) : '')
        )}
        ${para('Click below to set your password and activate your account.')}
        ${button('Accept invitation', inviteLink)}
        ${linkFallback(inviteLink, 'Use this link instead')}
        ${fineprint(
          'This invitation is valid for <strong>7 days</strong>. If you were not expecting it, you can safely ignore this email.'
        )}
      `,
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: `Invitation to join ${hospitalName} - Smile Return`,
      html,
      text: `Hello ${name},

You have been invited to join ${hospitalName} on Smile Return as a ${roleLabel}.

Hospital: ${hospitalName}
Role: ${roleLabel}
Email: ${email}${registrationNo ? `\nRegistration: ${registrationNo}` : ''}

Set your password and activate your account here:
${inviteLink}

This invitation is valid for 7 days. If you were not expecting it, you can safely ignore this email.

(c) ${currentYear()} Smile Return. All rights reserved.`,
    })

    console.log('Email sent successfully to:', email)
    return { success: true }
  } catch (error) {
    console.error('Error sending staff invite email:', error)
    return { success: false, error: error.message }
  }
}

// Send a 6-digit code confirming a patient owns the email they just supplied
export async function sendPatientEmailOtp({ email, name, code, expiresInMinutes = 10 }) {
  try {
    assertEmailConfigured()
    const transporter = createTransporter()

    const html = layout({
      title: 'Verify your email',
      preheader: `${code} is your Smile Return verification code.`,
      content: `
        ${para(`Hello ${name || 'there'},`)}
        ${para('Use this code to confirm your email address on your Smile Return patient account:')}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:26px 0;">
          <tr>
            <td align="center" style="background:#f3f4f6;border-radius:8px;padding:22px;">
              <div style="font-family:'SF Mono', Menlo, Consolas, 'Courier New', monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#111827;">${code}</div>
            </td>
          </tr>
        </table>
        ${fineprint(
          `This code expires in <strong>${expiresInMinutes} minutes</strong>. If you did not request it, you can safely ignore this email.`
        )}
      `,
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: `${code} is your Smile Return verification code`,
      html,
      text: `Hello ${name || 'there'},

Use this code to confirm your email address on your Smile Return patient account:

${code}

This code expires in ${expiresInMinutes} minutes. If you did not request it, you can safely ignore this email.

(c) ${currentYear()} Smile Return. All rights reserved.`,
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending patient email OTP:', error)
    return { success: false, error: error.message }
  }
}

// Send a password reset email (own JWT flow -- not Supabase's email reset)
export async function sendPasswordResetEmail({ email, name, registration_no, user_id, token }) {
  try {
    assertEmailConfigured()
    const transporter = createTransporter()

    const jwtToken =
      token || generatePasswordResetToken({ user_id, email, registration_no })
    const resetLink = appUrl(`/auth/reset-password?token=${jwtToken}`)

    // The token runs to several hundred characters. It belongs in the href and
    // the button -- never as visible link text, which is what wrapped across
    // seven lines and made this email look broken.
    const html = layout({
      title: 'Reset your password',
      preheader: 'Choose a new password for your Smile Return account. This link expires in 1 hour.',
      content: `
        ${para(`Hello ${name || 'there'},`)}
        ${para(
          `We received a request to reset the password for your Smile Return account${
            registration_no ? ` (registration <strong>${registration_no}</strong>)` : ''
          }.`
        )}
        ${para('Click the button below to choose a new password.')}
        ${button('Reset password', resetLink)}
        ${linkFallback(resetLink, 'Use this link instead')}
        ${fineprint(
          'This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can ignore this email &mdash; your password will not change.'
        )}
      `,
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: 'Reset your Smile Return password',
      html,
      text: `Hello ${name || 'there'},

We received a request to reset the password for your Smile Return account${
        registration_no ? ` (registration ${registration_no})` : ''
      }.

Choose a new password here:
${resetLink}

This link is valid for 1 hour. If you did not request a password reset, you can ignore this email -- your password will not change.

(c) ${currentYear()} Smile Return. All rights reserved.`,
    })

    console.log('Password reset email sent to:', email)
    return { success: true }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return { success: false, error: error.message }
  }
}
