/**
 * Render every email to an HTML file instead of sending one.
 *
 * Checking a template by mailing it costs a real send against the Gmail free
 * tier's daily cap -- and those sends are spent on nobody, since the only
 * recipient is whoever is developing. This writes the same HTML to disk so a
 * layout change can be reviewed in a browser at zero quota.
 *
 *   node scripts/preview-emails.mjs && open .email-preview/index.html
 *
 * The output directory is gitignored. Real delivery still only ever happens
 * through the six senders in src/lib/email/send-email.js.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Absolute URLs so the logo resolves in the preview exactly as it will in a
// real client. Set before importing the template module, which reads it.
process.env.NEXT_PUBLIC_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://multi-tenant-hospital.vercel.app'

const {
  layout,
  button,
  linkFallback,
  detailsTable,
  codeRow,
  notice,
  p: para,
  fineprint,
} = await import('../src/lib/email/template.js')

const OUT = '.email-preview'
mkdirSync(OUT, { recursive: true })

// A realistically long token: the whole point of the button is that a link this
// size never appears as visible text.
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 'x'.repeat(280) + '.signature'
const APP = process.env.NEXT_PUBLIC_APP_URL
const resetLink = `${APP}/auth/reset-password?token=${TOKEN}`
const inviteLink = `${APP}/auth/staff-invite?token=${TOKEN}`
const signInLink = `${APP}/auth/sign-in`

const EMAILS = [
  {
    file: 'registration-pending.html',
    name: 'Hospital registration - pending approval',
    html: layout({
      title: 'Registration received',
      preheader: 'City Hospital is awaiting approval.',
      content: `
        ${para('Hello Dr. Sharma,')}
        ${para('Your registration for <strong>City Hospital</strong> has been submitted successfully.')}
        ${notice('<strong>Status: pending approval.</strong> A super administrator will review your registration and enable login access.')}
        ${detailsTable(codeRow('Hospital registration', 'HOSP12345') + codeRow('Admin registration', 'HADM67890'))}
        ${para('Once approved, you will be able to sign in here:')}
        ${button('Go to sign in', signInLink)}
      `,
    }),
  },
  {
    file: 'hospital-approved.html',
    name: 'Hospital approved',
    html: layout({
      title: 'Your hospital is approved',
      preheader: 'City Hospital has been approved. You can sign in now.',
      content: `
        ${para('Hello Dr. Sharma,')}
        ${para('Good news &mdash; <strong>City Hospital</strong> has been approved and your login access is now enabled.')}
        ${notice('<strong>You are ready to go.</strong> Sign in to set up departments, doctors and staff.', 'success')}
        ${detailsTable(codeRow('Hospital registration', 'HOSP12345') + codeRow('Admin registration', 'HADM67890'))}
        ${button('Sign in to your dashboard', signInLink)}
      `,
    }),
  },
  {
    file: 'details-requested.html',
    name: 'Additional details requested',
    html: layout({
      title: 'Additional details requested',
      preheader: 'More information is needed to review City Hospital.',
      content: `
        ${para('Hello Dr. Sharma,')}
        ${para('A super administrator has requested additional details before your registration for <strong>City Hospital</strong> can be reviewed.')}
        ${notice('<strong>Requested by Super Admin</strong><br />Please share your facility licence and a contact number.')}
        ${para('Please reply to this email with the requested information.')}
      `,
    }),
  },
  {
    file: 'staff-invite.html',
    name: 'Staff invitation',
    html: layout({
      title: 'You have been invited to City Hospital',
      preheader: 'Set up your Doctor account. This invitation expires in 7 days.',
      content: `
        ${para('Hello Dr. Mehta,')}
        ${para('You have been invited to join <strong>City Hospital</strong> on Smile Return as a <strong>Doctor</strong>.')}
        ${detailsTable(
          codeRow('Hospital', 'City Hospital') +
            codeRow('Role', 'Doctor') +
            codeRow('Email', 'doctor@example.com') +
            codeRow('Registration', 'DOCT34471')
        )}
        ${para('Click below to set your password and activate your account.')}
        ${button('Accept invitation', inviteLink)}
        ${linkFallback(inviteLink, 'Use this link instead')}
        ${fineprint('This invitation is valid for <strong>7 days</strong>.')}
      `,
    }),
  },
  {
    file: 'patient-otp.html',
    name: 'Patient email verification code',
    html: layout({
      title: 'Verify your email',
      preheader: '482913 is your Smile Return verification code.',
      content: `
        ${para('Hello Ananya,')}
        ${para('Use this code to confirm your email address on your Smile Return patient account:')}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:26px 0;">
          <tr><td align="center" style="background:#f3f4f6;border-radius:8px;padding:22px;">
            <div style="font-family:'SF Mono', Menlo, Consolas, monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#111827;">482913</div>
          </td></tr>
        </table>
        ${fineprint('This code expires in <strong>10 minutes</strong>.')}
      `,
    }),
  },
  {
    file: 'password-reset.html',
    name: 'Password reset',
    html: layout({
      title: 'Reset your password',
      preheader: 'Choose a new password. This link expires in 1 hour.',
      content: `
        ${para('Hello Shivam,')}
        ${para('We received a request to reset the password for your Smile Return account (registration <strong>DOCT34471</strong>).')}
        ${para('Click the button below to choose a new password.')}
        ${button('Reset password', resetLink)}
        ${linkFallback(resetLink, 'Use this link instead')}
        ${fineprint('This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can ignore this email &mdash; your password will not change.')}
      `,
    }),
  },
]

for (const e of EMAILS) {
  writeFileSync(join(OUT, e.file), e.html)
}

// An index so all six can be skimmed side by side in one page.
const index = `<!doctype html>
<meta charset="utf-8">
<title>Email previews - Smile Return</title>
<style>
  body { margin:0; background:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  h1 { font-size:18px; padding:20px 24px; margin:0; background:#fff; border-bottom:1px solid #e5e7eb; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(420px,1fr)); gap:20px; padding:20px; }
  .card { background:#fff; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; }
  .card h2 { font-size:13px; margin:0; padding:12px 16px; background:#f9fafb; border-bottom:1px solid #e5e7eb; color:#374151; }
  iframe { width:100%; height:620px; border:0; display:block; }
</style>
<h1>Email previews &mdash; rendered locally, nothing sent</h1>
<div class="grid">
${EMAILS.map((e) => `  <div class="card"><h2>${e.name}</h2><iframe src="${e.file}"></iframe></div>`).join('\n')}
</div>`

writeFileSync(join(OUT, 'index.html'), index)

console.log(`Rendered ${EMAILS.length} emails to ${OUT}/ (no email sent)`)
console.log(`Open: ${OUT}/index.html`)
