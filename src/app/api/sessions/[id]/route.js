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

// DELETE: Sign out a specific session
export async function DELETE(request, { params }) {
  const supabaseAdmin = getSupabaseAdmin()
  const { id } = await params

  try {
    const { error } = await supabaseAdmin
      .from('staff_sessions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting session:', error)
      return NextResponse.json(
        { error: 'Failed to sign out session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Session signed out successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// PUT: Block or unblock a session
export async function PUT(request, { params }) {
  const supabaseAdmin = getSupabaseAdmin()
  const { id } = await params

  try {
    const { is_blocked } = await request.json()

    if (typeof is_blocked !== 'boolean') {
      return NextResponse.json(
        { error: 'is_blocked must be a boolean' },
        { status: 400 }
      )
    }

    const { data: session, error } = await supabaseAdmin
      .from('staff_sessions')
      .update({ is_blocked })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating session:', error)
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      session,
      message: is_blocked ? 'Session blocked successfully' : 'Session unblocked successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
