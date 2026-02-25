import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const body = await request.json()

    const {
      enquiryType,
      firstName,
      lastName,
      businessName,
      businessType,
      location,
      phone,
      email,
      message
    } = body

    // Validate required fields
    if (!firstName || !lastName || !businessName || !businessType || !location || !phone || !email) {
      return NextResponse.json(
        { error: 'Please fill in all required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    // Build email content
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
            .info-row { margin-bottom: 12px; }
            .label { font-weight: bold; color: #6262bd; }
            .message-box { background-color: white; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #6262bd; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Contact Form Submission</h1>
              <p style="margin: 0; opacity: 0.9;">${enquiryType}</p>
            </div>
            <div class="content">
              <div class="info-row">
                <span class="label">Name:</span> ${firstName} ${lastName}
              </div>
              <div class="info-row">
                <span class="label">Email:</span> <a href="mailto:${email}">${email}</a>
              </div>
              <div class="info-row">
                <span class="label">Phone:</span> ${phone}
              </div>
              <div class="info-row">
                <span class="label">Business Name:</span> ${businessName}
              </div>
              <div class="info-row">
                <span class="label">Business Type:</span> ${businessType}
              </div>
              <div class="info-row">
                <span class="label">Location:</span> ${location}
              </div>
              ${message ? `
              <div class="message-box">
                <span class="label">Message:</span>
                <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${message}</p>
              </div>
              ` : ''}
              <div class="footer">
                <p>This message was sent from the Veno App contact form.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const textContent = `
New Contact Form Submission
===========================

Enquiry Type: ${enquiryType}

Contact Details:
- Name: ${firstName} ${lastName}
- Email: ${email}
- Phone: ${phone}

Business Information:
- Business Name: ${businessName}
- Business Type: ${businessType}
- Location: ${location}

${message ? `Message:\n${message}` : ''}

---
This message was sent from the Veno App contact form.
    `

    // Send email using Brevo REST API directly (Edge compatible)
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: process.env.EMAIL_FROM_NAME || 'Veno App',
          email: process.env.EMAIL_FROM || 'noreply@venoapp.com'
        },
        to: [{ email: 'marius.cautis@gmail.com' }],
        replyTo: { email: email },
        subject: `[${enquiryType}] Contact Form: ${businessName}`,
        htmlContent: htmlContent,
        textContent: textContent
      })
    })

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.json().catch(() => ({}))
      console.error('Brevo API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully!'
    })

  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}
