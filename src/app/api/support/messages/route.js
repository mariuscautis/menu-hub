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
    const { ticket_id, sender_id, sender_type, body } = await request.json()

    if (!ticket_id || !sender_id || !sender_type || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Insert message
    const { data: message, error: msgError } = await supabase
      .from('support_messages')
      .insert({ ticket_id, sender_id, sender_type, body })
      .select()
      .single()

    if (msgError) throw msgError

    // Touch ticket updated_at
    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticket_id)

    // Fetch ticket + restaurant for email
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*, restaurants(name, email)')
      .eq('id', ticket_id)
      .single()

    if (ticket) {
      if (sender_type === 'support') {
        // Email venue owner
        const venueEmail = ticket.restaurants?.email
        if (venueEmail) {
          await sendEmail({
            to: venueEmail,
            subject: `Reply to your support ticket: ${ticket.subject}`,
            htmlContent: `
              <!DOCTYPE html><html><head><meta charset="utf-8">
              <style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
              .container{max-width:600px;margin:0 auto;padding:20px}
              .header{background:#6262bd;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}
              .content{background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px}
              .message-box{background:white;border:1px solid #e2e8f0;border-radius:6px;padding:16px}
              .btn{display:inline-block;padding:12px 24px;background:#6262bd;color:white;text-decoration:none;border-radius:6px;margin-top:16px}
              </style></head><body>
              <div class="container">
                <div class="header"><h2 style="margin:0">Support Reply</h2></div>
                <div class="content">
                  <p>Our support team has replied to your ticket: <strong>${ticket.subject}</strong></p>
                  <div class="message-box">${body.replace(/\n/g, '<br>')}</div>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.venoapp.com'}/dashboard/support" class="btn">View Ticket</a>
                  <p style="margin-top:16px;font-size:12px;color:#888">You can reply directly in the dashboard.</p>
                </div>
              </div></body></html>
            `,
          }).catch(() => {})
        }
      } else {
        // Email support team
        await sendEmail({
          to: 'hello@venoapp.com',
          subject: `[Support Reply] ${ticket.subject} — ${ticket.restaurants?.name || ticket_id}`,
          htmlContent: `
            <!DOCTYPE html><html><head><meta charset="utf-8">
            <style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
            .container{max-width:600px;margin:0 auto;padding:20px}
            .header{background:#6262bd;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}
            .content{background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px}
            .message-box{background:white;border:1px solid #e2e8f0;border-radius:6px;padding:16px}
            .btn{display:inline-block;padding:12px 24px;background:#6262bd;color:white;text-decoration:none;border-radius:6px;margin-top:16px}
            </style></head><body>
            <div class="container">
              <div class="header"><h2 style="margin:0">New Reply from Venue</h2></div>
              <div class="content">
                <p><strong>${ticket.restaurants?.name || 'Venue'}</strong> has replied to ticket: <strong>${ticket.subject}</strong></p>
                <div class="message-box">${body.replace(/\n/g, '<br>')}</div>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.venoapp.com'}/admin/support" class="btn">View in Admin Panel</a>
              </div>
            </div></body></html>
          `,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Support message error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
