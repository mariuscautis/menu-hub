import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.replace('Bearer ', '')
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token)
  if (error || !user) return false
  const supabaseAdmin = getSupabaseAdmin()
  const { data: admin } = await supabaseAdmin.from('admins').select('id').eq('user_id', user.id).single()
  return !!admin
}

function generateSlug(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

export async function POST(request) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { restaurantName, email, phone, venueType, venueTypeOther, trialDays = 14 } = await request.json()

    if (!restaurantName || !email) {
      return NextResponse.json({ error: 'Restaurant name and email are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Create Supabase auth user with a temporary password (they'll use magic link / reset)
    const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A1!'
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message?.includes('already')) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const userId = authData.user.id
    const slug = generateSlug(restaurantName)
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase.from('restaurants').insert({
      name: restaurantName,
      slug,
      owner_id: userId,
      email,
      phone: phone || null,
      venue_type: venueType || null,
      status: 'approved',
      trial_ends_at: trialEndsAt,
      enabled_modules: { ordering: true, analytics: true, reservations: true, rota: true, reports: true, cash_drawer: true },
    })

    if (dbError) {
      // Clean up auth user if restaurant insert fails
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Generate a password reset link and send it via Brevo
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/auth/reset-password` }
    })
    const resetUrl = linkData?.properties?.action_link

    if (resetUrl) {
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
          subject: `Your Veno App account is ready — set your password`,
          htmlContent: `
            <!DOCTYPE html>
            <html>
              <head><meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f8; }
                  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
                  .header { background-color: #6262bd; color: white; padding: 36px 30px; text-align: center; }
                  .header h1 { margin: 0; font-size: 24px; }
                  .header p { margin: 8px 0 0; opacity: 0.85; font-size: 15px; }
                  .content { padding: 32px 30px; }
                  .button { display: block; width: fit-content; margin: 28px auto; padding: 14px 32px; background-color: #6262bd; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; }
                  .footer { background: #f9f9fb; padding: 18px 30px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Welcome to Veno App</h1>
                    <p>Your account for <strong>${restaurantName}</strong> is ready</p>
                  </div>
                  <div class="content">
                    <p>Hi there,</p>
                    <p>Your Veno App account has been set up. Click the button below to set your password and access your dashboard.</p>
                    <a href="${resetUrl}" class="button">Set My Password</a>
                    <p style="font-size:13px;color:#888;text-align:center;">This link expires in 24 hours. If you didn't expect this email, you can ignore it.</p>
                  </div>
                  <div class="footer">Veno App · <a href="${appUrl}" style="color:#6262bd;">${appUrl}</a></div>
                </div>
              </body>
            </html>
          `,
        }),
      }).catch(err => console.error('Failed to send welcome email:', err))
    }

    return NextResponse.json({ success: true, slug, email })
  } catch (err) {
    console.error('manual-register error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
