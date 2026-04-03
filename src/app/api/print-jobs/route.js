// Called server-side when a new order is placed.
// Creates one print_job row per active printer whose department matches
// at least one item in the order.
//
// POST /api/print-jobs
// Body: { orderId, restaurantId }

export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request) {
  const supabase = getSupabaseAdmin()

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { orderId, restaurantId } = body
  if (!orderId || !restaurantId) {
    return NextResponse.json({ error: 'orderId and restaurantId are required' }, { status: 400 })
  }

  // Fetch active printers for this restaurant
  const { data: printers, error: printersError } = await supabase
    .from('printers')
    .select('id, department')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)

  if (printersError) {
    return NextResponse.json({ error: printersError.message }, { status: 500 })
  }

  if (!printers || printers.length === 0) {
    // No printers configured — nothing to do
    return NextResponse.json({ created: 0 })
  }

  // Fetch order items — department is stored directly on the row
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('id, department')
    .eq('order_id', orderId)

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  // Collect which departments are actually present in this order
  const departmentsInOrder = new Set(
    (orderItems || []).map(oi => oi.department || 'universal')
  )

  // For each printer, create a job only if the order contains items for that department
  // 'universal' items always trigger all printers
  const jobsToCreate = printers
    .filter(printer =>
      departmentsInOrder.has(printer.department) ||
      departmentsInOrder.has('universal')
    )
    .map(printer => ({
      printer_id: printer.id,
      restaurant_id: restaurantId,
      order_id: orderId,
      status: 'pending',
    }))

  if (jobsToCreate.length === 0) {
    return NextResponse.json({ created: 0 })
  }

  const { error: insertError } = await supabase
    .from('print_jobs')
    .insert(jobsToCreate)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ created: jobsToCreate.length })
}
