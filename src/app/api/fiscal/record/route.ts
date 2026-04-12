/**
 * POST /api/fiscal/record
 *
 * Server-side endpoint that triggers the fiscal pipeline for one or more
 * orders that have just been marked as paid.
 *
 * Called by:
 *  - The tables page (client component) after process_table_payment RPC succeeds
 *  - The syncManager after an offline payment syncs successfully
 *
 * Body: { orderIds: string[], restaurantId: string, paymentMethod: 'cash' | 'card', occurredAt?: string }
 *
 * Returns: { ok: true } on success, or { ok: false, error: string } on failure.
 *
 * This endpoint uses the Node.js runtime (not Edge) because the fiscal
 * pipeline uses the Supabase service role key which must stay server-side.
 */

import { NextRequest, NextResponse } from 'next/server'
import { processFiscalEvent, FiscalRejectionError } from '@/lib/fiscal/pipeline'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: {
    orderIds: string[]
    restaurantId: string
    paymentMethod: 'cash' | 'card'
    occurredAt?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { orderIds, restaurantId, paymentMethod, occurredAt } = body

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ ok: false, error: 'orderIds must be a non-empty array' }, { status: 400 })
  }
  if (!restaurantId) {
    return NextResponse.json({ ok: false, error: 'restaurantId is required' }, { status: 400 })
  }
  if (paymentMethod !== 'cash' && paymentMethod !== 'card') {
    return NextResponse.json({ ok: false, error: 'paymentMethod must be cash or card' }, { status: 400 })
  }

  const timestamp = occurredAt ?? new Date().toISOString()
  const errors: string[] = []

  for (const orderId of orderIds) {
    try {
      await processFiscalEvent(orderId, restaurantId, paymentMethod, timestamp)
    } catch (err) {
      if (err instanceof FiscalRejectionError) {
        // A fiscal rejection from beforePaymentRecorded — surface to caller.
        // This should not normally happen here since the payment is already
        // recorded at this point, but Brazil SEFAZ could theoretically reject.
        return NextResponse.json(
          { ok: false, error: `Fiscal rejection: ${err.reason}`, rejected: true },
          { status: 422 },
        )
      }
      // Non-blocking errors: log them but continue processing other order IDs.
      // TODO: implement fiscal retry queue before enabling DE, IT, FR, BR, ES venues.
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[fiscal] Non-blocking error for order ${orderId}:`, msg)
      errors.push(`${orderId}: ${msg}`)
    }
  }

  if (errors.length > 0) {
    // Partial failure — orders were paid but fiscal records may be missing.
    // Return 207 so the caller knows fiscal failed but payment succeeded.
    return NextResponse.json(
      { ok: false, partialFailure: true, errors },
      { status: 207 },
    )
  }

  return NextResponse.json({ ok: true })
}
