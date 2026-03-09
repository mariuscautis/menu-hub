export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function escapeCSV(val) {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function toCSVRow(values) {
  return values.map(escapeCSV).join(',')
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: products, error } = await supabase
      .from('stock_products')
      .select('name, brand, category, base_unit, cost_per_base_unit, current_stock')
      .eq('restaurant_id', restaurantId)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const header = 'name,brand,category,base_unit,current_stock,current_stock_value'
    const rows = (products || []).map(p => {
      const qty = p.current_stock ?? 0
      const cost = p.cost_per_base_unit ?? 0
      const stockValue = (qty * cost).toFixed(2)
      return toCSVRow([
        p.name,
        p.brand || '',
        p.category || 'kitchen',
        p.base_unit || 'grams',
        qty,
        stockValue
      ])
    })

    const csv = [header, ...rows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="stock-products-export.csv"'
      }
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
