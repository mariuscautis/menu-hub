import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/services/email-edge'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const { restaurantName, email, phone } = await request.json()

    const adminEmail = process.env.SUPER_ADMIN_EMAIL
    if (!adminEmail) {
      console.warn('SUPER_ADMIN_EMAIL not set — skipping admin notification')
      return NextResponse.json({ sent: false, reason: 'no admin email configured' })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6262bd; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .field { margin-bottom: 12px; }
            .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { font-size: 15px; font-weight: 600; color: #333; }
            .button { display: inline-block; padding: 12px 24px; background-color: #6262bd; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin:0">🎉 New Restaurant Registered</h2>
            </div>
            <div class="content">
              <p>A new restaurant has just signed up on Veno App.</p>
              <div class="field"><div class="label">Restaurant Name</div><div class="value">${restaurantName}</div></div>
              <div class="field"><div class="label">Email</div><div class="value">${email}</div></div>
              ${phone ? `<div class="field"><div class="label">Phone</div><div class="value">${phone}</div></div>` : ''}
              <p style="text-align:center">
                <a href="${appUrl}/admin/restaurants" class="button">View in Admin Panel</a>
              </p>
              <div class="footer">Veno App — automated notification</div>
            </div>
          </div>
        </body>
      </html>
    `

    await sendEmail({
      to: adminEmail,
      subject: `New registration: ${restaurantName}`,
      htmlContent,
    })

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('restaurant-registered notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
