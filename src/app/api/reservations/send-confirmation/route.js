export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail as sendBrevoEmail } from '@/lib/services/email-edge'
import { getEmailTranslations, t, formatDateForLocale } from '@/lib/email-translations'

function generateManagerNotificationEmail(reservation, dashboardUrl, tr, locale) {
  const formattedDate = formatDateForLocale(reservation.reservation_date, locale)
  const guestText = reservation.party_size === 1 ? tr.guest : tr.guests

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; }
        .container { background-color: #ffffff; margin: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: #6262bd; color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { margin: 12px 0; font-size: 16px; }
        .detail-label { font-weight: bold; color: #6262bd; }
        .cta-button { display: inline-block; background: #6262bd; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 ${tr.newBookingTitle}</h1>
        </div>
        <div class="content">
          <p>${tr.newBookingGreeting}</p>
          <p>${tr.newBookingIntro}</p>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">${tr.newBookingCustomer}:</span> ${reservation.customer_name}
            </div>
            <div class="detail-row">
              <span class="detail-label">${tr.newBookingDate}:</span> ${formattedDate}
            </div>
            <div class="detail-row">
              <span class="detail-label">${tr.newBookingTime}:</span> ${reservation.reservation_time.substring(0, 5)}
            </div>
            <div class="detail-row">
              <span class="detail-label">${tr.newBookingPartySize}:</span> ${reservation.party_size} ${guestText}
            </div>
            ${reservation.customer_phone ? `
            <div class="detail-row">
              <span class="detail-label">${tr.phone || 'Phone'}:</span> ${reservation.customer_phone}
            </div>
            ` : ''}
            ${reservation.special_requests ? `
            <div class="detail-row">
              <span class="detail-label">${tr.newBookingSpecialRequests}:</span> ${reservation.special_requests}
            </div>
            ` : ''}
          </div>

          <a href="${dashboardUrl}" class="cta-button">${tr.newBookingCta}</a>
        </div>
        <div class="footer">
          <p>${t(tr.newBookingFooter, { restaurantName: reservation.restaurants.name })}</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { reservationId, isConfirmation, locale: requestLocale } = await request.json()

    console.log('Send confirmation email request:', { reservationId, isConfirmation })

    // Fetch reservation details
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('*, restaurants(name, slug, address, phone, email, owner_id, email_language), tables(table_number)')
      .eq('id', reservationId)
      .single()

    if (fetchError || !reservation) {
      console.error('Reservation not found:', fetchError)
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    console.log('Reservation found:', {
      id: reservation.id,
      email: reservation.customer_email,
      isConfirmation
    })

    // Get translations for the reservation's locale
    const locale = requestLocale || reservation.locale || 'en'
    const tr = getEmailTranslations(locale)

    // Generate cancellation URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'
    const cancelUrl = `${baseUrl}/${reservation.restaurants.slug}/reservation/cancel/${reservation.cancellation_token}`

    // Email subject and body
    const subject = isConfirmation
      ? t(tr.reservationConfirmedAt, { restaurantName: reservation.restaurants.name })
      : t(tr.reservationRequestReceivedAt, { restaurantName: reservation.restaurants.name })

    const htmlContent = isConfirmation
      ? generateConfirmationEmail(reservation, cancelUrl, tr, locale)
      : generatePendingEmail(reservation, cancelUrl, tr, locale)

    // Send confirmation SMS if phone is available (email is optional)
    if (isConfirmation && reservation.customer_phone) {
      try {
        const formattedDate = formatDateForLocale(reservation.reservation_date, locale)
        const smsBody = `Your booking at ${reservation.restaurants.name} on ${formattedDate} at ${reservation.reservation_time.substring(0, 5)} has been confirmed. See you soon!`
        await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: process.env.BREVO_SMS_SENDER || 'VenoApp',
            recipient: reservation.customer_phone,
            content: smsBody,
            type: 'transactional'
          })
        })
      } catch (smsErr) {
        console.error('Confirmation SMS error:', smsErr)
        // Non-fatal
      }
    }

    // Skip email if no customer email
    if (!reservation.customer_email) {
      return NextResponse.json({ success: true, emailResult: null })
    }

    console.log('Sending email:', { to: reservation.customer_email, subject })

    // Send email using Brevo - use restaurant name as sender name
    const emailResult = await sendBrevoEmail({
      to: reservation.customer_email,
      subject,
      htmlContent,
      fromName: reservation.restaurants.name
    })

    console.log('Email send result:', emailResult)

    // Mark email as sent
    await supabaseAdmin
      .from('reservations')
      .update({ confirmation_email_sent: true })
      .eq('id', reservationId)

    // Send manager notification when a new booking is submitted (not on confirmation)
    if (!isConfirmation) {
      try {
        const managerLocale = reservation.restaurants.email_language || 'en'
        const trManager = getEmailTranslations(managerLocale)

        let managerEmail = reservation.restaurants.email
        if (!managerEmail && reservation.restaurants.owner_id) {
          const { data: ownerEmail } = await supabaseAdmin
            .rpc('get_owner_email', { owner_id: reservation.restaurants.owner_id })
          managerEmail = ownerEmail
        }

        if (managerEmail) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'
          const dashboardUrl = `${baseUrl}/dashboard/reservations`
          const managerSubject = t(trManager.newBookingSubject, { restaurantName: reservation.restaurants.name })
          const managerHtml = generateManagerNotificationEmail(reservation, dashboardUrl, trManager, managerLocale)
          await sendBrevoEmail({
            to: managerEmail,
            subject: managerSubject,
            htmlContent: managerHtml,
            fromName: reservation.restaurants.name
          })
        }
      } catch (managerEmailError) {
        console.error('Failed to send manager notification email:', managerEmailError)
        // Non-fatal — customer email already sent successfully
      }
    }

    return NextResponse.json({ success: true, emailResult })

  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json({
      error: 'Failed to send email',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

function generateConfirmationEmail(reservation, cancelUrl, tr, locale) {
  const formattedDate = formatDateForLocale(reservation.reservation_date, locale)
  const guestText = reservation.party_size === 1 ? tr.guest : tr.guests

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          background-color: #f8f9fa;
        }
        .container {
          background-color: #ffffff;
          margin: 20px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: #6262bd;
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 30px;
        }
        .details {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .detail-row {
          margin: 12px 0;
          font-size: 16px;
        }
        .detail-label {
          font-weight: bold;
          color: #6262bd;
        }
        .cancel-link {
          color: #dc2626;
          text-decoration: underline;
          margin-top: 20px;
          display: inline-block;
        }
        .footer {
          background: #f9fafb;
          padding: 20px 30px;
          text-align: center;
          font-size: 14px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ ${tr.reservationConfirmed}</h1>
        </div>
        <div class="content">
          <p>${t(tr.dearCustomer, { customerName: reservation.customer_name })}</p>
          <p>${t(tr.reservationConfirmedMessage, { restaurantName: reservation.restaurants.name })}</p>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">${tr.date}:</span> ${formattedDate}
            </div>
            <div class="detail-row">
              <span class="detail-label">${tr.time}:</span> ${reservation.reservation_time.substring(0, 5)}
            </div>
            <div class="detail-row">
              <span class="detail-label">${tr.partySize}:</span> ${reservation.party_size} ${guestText}
            </div>
            <div class="detail-row">
              <span class="detail-label">${tr.table}:</span> ${reservation.tables?.table_number || tr.toBeAssigned}
            </div>
            ${reservation.special_requests ? `
            <div class="detail-row">
              <span class="detail-label">${tr.specialRequests}:</span> ${reservation.special_requests}
            </div>
            ` : ''}
          </div>

          <p><strong>${tr.arriveWithin15}</strong></p>
          <p>${tr.lookForwardToServing}</p>

          ${reservation.restaurants.address || reservation.restaurants.phone ? `
          <div class="details">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #6262bd;">📍 ${tr.restaurantLocation || 'Restaurant Location'}</h3>
            <div class="detail-row">
              <span class="detail-label">${reservation.restaurants.name}</span>
            </div>
            ${reservation.restaurants.address ? `
            <div class="detail-row">
              📍 <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reservation.restaurants.address)}"
                 style="color: #6262bd; text-decoration: underline;"
                 target="_blank"
                 rel="noopener noreferrer">${reservation.restaurants.address}</a>
            </div>
            ` : ''}
            ${reservation.restaurants.phone ? `
            <div class="detail-row">
              <span class="detail-label">${tr.phone || 'Phone'}:</span> ${reservation.restaurants.phone}
            </div>
            ` : ''}
          </div>
          ` : ''}

          <p>${tr.needToCancel}</p>
          <p><a href="${cancelUrl}" class="cancel-link">${tr.cancelReservation}</a></p>
        </div>
        <div class="footer">
          <p>${tr.automatedMessage.replace('email', 'message')} ${reservation.restaurants.name}</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generatePendingEmail(reservation, cancelUrl, tr, locale) {
  const formattedDate = formatDateForLocale(reservation.reservation_date, locale)
  const guestText = reservation.party_size === 1 ? tr.guest : tr.guests

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          background-color: #f8f9fa;
        }
        .container {
          background-color: #ffffff;
          margin: 20px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          background: #f59e0b;
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 30px;
        }
        .details {
          background: #fef3c7;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .detail-row {
          margin: 12px 0;
          font-size: 16px;
        }
        .detail-label {
          font-weight: bold;
          color: #d97706;
        }
        .pending-notice {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
        }
        .cancel-link {
          color: #dc2626;
          text-decoration: underline;
        }
        .footer {
          background: #f9fafb;
          padding: 20px 30px;
          text-align: center;
          font-size: 14px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏳ ${tr.reservationRequestReceived}</h1>
        </div>
        <div class="content">
          <p>${t(tr.dearCustomer, { customerName: reservation.customer_name })}</p>
          <p>${t(tr.receivedRequestMessage, { restaurantName: reservation.restaurants.name })}</p>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">${tr.date}:</span> ${formattedDate}
            </div>
            <div class="detail-row">
              <span class="detail-label">${tr.time}:</span> ${reservation.reservation_time.substring(0, 5)}
            </div>
            <div class="detail-row">
              <span class="detail-label">${tr.partySize}:</span> ${reservation.party_size} ${guestText}
            </div>
            ${reservation.special_requests ? `
            <div class="detail-row">
              <span class="detail-label">${tr.specialRequests}:</span> ${reservation.special_requests}
            </div>
            ` : ''}
          </div>

          <div class="pending-notice">
            <strong>⏳ ${tr.pendingApproval}</strong>
            <p style="margin: 10px 0 0 0;">${tr.pendingApprovalMessage}</p>
          </div>

          ${reservation.restaurants.address || reservation.restaurants.phone ? `
          <div class="details">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #d97706;">📍 ${tr.restaurantLocation || 'Restaurant Location'}</h3>
            <div class="detail-row">
              <span class="detail-label">${reservation.restaurants.name}</span>
            </div>
            ${reservation.restaurants.address ? `
            <div class="detail-row">
              📍 <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reservation.restaurants.address)}"
                 style="color: #d97706; text-decoration: underline;"
                 target="_blank"
                 rel="noopener noreferrer">${reservation.restaurants.address}</a>
            </div>
            ` : ''}
            ${reservation.restaurants.phone ? `
            <div class="detail-row">
              <span class="detail-label">${tr.phone || 'Phone'}:</span> ${reservation.restaurants.phone}
            </div>
            ` : ''}
          </div>
          ` : ''}

          <p>${tr.needToCancel.replace('reservation', 'request')}</p>
          <p><a href="${cancelUrl}" class="cancel-link">${tr.cancelRequest}</a></p>
        </div>
        <div class="footer">
          <p>${tr.automatedMessage.replace('email', 'message')} ${reservation.restaurants.name}</p>
        </div>
      </div>
    </body>
    </html>
  `
}
