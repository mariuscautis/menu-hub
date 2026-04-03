// CloudPRNT polling endpoint
// The Star printer is configured to poll this URL (GET) every few seconds.
// If a print job is queued it responds with jobReady:true.
// The printer then fetches the job (GET ?token=xxx) and POSTs a status report when done.
//
// Configure the printer (via Star WebPRNT or the printer's web UI):
//   Server URL: https://yourdomain.com/api/cloudprnt/{printerId}

export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { buildStarPRNT } from '@/lib/printFormatter'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request, { params }) {
  const supabase = getSupabaseAdmin()
  const { printerId } = params
  const { searchParams } = new URL(request.url)
  const jobToken = searchParams.get('token')

  // ── Serve job content when printer fetches with a token ──────────────────
  if (jobToken) {
    const { data: job, error } = await supabase
      .from('print_jobs')
      .select(`
        *,
        orders (
          id, created_at, notes, order_type, customer_name,
          tables ( table_number ),
          order_items ( id, name, quantity, special_instructions, department )
        )
      `)
      .eq('id', jobToken)
      .eq('printer_id', printerId)
      .eq('status', 'pending')
      .single()

    if (error || !job) {
      return new NextResponse('Job not found', { status: 404 })
    }

    // Mark as printing
    await supabase
      .from('print_jobs')
      .update({ status: 'printing' })
      .eq('id', jobToken)

    const order = job.orders
    const printer = await supabase
      .from('printers')
      .select('department, name')
      .eq('id', printerId)
      .single()

    const department = printer.data?.department || ''
    const printerName = printer.data?.name || ''

    // Filter order items to only this printer's department
    // department is stored directly on each order_item row
    const relevantItems = order.order_items.filter(item => {
      const dept = item.department || 'universal'
      return dept === department || dept === 'universal'
    })

    if (relevantItems.length === 0) {
      // Nothing for this printer — mark done immediately
      await supabase
        .from('print_jobs')
        .update({ status: 'done', printed_at: new Date().toISOString() })
        .eq('id', jobToken)
      return new NextResponse('No items for this printer', { status: 204 })
    }

    const receipt = buildStarPRNT({ order, items: relevantItems, department, printerName })

    return new NextResponse(receipt, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.star.starprnt',
        'Content-Length': String(receipt.byteLength),
      },
    })
  }

  // ── Poll: check if a job is waiting ──────────────────────────────────────
  const { data: pendingJob } = await supabase
    .from('print_jobs')
    .select('id')
    .eq('printer_id', printerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!pendingJob) {
    return NextResponse.json({ jobReady: false })
  }

  return NextResponse.json({
    jobReady: true,
    jobToken: pendingJob.id,
    mediaTypes: ['application/vnd.star.starprnt'],
  })
}

// POST — printer sends a status report after printing
export async function POST(request, { params }) {
  const supabase = getSupabaseAdmin()
  const { printerId } = params
  const { searchParams } = new URL(request.url)
  const jobToken = searchParams.get('token')

  if (!jobToken) return new NextResponse('token required', { status: 400 })

  let statusCode = 'ok'
  try {
    const body = await request.json()
    statusCode = body?.statusCode || 'ok'
  } catch {}

  await supabase
    .from('print_jobs')
    .update({
      status: statusCode === 'ok' ? 'done' : 'error',
      printed_at: new Date().toISOString(),
    })
    .eq('id', jobToken)
    .eq('printer_id', printerId)

  return new NextResponse(null, { status: 200 })
}
