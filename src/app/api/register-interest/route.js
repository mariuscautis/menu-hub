import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const { firstName, lastName, email, phone, venueName, venueType, venueTypeOther, country } = await request.json()

    if (!firstName || !lastName || !email || !phone || !venueName || !venueType || !country) {
      return NextResponse.json({ error: 'Please fill in all required fields' }, { status: 400 })
    }

    const venueTypeDisplay = venueType === 'other' ? `Other: ${venueTypeOther}` : venueType

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg,#4f4fa8,#6262bd); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-row { margin-bottom: 12px; }
            .label { font-weight: bold; color: #6262bd; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0 0 4px">New Early Access Registration</h1>
              <p style="margin:0;opacity:.85;">Someone wants to be first in line 🎉</p>
            </div>
            <div class="content">
              <div class="info-row"><span class="label">Name:</span> ${firstName} ${lastName}</div>
              <div class="info-row"><span class="label">Email:</span> <a href="mailto:${email}">${email}</a></div>
              <div class="info-row"><span class="label">Phone:</span> ${phone}</div>
              <div class="info-row"><span class="label">Venue:</span> ${venueName}</div>
              <div class="info-row"><span class="label">Venue Type:</span> ${venueTypeDisplay}</div>
              <div class="info-row"><span class="label">Country:</span> ${country}</div>
            </div>
            <div class="footer">Submitted via the Veno App early access form.</div>
          </div>
        </body>
      </html>
    `

    const textContent = `
New Early Access Registration
==============================
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone}
Venue: ${venueName}
Venue Type: ${venueTypeDisplay}
Country: ${country}
    `

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: process.env.EMAIL_FROM_NAME || 'Veno App', email: process.env.EMAIL_FROM || 'noreply@venoapp.com' },
        to: [{ email: 'venoapplication@gmail.com' }],
        replyTo: { email },
        subject: `Early Access: ${venueName} — ${country}`,
        htmlContent,
        textContent,
      }),
    })

    if (!brevoResponse.ok) {
      const err = await brevoResponse.json().catch(() => ({}))
      console.error('Brevo error:', err)
      return NextResponse.json({ error: 'Failed to send. Please try again later.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Register interest error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
