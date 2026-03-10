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

// PBKDF2 hash using Web Crypto API (Edge-compatible)
// Stores as "pbkdf2:iterations:saltHex:hashHex"
async function hashPassword(password) {
  const enc = new TextEncoder()
  const saltBuffer = crypto.getRandomValues(new Uint8Array(16))
  const iterations = 200_000
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const saltHex = Array.from(saltBuffer).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2:${iterations}:${saltHex}:${hashHex}`
}

// POST /api/staff/set-password
// Body: { staff_id, pin_code, password, confirm_password }
// Verifies the PIN, then hashes and stores the new password.
export async function POST(request) {
  try {
    const { staff_id, pin_code, password, confirm_password } = await request.json()

    if (!staff_id || !pin_code || !password) {
      return NextResponse.json({ error: 'staff_id, pin_code, and password are required' }, { status: 400 })
    }

    if (password !== confirm_password) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Verify staff exists and PIN matches
    const { data: staff, error: fetchError } = await supabase
      .from('staff')
      .select('id, pin_code, status')
      .eq('id', staff_id)
      .eq('status', 'active')
      .maybeSingle()

    if (fetchError || !staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    if (staff.pin_code !== pin_code) {
      return NextResponse.json({ error: 'Invalid PIN code' }, { status: 401 })
    }

    const hashed_password = await hashPassword(password)

    const { error: updateError } = await supabase
      .from('staff')
      .update({ hashed_password })
      .eq('id', staff_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save password' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('set-password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/staff/set-password
// Body: { staff_id, reset: true }  — manager reset, clears hashed_password to null
export async function PUT(request) {
  try {
    const { staff_id, reset } = await request.json()

    if (!staff_id) {
      return NextResponse.json({ error: 'staff_id is required' }, { status: 400 })
    }

    if (!reset) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('staff')
      .update({ hashed_password: null })
      .eq('id', staff_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('reset-password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
