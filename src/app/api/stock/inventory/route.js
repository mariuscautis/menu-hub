export const runtime = 'edge';

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: products, error: productsError } = await supabaseAdmin
      .from('inventory_products')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name')

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    const { data: entries, error: entriesError } = await supabaseAdmin
      .from('inventory_entries')
      .select(`*, inventory_products(name, brand, unit_type)`)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 500 })
    }

    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('purchasing_invoices')
      .select('id, reference_number, supplier_name, invoice_date')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      products: products || [],
      entries: entries || [],
      invoices: invoices || []
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
