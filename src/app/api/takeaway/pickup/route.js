export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { processFiscalEvent, FiscalRejectionError } from '@/lib/fiscal/pipeline'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return Response.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Fetch order to verify it exists and is a takeaway order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return Response.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify this is a takeaway order
    if (order.order_type !== 'takeaway') {
      return Response.json(
        { error: 'This is not a takeaway order' },
        { status: 400 }
      )
    }

    // Verify order is ready for pickup
    if (!order.ready_for_pickup) {
      return Response.json(
        { error: 'Order is not ready for pickup yet' },
        { status: 400 }
      )
    }

    // Check if already picked up
    if (order.picked_up_at) {
      return Response.json(
        { error: 'Order has already been picked up' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // ── Fiscal pre-authorisation ──────────────────────────────────────────
    // Call processFiscalEvent BEFORE marking the order paid so that countries
    // requiring pre-authorisation (e.g. Brazil SEFAZ) can block if rejected.
    // For GB/IE/NL/AU this returns immediately with no side effects.
    try {
      await processFiscalEvent(orderId, order.restaurant_id, 'cash', now)
    } catch (fiscalErr) {
      if (fiscalErr instanceof FiscalRejectionError) {
        // Fiscal authority rejected the payment — must block order completion.
        console.error('[fiscal] Payment rejected by fiscal authority:', fiscalErr.message)
        return Response.json(
          { error: 'Payment rejected by fiscal authority', details: fiscalErr.reason },
          { status: 422 }
        )
      }
      // Any other fiscal error (network timeout, signing failure etc.) is
      // logged but does NOT block the waiter. A retry queue should handle
      // these before going live in fiscally-strict markets.
      // TODO: implement fiscal retry queue before enabling DE, IT, FR, BR, ES venues.
      console.error('[fiscal] Non-blocking fiscal error — order completion proceeding:', fiscalErr)
    }

    // Update order status using admin client (bypasses RLS)
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        picked_up_at: now,
        status: 'completed',
        paid: true,
        payment_method: 'cash',
        payment_taken_at: now
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to update order:', updateError)
      return Response.json(
        { error: 'Failed to confirm pickup', details: updateError.message },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      message: 'Order pickup confirmed',
      orderId: orderId
    })

  } catch (error) {
    console.error('Pickup confirmation API error:', error)
    return Response.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
