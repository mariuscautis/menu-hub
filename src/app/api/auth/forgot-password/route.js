import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: linkData, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/auth/reset-password` },
    })

    // Always return success to avoid leaking which emails exist
    if (error || !linkData?.properties?.action_link) {
      return NextResponse.json({ success: true })
    }

    const resetUrl = linkData.properties.action_link

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: process.env.EMAIL_FROM_NAME || 'Veno App',
          email: process.env.EMAIL_FROM || 'noreply@venoapp.com',
        },
        to: [{ email }],
        subject: 'Reset your Veno App password',
        htmlContent: `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f8; }
      .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
      .header { background-color: #6262bd; color: white; padding: 36px 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 26px; }
      .header p { margin: 8px 0 0; opacity: 0.85; font-size: 15px; }
      .content { padding: 32px 30px; }
      .button { display: block; width: fit-content; margin: 28px auto; padding: 14px 32px; background-color: #6262bd; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; }
      .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
      .help { text-align: center; font-size: 13px; color: #888; }
      .help a { color: #6262bd; text-decoration: none; font-weight: 600; }
      .footer { background: #f9f9fb; padding: 18px 30px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Password Reset</h1>
        <p>We received a request to reset your password</p>
      </div>
      <div class="content">
        <p>Click the button below to choose a new password for your Veno App account. This link expires in 24 hours.</p>
        <a href="${resetUrl}" class="button">Reset My Password →</a>
        <hr class="divider" />
        <p class="help">
          If you didn't request this, you can safely ignore this email.<br/>
          Need help? <a href="mailto:support@venoapp.com">support@venoapp.com</a>
        </p>
      </div>
      <div class="footer">Veno App · <a href="${appUrl}" style="color:#6262bd;">${appUrl}</a></div>
    </div>
  </body>
</html>`,
      }),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('forgot-password error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
