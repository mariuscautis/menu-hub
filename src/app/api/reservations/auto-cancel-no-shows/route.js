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
    // Get current datetime
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM

    console.log('Auto-cancel check started at:', now.toISOString())
    console.log('Current date:', currentDate, 'Current time:', currentTime)

    // Find all reservations that are overdue and still pending or confirmed
    // A reservation is overdue if:
    // 1. The reservation_date is in the past, OR
    // 2. The reservation_date is today and reservation_time has passed

    // First, get all pending or confirmed reservations
    const { data: reservations, error: fetchError } = await supabaseAdmin
      .from('reservations')
      .select('id, reservation_date, reservation_time, customer_name, customer_email, status')
      .in('status', ['pending', 'confirmed'])
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })

    if (fetchError) {
      console.error('Error fetching reservations:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 })
    }

    console.log(`Found ${reservations.length} pending/confirmed reservations to check`)

    // Filter for overdue reservations
    const overdueReservations = reservations.filter(reservation => {
      const reservationDate = reservation.reservation_date
      const reservationTime = reservation.reservation_time.substring(0, 5)

      // If reservation date is in the past
      if (reservationDate < currentDate) {
        return true
      }

      // If reservation date is today and time has passed
      if (reservationDate === currentDate && reservationTime < currentTime) {
        return true
      }

      return false
    })

    console.log(`Found ${overdueReservations.length} overdue reservations`)

    if (overdueReservations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No overdue reservations found',
        cancelled: 0
      })
    }

    // Update all overdue reservations to "no_show" status
    const updatePromises = overdueReservations.map(reservation => {
      return supabaseAdmin
        .from('reservations')
        .update({
          status: 'no_show',
          cancelled_at: now.toISOString(),
          cancellation_reason: 'Automatic cancellation - No show',
          updated_at: now.toISOString()
        })
        .eq('id', reservation.id)
    })

    const results = await Promise.all(updatePromises)

    // Count successful updates
    const successCount = results.filter(result => !result.error).length
    const errors = results.filter(result => result.error)

    console.log(`Successfully marked ${successCount} reservations as no-show`)
    if (errors.length > 0) {
      console.error('Errors updating some reservations:', errors)
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${successCount} overdue reservations as no-show`,
      cancelled: successCount,
      errors: errors.length
    })

  } catch (error) {
    console.error('Auto-cancel error:', error)
    return NextResponse.json({ error: 'Failed to auto-cancel reservations' }, { status: 500 })
  }
}

// GET endpoint for cron jobs or external services
export async function GET(request) {
  const supabaseAdmin = getSupabaseAdmin()
  // Verify authorization (simple secret check)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here'

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Call the same logic as POST
  return POST(request)
}
