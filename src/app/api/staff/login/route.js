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

// PBKDF2 verify using Web Crypto API (Edge-compatible)
async function verifyPassword(password, stored) {
  // stored format: "pbkdf2:iterations:saltHex:hashHex"
  const [, iterStr, saltHex, hashHex] = stored.split(':')
  const iterations = parseInt(iterStr, 10)
  const salt = hexToBuffer(saltHex)
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return bufferToHex(derived) === hashHex
}

function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// POST /api/staff/login
// Body: { email, password }
// Returns: { staff_session } or { needs_setup: true, staff_id } if no password set yet
export async function POST(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch staff without join — avoids schema cache issues on Edge
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, email, restaurant_id, department, role, pin_code, hashed_password, status')
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'active')
      .maybeSingle()

    if (staffError) {
      console.error('staff login query error:', staffError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!staff) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // No password set yet — send back signal to redirect to setup page
    if (!staff.hashed_password) {
      return NextResponse.json({
        needs_setup: true,
        staff_id: staff.id,
        name: staff.name,
      })
    }

    const passwordMatch = await verifyPassword(password, staff.hashed_password)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Fetch restaurant separately to get locale
    let restaurantName = null
    let locale = 'en'
    if (staff.restaurant_id) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name, email_language')
        .eq('id', staff.restaurant_id)
        .maybeSingle()
      if (restaurant) {
        restaurantName = restaurant.name
        locale = restaurant.email_language || 'en'
      }
    }

    return NextResponse.json({
      staff_session: {
        staff_id: staff.id,
        name: staff.name,
        email: staff.email,
        restaurant_id: staff.restaurant_id,
        restaurant_name: restaurantName,
        department: staff.department,
        role: staff.role,
        locale,
        logged_in_at: new Date().toISOString(),
      }
    })
  } catch (err) {
    console.error('staff login error:', err)
    return NextResponse.json({ error: 'Internal server error', detail: err?.message || String(err) }, { status: 500 })
  }
}
