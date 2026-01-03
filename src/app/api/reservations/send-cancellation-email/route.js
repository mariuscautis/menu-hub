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
    const { reservationId } = await request.json()

    // Fetch reservation details with restaurant info
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('*, restaurants(name, slug, phone)')
      .eq('id', reservationId)
      .single()

    if (fetchError || !reservation) {
      console.error('Reservation not found:', fetchError)
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Generate email
    const subject = `Reservation Cancelled - ${reservation.restaurants.name}`
    const htmlBody = generateCancellationEmail(reservation)

    // Send email
    await sendEmail({
      to: reservation.customer_email,
      subject,
      html: htmlBody
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Cancellation email error:', error)
    return NextResponse.json({ error: 'Failed to send cancellation email' }, { status: 500 })
  }
}

function generateCancellationEmail(reservation) {
  const restaurantPhone = reservation.restaurants.phone || 'the restaurant directly'
  const phoneDisplay = reservation.restaurants.phone
    ? `<a href="tel:${reservation.restaurants.phone}" style="color: #6262bd; text-decoration: none;">${reservation.restaurants.phone}</a>`
    : 'the restaurant directly'

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
          background: #dc2626;
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
          background: #fef2f2;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #dc2626;
        }
        .detail-row {
          margin: 12px 0;
          font-size: 16px;
        }
        .detail-label {
          font-weight: bold;
          color: #dc2626;
        }
        .contact-box {
          background: #f0f9ff;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .contact-box h3 {
          margin: 0 0 10px 0;
          color: #1e40af;
          font-size: 18px;
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
          <h1>✗ Reservation Cancelled</h1>
        </div>
        <div class="content">
          <p>Dear ${reservation.customer_name},</p>
          <p>Your reservation at <strong>${reservation.restaurants.name}</strong> has been cancelled.</p>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Original Date:</span> ${new Date(reservation.reservation_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div class="detail-row">
              <span class="detail-label">Original Time:</span> ${reservation.reservation_time.substring(0, 5)}
            </div>
            <div class="detail-row">
              <span class="detail-label">Party Size:</span> ${reservation.party_size} ${reservation.party_size === 1 ? 'guest' : 'guests'}
            </div>
            ${reservation.cancellation_reason ? `
            <div class="detail-row">
              <span class="detail-label">Reason:</span> ${reservation.cancellation_reason}
            </div>
            ` : ''}
          </div>

          <div class="contact-box">
            <h3>📞 Was this incorrect?</h3>
            <p style="margin: 10px 0 0 0;">
              If you believe this cancellation was made in error, please contact us at ${phoneDisplay} as soon as possible.
            </p>
          </div>

          <p>We hope to see you at ${reservation.restaurants.name} in the future!</p>
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
  const emailProvider = process.env.EMAIL_PROVIDER || 'resend'

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
  console.log('Cancellation email sent via Resend:', result.id)
  return result
}

async function sendEmailViaSES({ to, subject, html }) {
  const AWS_SES_REGION = process.env.AWS_SES_REGION || 'us-east-1'
  const AWS_SES_ACCESS_KEY_ID = process.env.AWS_SES_ACCESS_KEY_ID
  const AWS_SES_SECRET_ACCESS_KEY = process.env.AWS_SES_SECRET_ACCESS_KEY
  const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@yourdomain.com'

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
  console.log('Cancellation email sent via AWS SES:', result.MessageId)
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
