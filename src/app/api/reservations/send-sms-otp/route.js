export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Simple hash using Web Crypto (available in Edge runtime)
async function hashOtp(otp) {
  const encoder = new TextEncoder()
  const data = encoder.encode(otp + process.env.OTP_SECRET)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateOtp() {
  // Cryptographically random 6-digit code
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String(arr[0] % 1000000).padStart(6, '0')
}

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { phone, restaurantName } = await request.json()

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number required' }, { status: 400 })
    }

    // Normalise phone: strip spaces/dashes for storage/matching
    const normalised = phone.replace(/\s+/g, '').replace(/-/g, '')

    // Rate limit: max 3 OTPs per phone in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count } = await supabaseAdmin
      .from('sms_otps')
      .select('id', { count: 'exact', head: true })
      .eq('phone', normalised)
      .gte('created_at', tenMinutesAgo)

    if (count >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please wait a few minutes before requesting a new code.' },
        { status: 429 }
      )
    }

    const otp = generateOtp()
    const otpHash = await hashOtp(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

    // Store hashed OTP
    const { error: insertError } = await supabaseAdmin
      .from('sms_otps')
      .insert({ phone: normalised, otp_hash: otpHash, expires_at: expiresAt })

    if (insertError) {
      console.error('OTP insert error:', insertError)
      return NextResponse.json({ success: false, error: 'Failed to generate verification code' }, { status: 500 })
    }

    // Send SMS via Brevo
    const smsBody = restaurantName
      ? `Your ${restaurantName} booking verification code is: ${otp}. Valid for 10 minutes.`
      : `Your booking verification code is: ${otp}. Valid for 10 minutes.`

    const brevoRes = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: process.env.BREVO_SMS_SENDER || 'MenuHub',
        recipient: normalised,
        content: smsBody,
        type: 'transactional'
      })
    })

    if (!brevoRes.ok) {
      const brevoError = await brevoRes.text()
      console.error('Brevo SMS error:', brevoError)
      // Don't expose Brevo errors to client
      return NextResponse.json({ success: false, error: 'Failed to send verification SMS. Please check your phone number.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Verification code sent' })

  } catch (error) {
    console.error('send-sms-otp error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
