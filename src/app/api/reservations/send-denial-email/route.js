export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail as sendBrevoEmail } from '@/lib/services/email-edge'
import { getEmailTranslations, t, formatDateForLocale } from '@/lib/email-translations'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { reservationId } = await request.json()

    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('*, restaurants(name, slug, phone, sms_billing_enabled)')
      .eq('id', reservationId)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const locale = reservation.locale || 'en'
    const tr = getEmailTranslations(locale)

    // Send SMS if venue has SMS add-on and customer has a phone number
    if (reservation.restaurants.sms_billing_enabled && reservation.customer_phone) {
      try {
        const formattedDate = formatDateForLocale(reservation.reservation_date, locale)
        const DENIAL_SMS = {
          en: 'Unfortunately your booking request at {name} on {date} at {time} has been declined. Please contact the venue for more information.',
          es: 'Lamentablemente tu solicitud de reserva en {name} el {date} a las {time} ha sido rechazada. Contacta al local para más información.',
          fr: 'Malheureusement votre demande de réservation chez {name} le {date} à {time} a été refusée. Veuillez contacter l\'établissement pour plus d\'informations.',
          it: 'Purtroppo la tua richiesta di prenotazione presso {name} il {date} alle {time} è stata rifiutata. Contatta il locale per ulteriori informazioni.',
          ro: 'Din păcate cererea ta de rezervare la {name} pe {date} la ora {time} a fost refuzată. Contactează localul pentru mai multe informații.',
        }
        const smsTpl = DENIAL_SMS[locale] || DENIAL_SMS.en
        const smsBody = smsTpl
          .replace('{name}', reservation.restaurants.name)
          .replace('{date}', formattedDate)
          .replace('{time}', reservation.reservation_time.substring(0, 5))
        await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
          method: 'POST',
          headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: process.env.BREVO_SMS_SENDER || 'MenuHub',
            recipient: reservation.customer_phone,
            content: smsBody,
            type: 'transactional'
          })
        })
      } catch (smsErr) {
        console.error('Denial SMS error:', smsErr)
        // Non-fatal
      }
    }

    // Send email if customer has an email address
    if (reservation.customer_email) {
      const phoneDisplay = reservation.restaurants.phone
        ? `<a href="tel:${reservation.restaurants.phone}" style="color: #6262bd;">${reservation.restaurants.phone}</a>`
        : tr.theRestaurantDirectly

      const formattedDate = formatDateForLocale(reservation.reservation_date, locale)
      const guestText = reservation.party_size === 1 ? tr.guest : tr.guests

      const subject = `❌ ${tr.reservationCancelled} - ${reservation.restaurants.name}`
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; }
            .container { background-color: #ffffff; margin: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: #dc2626; color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px; }
            .details { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .detail-row { margin: 12px 0; font-size: 16px; }
            .detail-label { font-weight: bold; color: #dc2626; }
            .contact-box { background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .contact-box h3 { margin: 0 0 10px 0; color: #1e40af; font-size: 18px; }
            .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ ${tr.reservationCancelled}</h1>
            </div>
            <div class="content">
              <p>${t(tr.dearCustomer, { customerName: reservation.customer_name })},</p>
              <p>${t(tr.reservationCancelledMessage, { restaurantName: reservation.restaurants.name })}</p>

              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">${tr.originalDate}:</span> ${formattedDate}
                </div>
                <div class="detail-row">
                  <span class="detail-label">${tr.originalTime}:</span> ${reservation.reservation_time.substring(0, 5)}
                </div>
                <div class="detail-row">
                  <span class="detail-label">${tr.partySize}:</span> ${reservation.party_size} ${guestText}
                </div>
                ${reservation.denied_reason ? `
                <div class="detail-row">
                  <span class="detail-label">${tr.reason}:</span> ${reservation.denied_reason}
                </div>
                ` : ''}
              </div>

              <div class="contact-box">
                <h3>📞 ${tr.wasThisIncorrect}</h3>
                <p style="margin: 10px 0 0 0;">
                  ${t(tr.cancellationErrorMessage, { phone: phoneDisplay })}
                </p>
              </div>

              <p>${t(tr.hopeToSeeYou, { restaurantName: reservation.restaurants.name })}</p>
            </div>
            <div class="footer">
              <p>${t(tr.automatedMessageFrom, { restaurantName: reservation.restaurants.name })}</p>
            </div>
          </div>
        </body>
        </html>
      `

      await sendBrevoEmail({
        to: reservation.customer_email,
        subject,
        htmlContent,
        fromName: reservation.restaurants.name
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Denial notification error:', error)
    return NextResponse.json({ error: 'Failed to send denial notification' }, { status: 500 })
  }
}
