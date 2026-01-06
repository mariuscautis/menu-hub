export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
    const { reservationId, tableId, confirmedByStaffName, confirmedByUserId } = await request.json()

    console.log('Confirm reservation request:', { reservationId, tableId, confirmedByStaffName })

    // Use RPC function with admin client
    const { data, error } = await supabaseAdmin.rpc('confirm_reservation', {
      p_reservation_id: reservationId,
      p_table_id: tableId,
      p_confirmed_by_staff_name: confirmedByStaffName,
      p_confirmed_by_user_id: confirmedByUserId
    })

    if (error) {
      console.error('RPC error:', error)
      return NextResponse.json({
        success: false,
        error: error.message || 'Failed to confirm reservation'
      }, { status: 400 })
    }

    if (data && !data.success) {
      return NextResponse.json({
        success: false,
        error: data.error || 'Failed to confirm reservation'
      }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Confirm reservation error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
