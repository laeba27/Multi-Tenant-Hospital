import nodemailer from 'nodemailer'
import { generateStaffInviteToken } from '@/lib/utils/jwt'

// Create email transporter
const createTransporter = () => {
  // For development/testing, you can use a test account
  // For production, use your email service credentials
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
    port: process.env.EMAIL_PORT || 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
}

// Send welcome email to newly registered hospital
export async function sendWelcomeEmail({ 
  email, 
  hospitalName, 
  administratorName, 
  registrationNo, 
  userRegistrationNo 
}) {
  try {
    const transporter = createTransporter()

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #4f46e5, #4f46e5); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; border-left: 4px solid #4f46e5; margin: 20px 0; border-radius: 4px; }
            .info-label { font-weight: bold; color: #4f46e5; margin-top: 10px; }
            .info-value { color: #6b7280; font-family: monospace; margin-top: 5px; padding: 10px; background: #f3f4f6; border-radius: 4px; }
            .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Welcome to Smile Returns</h1>
              <p style="margin: 10px 0 0 0;">Hospital Management System</p>
            </div>
            
            <div class="content">
              <h2>Hello ${administratorName},</h2>
              
              <p>Congratulations! Your hospital has been successfully registered on Smile Returns. We're excited to have <strong>${hospitalName}</strong> on our platform.</p>
              
              <div class="info-box">
                <p><strong>Your Registration Details:</strong></p>
                
                <div>
                  <div class="info-label">Hospital Registration Number:</div>
                  <div class="info-value">${registrationNo}</div>
                </div>
                
                <div>
                  <div class="info-label">Your User Registration Number:</div>
                  <div class="info-value">${userRegistrationNo}</div>
                </div>
                
                <div>
                  <div class="info-label">Email:</div>
                  <div class="info-value">${email}</div>
                </div>
              </div>
              
              <p>You can now log in to your hospital dashboard and start managing:</p>
              <ul>
                <li>Patient appointments and schedules</li>
                <li>Hospital staff and departments</li>
                <li>Medical records and prescriptions</li>
                <li>Billing and payments</li>
                <li>Hospital analytics and reports</li>
              </ul>
              
              <center>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://smile-returns.com'}/auth/sign-in" class="button">
                  Sign In to Your Dashboard
                </a>
              </center>
              
              <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b;">
                <strong>🔒 Security Tip:</strong> Keep your registration numbers safe. You'll need them for account recovery and support requests.
              </div>
              
              <p>If you have any questions or need assistance, our support team is here to help. Contact us at support@smile-returns.com</p>
              
              <p>Best regards,<br><strong>The Smile Returns Team</strong></p>
              
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; 2024 Smile Returns. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: `Welcome to Smile Returns - ${hospitalName}`,
      html: htmlContent,
      text: `
Welcome to Smile Returns!

Hello ${administratorName},

Your hospital "${hospitalName}" has been successfully registered.

Registration Details:
- Hospital ID: ${registrationNo}
- Your User ID: ${userRegistrationNo}
- Email: ${email}

You can now sign in at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://smile-returns.com'}/auth/sign-in

Best regards,
The Smile Returns Team
      `,
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message }
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
    const transporter = createTransporter()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; }
            .box { background: white; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px; }
            .mono { font-family: monospace; background: #f3f4f6; padding: 6px 10px; border-radius: 4px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin:0;">Registration Received</h2>
              <p style="margin:8px 0 0 0;">Smile Returns Hospital Management</p>
            </div>
            <div class="content">
              <p>Hello ${administratorName},</p>
              <p>Your hospital registration has been submitted successfully for <strong>${hospitalName}</strong>.</p>

              <div class="box">
                <p><strong>Current Status:</strong> Pending Approval</p>
                <p>A super administrator will review your registration and enable login access.</p>
              </div>

              <p><strong>Reference IDs:</strong></p>
              <p>Hospital Registration: <span class="mono">${registrationNo}</span></p>
              <p>Admin Registration: <span class="mono">${userRegistrationNo}</span></p>

              <p>Once approved, you will receive another email and can sign in at:</p>
              <p><a href="${appUrl}/auth/sign-in">${appUrl}/auth/sign-in</a></p>
            </div>
          </div>
        </body>
      </html>
    `

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: `Registration Pending Approval - ${hospitalName}`,
      html: htmlContent,
      text: `
Hello ${administratorName},

Your hospital registration for ${hospitalName} has been received.
Status: Pending Approval

Hospital Registration: ${registrationNo}
Admin Registration: ${userRegistrationNo}

You will receive another email once your account is approved.
      `,
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
    const transporter = createTransporter()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #16a34a; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; }
            .box { background: #ecfdf5; border: 1px solid #86efac; padding: 16px; margin: 16px 0; border-radius: 6px; }
            .button { display: inline-block; background: #16a34a; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin:0;">Hospital Approved</h2>
              <p style="margin:8px 0 0 0;">Your login access is now enabled</p>
            </div>
            <div class="content">
              <p>Hello ${administratorName},</p>
              <p>Your hospital <strong>${hospitalName}</strong> has been approved by super administration.</p>

              <div class="box">
                <p><strong>Hospital Registration:</strong> ${registrationNo}</p>
                <p><strong>Admin Registration:</strong> ${userRegistrationNo}</p>
              </div>

              <p>You can now sign in and start configuring departments, doctors, and staff.</p>
              <p><a class="button" href="${appUrl}/auth/sign-in">Sign In</a></p>
            </div>
          </div>
        </body>
      </html>
    `

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: `Hospital Approved - ${hospitalName}`,
      html: htmlContent,
      text: `
Hello ${administratorName},

Your hospital ${hospitalName} has been approved.
You can now sign in using your registration number.

Hospital Registration: ${registrationNo}
Admin Registration: ${userRegistrationNo}
      `,
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
    const transporter = createTransporter()

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0f172a; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; }
            .note { background: #fff; border-left: 4px solid #0f172a; padding: 12px; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin:0;">Additional Details Requested</h2>
            </div>
            <div class="content">
              <p>Hello ${administratorName},</p>
              <p>Super admin has requested additional details for hospital registration: <strong>${hospitalName}</strong>.</p>
              <div class="note">
                <p><strong>Requested By:</strong> ${requestedBy}</p>
                <p><strong>Details Needed:</strong></p>
                <p>${note || 'Please reply with any missing legal or registration documents and contact details.'}</p>
              </div>
              <p>Please respond to this email with the requested information.</p>
            </div>
          </div>
        </body>
      </html>
    `

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: `Additional Details Required - ${hospitalName}`,
      html: htmlContent,
      text: `
Hello ${administratorName},

Additional details are required for hospital registration: ${hospitalName}.
Requested by: ${requestedBy}

${note || 'Please reply with any missing legal or registration documents and contact details.'}
      `,
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
    const transporter = createTransporter()

    console.log('Email config - Host:', process.env.EMAIL_HOST, 'Port:', process.env.EMAIL_PORT)
    console.log('Email from:', process.env.EMAIL_FROM, 'To:', email)

    // Use provided token or generate from staffData
    const jwtToken = token || generateStaffInviteToken(staffData)
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/staff-invite?token=${jwtToken}`

    console.log('JWT Token generated, length:', jwtToken.length)
    console.log('Invite link:', inviteLink)

    // Extract short registration code (first 8 chars after removing "doct" prefix)
    const registrationNo = staffData?.registration_no || ''
    const shortRegCode = registrationNo.replace(/^doct/i, '').substring(0, 8).toUpperCase()

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #000; background: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { padding: 20px 0; }
            .header { border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .greeting { font-size: 14px; margin-bottom: 15px; }
            .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .info-table td { padding: 8px 0; border-bottom: 1px solid #ddd; }
            .info-table td:first-child { font-weight: bold; width: 140px; color: #000; }
            .info-table td:last-child { color: #333; }
            .reg-code { font-family: 'Courier New', monospace; font-size: 16px; letter-spacing: 2px; background: #f5f5f5; padding: 10px 15px; display: inline-block; margin: 10px 0; }
            .link { color: #000; text-decoration: underline; font-weight: normal; }
            .footer { border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <div class="header">
                <h1>Invitation to Join Smile Returns</h1>
              </div>

              <p class="greeting">Hello ${name},</p>

              <p>Welcome to Smile Returns! We are pleased to inform you that you have been invited to join <strong>${hospitalName}</strong> as a <strong>${role.replace(/_/g, ' ').toUpperCase()}</strong>.</p>

              <table class="info-table">
                <tr>
                  <td>EMAIL</td>
                  <td>${email}</td>
                </tr>
                <tr>
                  <td>HOSPITAL</td>
                  <td>${hospitalName}</td>
                </tr>
                <tr>
                  <td>ROLE</td>
                  <td>${role.replace(/_/g, ' ').toUpperCase()}</td>
                </tr>
                <tr>
                  <td>REGISTRATION CODE</td>
                  <td><span class="reg-code">${shortRegCode}</span></td>
                </tr>
              </table>

              <p>To complete your registration and set up your account, please visit:</p>
              <p><a href="${inviteLink}" class="link">${inviteLink}</a></p>

              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                This invitation link is valid for 7 days. If you were not expecting this email, you can safely ignore it.
              </p>

              <div class="footer">
                <p>This invitation was sent from Smile Returns Hospital Management System.</p>
                <p>&copy; 2024 Smile Returns. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: `Invitation to join ${hospitalName} - Smile Returns`,
      html: htmlContent,
      text: `
Hello ${name},

Welcome to Smile Returns! You have been invited to join ${hospitalName} as a ${role.replace(/_/g, ' ').toUpperCase()}.

YOUR DETAILS
------------
Email: ${email}
Hospital: ${hospitalName}
Role: ${role.replace(/_/g, ' ').toUpperCase()}
Registration Code: ${shortRegCode}

To complete your registration, please visit:
${inviteLink}

This invitation link is valid for 7 days.
If you were not expecting this email, you can safely ignore it.

This invitation was sent from Smile Returns Hospital Management System.
© 2024 Smile Returns. All rights reserved.
      `,
    })

    console.log('Email sent successfully to:', email)
    return { success: true }
  } catch (error) {
    console.error('Error sending staff invite email:', error)
    return { success: false, error: error.message }
  }
}
