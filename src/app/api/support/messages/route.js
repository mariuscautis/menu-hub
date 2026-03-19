import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/services/email-edge'
import { getEmailTranslations, t } from '@/lib/email-translations'

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

    // Fetch ticket + restaurant (including email_language) for email
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*, restaurants(name, email, email_language)')
      .eq('id', ticket_id)
      .single()

    if (ticket) {
      if (sender_type === 'support') {
        // Email venue owner in their configured language
        const venueEmail = ticket.restaurants?.email
        if (venueEmail) {
          const locale = ticket.restaurants?.email_language || 'en'
          const tr = getEmailTranslations(locale)
          const subject = t(tr.supportReplySubject || 'Reply to your support ticket: {subject}', { subject: ticket.subject })

          await sendEmail({
            to: venueEmail,
            subject,
            fromName: 'Veno App',
            htmlContent: `
              <!DOCTYPE html><html><head><meta charset="utf-8">
              <style>
                body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f8f9fa}
                .container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
                .header{background:#6262bd;color:white;padding:32px 30px;text-align:center}
                .header h2{margin:0;font-size:22px}
                .content{padding:30px}
                .ticket-subject{font-weight:bold;color:#6262bd;margin-bottom:16px}
                .message-box{background:#f9fafb;border-left:4px solid #6262bd;border-radius:0 8px 8px 0;padding:16px;margin:16px 0;white-space:pre-wrap;font-size:15px}
                .btn{display:inline-block;padding:12px 28px;background:#6262bd;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:20px}
                .footer{background:#f9fafb;padding:20px 30px;text-align:center;font-size:12px;color:#888;border-top:1px solid #eee}
              </style></head><body>
              <div class="container">
                <div class="header"><h2>${tr.supportReplyTitle || 'Support Reply'}</h2></div>
                <div class="content">
                  <p>${tr.supportReplyIntro || 'Our support team has replied to your ticket:'}</p>
                  <div class="ticket-subject">${ticket.subject}</div>
                  <div class="message-box">${body.replace(/\n/g, '<br>')}</div>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.venoapp.com'}/dashboard/support" class="btn">${tr.supportReplyCta || 'View Ticket'}</a>
                </div>
                <div class="footer">${tr.supportReplyFooter || 'You can reply directly in the dashboard. — Veno App'}</div>
              </div></body></html>
            `,
          }).catch(() => {})
        }
      } else {
        // Email support team (always in English, internal)
        await sendEmail({
          to: 'hello@venoapp.com',
          subject: `[Support Reply] ${ticket.subject} — ${ticket.restaurants?.name || ticket_id}`,
          fromName: 'Veno App',
          htmlContent: `
            <!DOCTYPE html><html><head><meta charset="utf-8">
            <style>
              body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f8f9fa}
              .container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
              .header{background:#6262bd;color:white;padding:32px 30px;text-align:center}
              .header h2{margin:0;font-size:22px}
              .content{padding:30px}
              .message-box{background:#f9fafb;border-left:4px solid #6262bd;border-radius:0 8px 8px 0;padding:16px;margin:16px 0;white-space:pre-wrap;font-size:15px}
              .btn{display:inline-block;padding:12px 28px;background:#6262bd;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:20px}
              .footer{background:#f9fafb;padding:20px 30px;text-align:center;font-size:12px;color:#888;border-top:1px solid #eee}
            </style></head><body>
            <div class="container">
              <div class="header"><h2>New Reply from Venue</h2></div>
              <div class="content">
                <p><strong>${ticket.restaurants?.name || 'Venue'}</strong> has replied to ticket: <strong>${ticket.subject}</strong></p>
                <div class="message-box">${body.replace(/\n/g, '<br>')}</div>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.venoapp.com'}/admin/support" class="btn">View in Admin Panel</a>
              </div>
              <div class="footer">Veno App — Support Notifications</div>
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
