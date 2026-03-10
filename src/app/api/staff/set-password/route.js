// Node.js runtime required for bcryptjs
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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

    // Hash the password with bcrypt (cost factor 12)
    const hashed_password = await bcrypt.hash(password, 12)

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
// Body: { staff_id, new_password }  — manager reset (no PIN required, service-role only)
// Used by the manager dashboard to clear/reset a staff password.
export async function PUT(request) {
  try {
    const { staff_id, reset } = await request.json()

    if (!staff_id) {
      return NextResponse.json({ error: 'staff_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Passing reset:true clears the password — staff will be prompted to set a new one on next login
    if (reset) {
      const { error } = await supabase
        .from('staff')
        .update({ hashed_password: null })
        .eq('id', staff_id)

      if (error) {
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (err) {
    console.error('reset-password error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
