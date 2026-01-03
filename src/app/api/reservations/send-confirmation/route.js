export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request) {
  try {
    const { reservationId, isConfirmation } = await request.json()

    // Fetch reservation details
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('*, restaurants(name, slug), tables(table_number)')
      .eq('id', reservationId)
      .single()

    if (fetchError || !reservation) {
      console.error('Reservation not found:', fetchError)
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Generate cancellation URL
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${reservation.restaurants.slug}/reservation/cancel/${reservation.cancellation_token}`

    // Email subject and body
    const subject = isConfirmation
      ? `Reservation Confirmed at ${reservation.restaurants.name}`
      : `Reservation Request Received - ${reservation.restaurants.name}`

    const htmlBody = isConfirmation
      ? generateConfirmationEmail(reservation, cancelUrl)
      : generatePendingEmail(reservation, cancelUrl)

    // Send email using Resend
    await sendEmail({
      to: reservation.customer_email,
      subject,
      html: htmlBody
    })

    // Mark email as sent
    await supabaseAdmin
      .from('reservations')
      .update({ confirmation_email_sent: true })
      .eq('id', reservationId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

function generateConfirmationEmail(reservation, cancelUrl) {
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
          <h1>✓ Reservation Confirmed!</h1>
        </div>
        <div class="content">
          <p>Dear ${reservation.customer_name},</p>
          <p>Great news! Your reservation at <strong>${reservation.restaurants.name}</strong> has been confirmed.</p>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Date:</span> ${new Date(reservation.reservation_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span> ${reservation.reservation_time.substring(0, 5)}
            </div>
            <div class="detail-row">
              <span class="detail-label">Party Size:</span> ${reservation.party_size} ${reservation.party_size === 1 ? 'guest' : 'guests'}
            </div>
            <div class="detail-row">
              <span class="detail-label">Table:</span> ${reservation.tables?.table_number || 'To be assigned'}
            </div>
            ${reservation.special_requests ? `
            <div class="detail-row">
              <span class="detail-label">Special Requests:</span> ${reservation.special_requests}
            </div>
            ` : ''}
          </div>

          <p><strong>Please arrive within 15 minutes of your reservation time.</strong></p>
          <p>We look forward to serving you!</p>

          <p>If you need to cancel your reservation, please use the link below:</p>
          <p><a href="${cancelUrl}" class="cancel-link">Cancel Reservation</a></p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${reservation.restaurants.name}</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generatePendingEmail(reservation, cancelUrl) {
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
          <h1>⏳ Reservation Request Received</h1>
        </div>
        <div class="content">
          <p>Dear ${reservation.customer_name},</p>
          <p>We've received your reservation request at <strong>${reservation.restaurants.name}</strong>.</p>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Date:</span> ${new Date(reservation.reservation_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span> ${reservation.reservation_time.substring(0, 5)}
            </div>
            <div class="detail-row">
              <span class="detail-label">Party Size:</span> ${reservation.party_size} ${reservation.party_size === 1 ? 'guest' : 'guests'}
            </div>
            ${reservation.special_requests ? `
            <div class="detail-row">
              <span class="detail-label">Special Requests:</span> ${reservation.special_requests}
            </div>
            ` : ''}
          </div>

          <div class="pending-notice">
            <strong>⏳ Pending Approval</strong>
            <p style="margin: 10px 0 0 0;">Your reservation is awaiting confirmation from the restaurant. You'll receive another email once it's been approved.</p>
          </div>

          <p>If you need to cancel your request, please use the link below:</p>
          <p><a href="${cancelUrl}" class="cancel-link">Cancel Request</a></p>
        </div>
        <div class="footer">
          <p>This is an automated message from ${reservation.restaurants.name}</p>
        </div>
      </div>
    </body>
    </html>
  `
}

async function sendEmail({ to, subject, html }) {
  const emailProvider = process.env.EMAIL_PROVIDER || 'resend' // 'resend' or 'aws-ses'

  // Check if any email service is configured
  if (emailProvider === 'resend' && !process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Email would be sent to:', to)
    console.log('Subject:', subject)
    return { success: true, note: 'Email service not configured' }
  }

  if (emailProvider === 'aws-ses' && (!process.env.AWS_SES_ACCESS_KEY_ID || !process.env.AWS_SES_SECRET_ACCESS_KEY)) {
    console.warn('AWS SES not configured. Email would be sent to:', to)
    console.log('Subject:', subject)
    return { success: true, note: 'Email service not configured' }
  }

  try {
    if (emailProvider === 'aws-ses') {
      return await sendEmailViaSES({ to, subject, html })
    } else {
      return await sendEmailViaResend({ to, subject, html })
    }
  } catch (error) {
    console.error('Email service error:', error)
    throw error
  }
}

async function sendEmailViaResend({ to, subject, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to,
      subject,
      html
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend API error: ${error}`)
  }

  const result = await response.json()
  console.log('Email sent via Resend:', result.id)
  return result
}

async function sendEmailViaSES({ to, subject, html }) {
  const AWS_SES_REGION = process.env.AWS_SES_REGION || 'us-east-1'
  const AWS_SES_ACCESS_KEY_ID = process.env.AWS_SES_ACCESS_KEY_ID
  const AWS_SES_SECRET_ACCESS_KEY = process.env.AWS_SES_SECRET_ACCESS_KEY
  const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@yourdomain.com'

  // Create AWS SES v2 API request
  const endpoint = `https://email.${AWS_SES_REGION}.amazonaws.com/v2/email/outbound-emails`

  const message = {
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: { Html: { Data: html } }
      }
    },
    Destination: {
      ToAddresses: [to]
    },
    FromEmailAddress: EMAIL_FROM
  }

  // Sign request with AWS Signature V4
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = date.slice(0, 8)

  const body = JSON.stringify(message)

  // Create canonical request
  const payloadHash = await sha256(body)
  const canonicalRequest = [
    'POST',
    '/v2/email/outbound-emails',
    '',
    `host:email.${AWS_SES_REGION}.amazonaws.com`,
    'x-amz-date:' + date,
    '',
    'host;x-amz-date',
    payloadHash
  ].join('\n')

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${AWS_SES_REGION}/ses/aws4_request`
  const canonicalRequestHash = await sha256(canonicalRequest)
  const stringToSign = [
    algorithm,
    date,
    credentialScope,
    canonicalRequestHash
  ].join('\n')

  // Calculate signature
  const signingKey = await getSignatureKey(
    AWS_SES_SECRET_ACCESS_KEY,
    dateStamp,
    AWS_SES_REGION,
    'ses'
  )
  const signature = await hmac(signingKey, stringToSign)

  // Create authorization header
  const authorizationHeader = `${algorithm} Credential=${AWS_SES_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=host;x-amz-date, Signature=${signature}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authorizationHeader,
      'Content-Type': 'application/json',
      'Host': `email.${AWS_SES_REGION}.amazonaws.com`,
      'X-Amz-Date': date
    },
    body
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AWS SES API error: ${error}`)
  }

  const result = await response.json()
  console.log('Email sent via AWS SES:', result.MessageId)
  return result
}

// AWS Signature V4 helper functions
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hmac(key, message) {
  const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key
  const msgBuffer = new TextEncoder().encode(message)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer)
  const signatureArray = Array.from(new Uint8Array(signature))
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = await hmacBinary('AWS4' + key, dateStamp)
  const kRegion = await hmacBinary(kDate, regionName)
  const kService = await hmacBinary(kRegion, serviceName)
  return await hmacBinary(kService, 'aws4_request')
}

async function hmacBinary(key, message) {
  const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key
  const msgBuffer = new TextEncoder().encode(message)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBuffer)
  return new Uint8Array(signature)
}
