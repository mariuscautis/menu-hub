export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/services/email-edge'
import { getEmailTranslations, t, formatDateForLocale } from '@/lib/email-translations'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function generateRotaEmail(tr, { staffName, restaurantName, rotaUrl, shifts, periodLabel }) {
  const shiftCards = shifts.map((s, i) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;border-radius:10px;border:1px solid #c7d2fe;overflow:hidden;margin-bottom:12px;">
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #c7d2fe;">
          <span style="font-size:11px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.5px;">${tr.shiftPublishedDate}</span>
          <p style="margin:3px 0 0 0;font-size:15px;font-weight:600;color:#1e1b4b;">${s.date}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 18px;border-bottom:1px solid #c7d2fe;">
          <span style="font-size:11px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.5px;">${tr.shiftPublishedTime}</span>
          <p style="margin:3px 0 0 0;font-size:15px;color:#374151;">${s.time}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 18px;border-bottom:1px solid #c7d2fe;">
          <span style="font-size:11px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.5px;">${tr.shiftPublishedRole}</span>
          <p style="margin:3px 0 0 0;font-size:15px;color:#374151;">${s.role}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 18px;">
          <span style="font-size:11px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.5px;">${tr.shiftPublishedBreak}</span>
          <p style="margin:3px 0 0 0;font-size:15px;color:#374151;">${s.breakDuration} ${tr.shiftPublishedMinutes}</p>
        </td>
      </tr>
    </table>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${t(tr.shiftPublishedSubject, { restaurantName })}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6262bd 0%,#4f4fa3 100%);padding:40px 32px;text-align:center;">
            <p style="margin:0 0 8px 0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:1px;text-transform:uppercase;">${restaurantName}</p>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;">📅 ${tr.shiftPublishedTitle}</h1>
            ${periodLabel ? `<p style="margin:8px 0 0 0;font-size:14px;color:rgba(255,255,255,0.85);">${periodLabel}</p>` : ''}
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 8px 0;font-size:16px;color:#374151;">${t(tr.shiftPublishedGreeting, { staffName })}</p>
            <p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;line-height:1.6;">${t(tr.shiftPublishedIntro, { restaurantName })}</p>

            <!-- Shift cards -->
            <p style="margin:0 0 14px 0;font-size:13px;font-weight:700;color:#6262bd;text-transform:uppercase;letter-spacing:0.5px;">${tr.shiftPublishedDetails}</p>
            ${shiftCards}

            <!-- CTA button -->
            <div style="text-align:center;margin:28px 0 32px 0;">
              <a href="${rotaUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6262bd 0%,#4f4fa3 100%);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">${tr.shiftPublishedCta} →</a>
            </div>

            <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.6;">${tr.shiftPublishedOutro}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">${t(tr.shiftPublishedFooter, { restaurantName })}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// POST /api/rota/notify
// Body: { restaurant_id, date_from, date_to }
// Fetches all published shifts in range, groups by staff member,
// sends one email per person with their full schedule for that period.
export async function POST(request) {
  try {
    const { restaurant_id, date_from, date_to } = await request.json()

    if (!restaurant_id || !date_from || !date_to) {
      return NextResponse.json({ error: 'restaurant_id, date_from and date_to are required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Fetch restaurant info
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('name, email_language')
      .eq('id', restaurant_id)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const locale = restaurant.email_language || 'en'
    const restaurantName = restaurant.name
    const tr = getEmailTranslations(locale)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.venoapp.com'
    const rotaUrl = `${baseUrl}/staff-login`

    // Fetch all published shifts in the range that have a staff member assigned
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('id, date, shift_start, shift_end, break_duration, role_required, staff_id')
      .eq('restaurant_id', restaurant_id)
      .eq('status', 'published')
      .gte('date', date_from)
      .lte('date', date_to)
      .not('staff_id', 'is', null)
      .order('date', { ascending: true })
      .order('shift_start', { ascending: true })

    if (shiftsError) {
      return NextResponse.json({ error: shiftsError.message }, { status: 500 })
    }

    if (!shifts || shifts.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No published shifts with assigned staff found in this period' })
    }

    // Group shifts by staff_id
    const byStaff = {}
    for (const shift of shifts) {
      if (!byStaff[shift.staff_id]) byStaff[shift.staff_id] = []
      byStaff[shift.staff_id].push(shift)
    }

    const staffIds = Object.keys(byStaff)

    // Fetch all staff emails in one query
    const { data: staffRows } = await supabase
      .from('staff')
      .select('id, name, email')
      .in('id', staffIds)

    const staffMap = {}
    for (const s of staffRows || []) staffMap[s.id] = s

    // Build period label for email header
    const periodLabel = `${date_from} – ${date_to}`

    let sent = 0
    let skipped = 0
    const errors = []

    for (const staffId of staffIds) {
      const staffMember = staffMap[staffId]
      if (!staffMember?.email) { skipped++; continue }

      const staffShifts = byStaff[staffId].map(shift => ({
        date: formatDateForLocale(shift.date, locale),
        time: `${shift.shift_start?.substring(0, 5)} – ${shift.shift_end?.substring(0, 5)}`,
        role: shift.role_required || '',
        breakDuration: shift.break_duration ?? 30
      }))

      const subject = t(tr.shiftPublishedSubject, { restaurantName })
      const html = generateRotaEmail(tr, {
        staffName: staffMember.name || 'Team Member',
        restaurantName,
        rotaUrl,
        shifts: staffShifts,
        periodLabel
      })

      try {
        await sendEmail({ to: staffMember.email, subject, htmlContent: html, fromName: restaurantName })
        sent++
      } catch (err) {
        console.error(`Failed to send rota email to ${staffMember.email}:`, err)
        errors.push(staffMember.email)
      }
    }

    return NextResponse.json({
      sent,
      skipped,
      total: staffIds.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (err) {
    console.error('rota notify error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
