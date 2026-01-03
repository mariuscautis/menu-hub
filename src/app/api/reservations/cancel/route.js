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
    const { cancellationToken } = await request.json()

    if (!cancellationToken) {
      return NextResponse.json({ error: 'Cancellation token required' }, { status: 400 })
    }

    // Find reservation by cancellation token
    const { data: reservation, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('cancellation_token', cancellationToken)
      .single()

    if (fetchError || !reservation) {
      console.error('Reservation not found:', fetchError)
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // Check if already cancelled
    if (reservation.status === 'cancelled') {
      return NextResponse.json({ error: 'Reservation already cancelled' }, { status: 400 })
    }

    // Check if reservation is in the past
    const reservationDateTime = new Date(`${reservation.reservation_date}T${reservation.reservation_time}`)
    if (reservationDateTime < new Date()) {
      return NextResponse.json({ error: 'Cannot cancel past reservations' }, { status: 400 })
    }

    // Cancel the reservation
    const { error: updateError } = await supabaseAdmin
      .from('reservations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Customer cancellation'
      })
      .eq('id', reservation.id)

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Reservation cancelled successfully'
    })

  } catch (error) {
    console.error('Cancellation error:', error)
    return NextResponse.json({ error: 'Failed to cancel reservation' }, { status: 500 })
  }
}
