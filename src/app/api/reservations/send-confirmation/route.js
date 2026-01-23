export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail as sendBrevoEmail } from '@/lib/services/email-edge'
import { getEmailTranslations, t, formatDateForLocale } from '@/lib/email-translations'

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
      .select('*, restaurants(name, slug, address, phone), tables(table_number)')
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

    console.log('Sending email:', { to: reservation.customer_email, subject })

    // Send email using Brevo
    const emailResult = await sendBrevoEmail({
      to: reservation.customer_email,
      subject,
      htmlContent
    })

    console.log('Email send result:', emailResult)

    // Mark email as sent
    await supabaseAdmin
      .from('reservations')
      .update({ confirmation_email_sent: true })
      .eq('id', reservationId)

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
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reservation.restaurants.address)}"
                 style="color: #6262bd; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;"
                 target="_blank">
                <span>📍</span>
                <span style="text-decoration: underline;">${reservation.restaurants.address}</span>
                <span style="font-size: 12px;">↗</span>
              </a>
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
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reservation.restaurants.address)}"
                 style="color: #d97706; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;"
                 target="_blank">
                <span>📍</span>
                <span style="text-decoration: underline;">${reservation.restaurants.address}</span>
                <span style="font-size: 12px;">↗</span>
              </a>
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
