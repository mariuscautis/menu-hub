/**
 * Email Service using Brevo (formerly Sendinblue)
 * Handles transactional emails for the Menu Hub application
 */

import * as brevo from '@getbrevo/brevo'

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi()
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
)

/**
 * Send a transactional email using Brevo
 * @param {Object} options - Email options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlContent - HTML content of the email
 * @param {string} [options.textContent] - Plain text version (optional but recommended)
 * @param {string} [options.from] - Sender email (defaults to EMAIL_FROM env var)
 * @param {string} [options.fromName] - Sender name (defaults to EMAIL_FROM_NAME env var)
 * @param {string} [options.replyTo] - Reply-to email address
 * @returns {Promise<Object>} - Response from Brevo API
 */
export async function sendEmail({
  to,
  subject,
  htmlContent,
  textContent,
  from = process.env.EMAIL_FROM,
  fromName = process.env.EMAIL_FROM_NAME,
  replyTo
}) {
  try {
    // Prepare recipient list
    const recipients = Array.isArray(to)
      ? to.map(email => ({ email }))
      : [{ email: to }]

    // Prepare sender
    const sender = {
      email: from,
      name: fromName
    }

    // Prepare email data
    const sendSmtpEmail = new brevo.SendSmtpEmail()
    sendSmtpEmail.sender = sender
    sendSmtpEmail.to = recipients
    sendSmtpEmail.subject = subject
    sendSmtpEmail.htmlContent = htmlContent

    // Add plain text version if provided
    if (textContent) {
      sendSmtpEmail.textContent = textContent
    }

    // Add reply-to if provided
    if (replyTo) {
      sendSmtpEmail.replyTo = { email: replyTo }
    }

    // Send the email
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail)

    console.log('Email sent successfully:', {
      messageId: response.messageId,
      to: recipients.map(r => r.email).join(', ')
    })

    return {
      success: true,
      messageId: response.messageId,
      response
    }
  } catch (error) {
    console.error('Failed to send email:', error)

    return {
      success: false,
      error: error.message || 'Failed to send email'
    }
  }
}

/**
 * Send a password reset email
 * @param {string} email - Recipient email
 * @param {string} resetLink - Password reset link
 * @returns {Promise<Object>}
 */
export async function sendPasswordResetEmail(email, resetLink) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6262bd; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #6262bd; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your Menu Hub account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6262bd;">${resetLink}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <div class="footer">
              <p>Menu Hub - Restaurant Management Platform</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  const textContent = `
Password Reset Request

We received a request to reset your password for your Menu Hub account.

Click this link to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

---
Menu Hub - Restaurant Management Platform
This is an automated email, please do not reply.
  `

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Menu Hub',
    htmlContent,
    textContent
  })
}

/**
 * Send a welcome email to new users
 * @param {string} email - Recipient email
 * @param {string} name - User's name
 * @returns {Promise<Object>}
 */
export async function sendWelcomeEmail(email, name) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6262bd; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Menu Hub!</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Thank you for joining Menu Hub! We're excited to help you manage your restaurant more efficiently.</p>
            <p>Here's what you can do with Menu Hub:</p>
            <ul>
              <li>Manage your menu and categories</li>
              <li>Track orders and reservations</li>
              <li>Monitor inventory and stock levels</li>
              <li>Analyze sales and performance</li>
              <li>Manage staff and schedules</li>
            </ul>
            <p>If you have any questions or need help getting started, feel free to reach out to our support team.</p>
            <div class="footer">
              <p>Menu Hub - Restaurant Management Platform</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  const textContent = `
Welcome to Menu Hub!

Hello ${name},

Thank you for joining Menu Hub! We're excited to help you manage your restaurant more efficiently.

Here's what you can do with Menu Hub:
- Manage your menu and categories
- Track orders and reservations
- Monitor inventory and stock levels
- Analyze sales and performance
- Manage staff and schedules

If you have any questions or need help getting started, feel free to reach out to our support team.

---
Menu Hub - Restaurant Management Platform
This is an automated email, please do not reply.
  `

  return sendEmail({
    to: email,
    subject: 'Welcome to Menu Hub!',
    htmlContent,
    textContent
  })
}

/**
 * Send order notification email
 * @param {string} email - Recipient email
 * @param {Object} orderDetails - Order information
 * @returns {Promise<Object>}
 */
export async function sendOrderNotification(email, orderDetails) {
  const { orderNumber, items, total, customerName } = orderDetails

  const itemsList = items.map(item =>
    `<li>${item.name} x ${item.quantity} - $${item.price}</li>`
  ).join('')

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6262bd; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .order-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .total { font-size: 18px; font-weight: bold; color: #6262bd; margin-top: 10px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Order Received</h1>
          </div>
          <div class="content">
            <p>A new order has been placed:</p>
            <div class="order-details">
              <p><strong>Order Number:</strong> #${orderNumber}</p>
              <p><strong>Customer:</strong> ${customerName}</p>
              <p><strong>Items:</strong></p>
              <ul>
                ${itemsList}
              </ul>
              <p class="total">Total: $${total}</p>
            </div>
            <div class="footer">
              <p>Menu Hub - Restaurant Management Platform</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `New Order #${orderNumber} - Menu Hub`,
    htmlContent
  })
}
