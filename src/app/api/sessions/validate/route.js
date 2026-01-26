export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create admin client with service role key
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

// POST: Validate a session and update last_active_at
export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { sessionToken, deviceId } = await request.json()

    if (!sessionToken || !deviceId) {
      return NextResponse.json(
        { valid: false, reason: 'missing_credentials' },
        { status: 200 }
      )
    }

    // Find and validate the session
    const { data: session, error } = await supabaseAdmin
      .from('staff_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('device_id', deviceId)
      .maybeSingle()

    if (error) {
      console.error('Session validation error:', error)
      return NextResponse.json(
        { valid: false, reason: 'database_error' },
        { status: 200 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { valid: false, reason: 'session_not_found' },
        { status: 200 }
      )
    }

    // Check if session is blocked
    if (session.is_blocked) {
      return NextResponse.json(
        { valid: false, reason: 'session_blocked' },
        { status: 200 }
      )
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      // Delete expired session
      await supabaseAdmin
        .from('staff_sessions')
        .delete()
        .eq('id', session.id)

      return NextResponse.json(
        { valid: false, reason: 'session_expired' },
        { status: 200 }
      )
    }

    // Update last_active_at
    await supabaseAdmin
      .from('staff_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', session.id)

    return NextResponse.json({
      valid: true,
      session: {
        id: session.id,
        staff_id: session.staff_id,
        user_id: session.user_id,
        restaurant_id: session.restaurant_id
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { valid: false, reason: 'server_error' },
      { status: 200 }
    )
  }
}
