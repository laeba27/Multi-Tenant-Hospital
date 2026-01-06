import nodemailer from 'nodemailer'

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

// Send registration confirmation email
export async function sendRegistrationConfirmationEmail({ email, hospitalName }) {
  try {
    const transporter = createTransporter()

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; border-radius: 4px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Registration Initiated</h1>
            </div>
            <p>Thank you for registering ${hospitalName} with Smile Returns.</p>
            <p>Your registration is being processed. You will receive a welcome email shortly with your registration details.</p>
          </div>
        </body>
      </html>
    `

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@smile-returns.com',
      to: email,
      subject: 'Registration Initiated - Smile Returns',
      html: htmlContent,
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    return { success: false, error: error.message }
  }
}
