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

// Generate a secure random token
function generateSessionToken() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Parse user agent to get device name
function parseUserAgent(userAgent) {
  if (!userAgent) return 'Unknown Device'

  let browser = 'Unknown Browser'
  let os = 'Unknown OS'

  // Detect browser
  if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Edg')) browser = 'Edge'
  else if (userAgent.includes('Chrome')) browser = 'Chrome'
  else if (userAgent.includes('Safari')) browser = 'Safari'
  else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera'

  // Detect OS
  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac OS') || userAgent.includes('Macintosh')) os = 'macOS'
  else if (userAgent.includes('Linux')) os = 'Linux'
  else if (userAgent.includes('Android')) os = 'Android'
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS'

  return `${browser} on ${os}`
}

// GET: List all sessions for a restaurant
export async function GET(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    // Fetch sessions with staff info
    const { data: sessions, error } = await supabaseAdmin
      .from('staff_sessions')
      .select(`
        id,
        staff_id,
        user_id,
        session_token,
        device_id,
        device_name,
        ip_address,
        is_blocked,
        last_active_at,
        created_at,
        expires_at,
        staff:staff_id (
          id,
          name,
          role,
          department
        )
      `)
      .eq('restaurant_id', restaurantId)
      .gt('expires_at', new Date().toISOString())
      .order('last_active_at', { ascending: false })

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    // Get restaurant owner info for owner sessions
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('owner_id')
      .eq('id', restaurantId)
      .single()

    // Enrich sessions with user type info
    const enrichedSessions = sessions.map(session => ({
      ...session,
      userType: session.staff_id ? 'staff' : 'owner',
      userName: session.staff ? session.staff.name : 'Restaurant Owner',
      userRole: session.staff ? session.staff.role : 'owner',
      userDepartment: session.staff?.department || null
    }))

    return NextResponse.json({
      success: true,
      sessions: enrichedSessions,
      total: enrichedSessions.length
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// POST: Create a new session
export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const body = await request.json()
    const {
      restaurantId,
      staffId,
      userId,
      deviceId
    } = body

    if (!restaurantId || !deviceId) {
      return NextResponse.json(
        { error: 'Restaurant ID and device ID are required' },
        { status: 400 }
      )
    }

    // Get user agent and IP from request headers
    const userAgent = request.headers.get('user-agent') || ''
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'Unknown'

    const deviceName = parseUserAgent(userAgent)
    const sessionToken = generateSessionToken()

    // Check if there's an existing session for this device
    const { data: existingSession } = await supabaseAdmin
      .from('staff_sessions')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('device_id', deviceId)
      .eq('staff_id', staffId || null)
      .maybeSingle()

    if (existingSession) {
      // Update existing session
      const { data: updatedSession, error: updateError } = await supabaseAdmin
        .from('staff_sessions')
        .update({
          session_token: sessionToken,
          device_name: deviceName,
          ip_address: ip,
          user_agent: userAgent,
          is_blocked: false,
          last_active_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .eq('id', existingSession.id)
        .select()
        .single()

      if (updateError) {
        console.error('Session update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update session' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        session: updatedSession,
        sessionToken
      })
    }

    // Create new session
    const sessionData = {
      restaurant_id: restaurantId,
      staff_id: staffId || null,
      user_id: userId || null,
      session_token: sessionToken,
      device_id: deviceId,
      device_name: deviceName,
      ip_address: ip,
      user_agent: userAgent,
      is_blocked: false,
      last_active_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }

    const { data: newSession, error: insertError } = await supabaseAdmin
      .from('staff_sessions')
      .insert(sessionData)
      .select()
      .single()

    if (insertError) {
      console.error('Session insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      session: newSession,
      sessionToken
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// DELETE: Sign out all sessions except current
export async function DELETE(request) {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const currentSessionToken = searchParams.get('currentSessionToken')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    // Delete all sessions except the current one
    let query = supabaseAdmin
      .from('staff_sessions')
      .delete()
      .eq('restaurant_id', restaurantId)

    if (currentSessionToken) {
      query = query.neq('session_token', currentSessionToken)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting sessions:', error)
      return NextResponse.json(
        { error: 'Failed to sign out sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'All other sessions have been signed out'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
