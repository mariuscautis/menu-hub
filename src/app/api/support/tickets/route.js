import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/services/email-edge'

export const runtime = 'edge'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  try {
    const { restaurant_id, created_by, subject, category, body, restaurant_name, user_email } = await request.json()

    if (!restaurant_id || !created_by || !subject || !category || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({ restaurant_id, created_by, subject, category })
      .select()
      .single()

    if (ticketError) throw ticketError

    // Create first message
    const { error: msgError } = await supabase
      .from('support_messages')
      .insert({ ticket_id: ticket.id, sender_id: created_by, sender_type: 'venue', body })

    if (msgError) throw msgError

    // Email support team
    const categoryLabels = { billing: 'Billing', bug: 'Bug / Issue', feature: 'Feature Request', other: 'Other' }
    await sendEmail({
      to: 'hello@venoapp.com',
      subject: `[Support] ${subject} — ${restaurant_name || restaurant_id}`,
      htmlContent: `
        <!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background:#6262bd;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}
        .content{background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px}
        .field{margin-bottom:12px}.label{font-weight:bold;color:#555;font-size:12px;text-transform:uppercase}
        .value{color:#333;margin-top:2px}.message-box{background:white;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-top:8px}
        .btn{display:inline-block;padding:12px 24px;background:#6262bd;color:white;text-decoration:none;border-radius:6px;margin-top:16px}
        </style></head><body>
        <div class="container">
          <div class="header"><h2 style="margin:0">New Support Ticket</h2></div>
          <div class="content">
            <div class="field"><div class="label">Venue</div><div class="value">${restaurant_name || restaurant_id}</div></div>
            <div class="field"><div class="label">Email</div><div class="value">${user_email || 'N/A'}</div></div>
            <div class="field"><div class="label">Category</div><div class="value">${categoryLabels[category] || category}</div></div>
            <div class="field"><div class="label">Subject</div><div class="value">${subject}</div></div>
            <div class="field"><div class="label">Message</div><div class="message-box">${body.replace(/\n/g, '<br>')}</div></div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.venoapp.com'}/admin/support" class="btn">View in Admin Panel</a>
          </div>
        </div></body></html>
      `,
    }).catch(() => {}) // Don't fail ticket creation if email fails

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Support ticket error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
