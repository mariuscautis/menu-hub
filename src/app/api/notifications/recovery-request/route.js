import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/services/email-edge'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const { restaurantId } = await request.json()
    if (!restaurantId) return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, email')
      .eq('id', restaurantId)
      .single()

    if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

    // Stamp recovery_requested_at
    await supabaseAdmin
      .from('restaurants')
      .update({ recovery_requested_at: new Date().toISOString() })
      .eq('id', restaurantId)

    // Notify super admin
    const adminEmail = process.env.SUPER_ADMIN_EMAIL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'

    if (adminEmail) {
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
              <div class="header"><h2 style="margin:0">🔄 Account Recovery Requested</h2></div>
              <div class="content">
                <p>A deleted restaurant has requested account recovery.</p>
                <div class="field"><div class="label">Restaurant</div><div class="value">${restaurant.name || 'Unknown'}</div></div>
                <div class="field"><div class="label">Email</div><div class="value">${restaurant.email || '—'}</div></div>
                <p style="text-align:center">
                  <a href="${appUrl}/admin/restaurants?tab=deleted" class="button">Review in Admin Panel</a>
                </p>
                <div class="footer">Veno App — automated notification</div>
              </div>
            </div>
          </body>
        </html>
      `
      await sendEmail({
        to: adminEmail,
        subject: `🔄 Recovery Request: ${restaurant.name || restaurant.email}`,
        htmlContent,
      }).catch(err => console.error('Admin recovery notification failed:', err))
    }

    return NextResponse.json({ requested: true })
  } catch (err) {
    console.error('recovery-request error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
