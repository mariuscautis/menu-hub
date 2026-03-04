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

const VALID_CATEGORIES = ['kitchen', 'bar']

// Normalize common abbreviations to the two values the DB accepts: 'grams' or 'ml'
function normalizeBaseUnit(raw) {
  const v = (raw || '').trim().toLowerCase()
  if (['g', 'gram', 'grams', 'kg', 'kilogram', 'unit', 'units', 'piece', 'pieces', 'bottle', 'can', 'cans'].includes(v)) return 'grams'
  if (['ml', 'milliliter', 'millilitre', 'l', 'liter', 'litre', 'liters', 'litres'].includes(v)) return 'ml'
  return 'grams' // safe default
}

export async function POST(request) {
  try {
    const { restaurantId, products, mode = 'skip' } = await request.json()

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
    }
    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'products array is required' }, { status: 400 })
    }
    if (products.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 products per import' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('stock_products')
      .select('name')
      .eq('restaurant_id', restaurantId)

    const existingNames = new Set((existing || []).map(p => p.name.toLowerCase().trim()))

    const toInsert = []
    const skipped = []
    const errors = []

    for (let i = 0; i < products.length; i++) {
      const raw = products[i]
      const name = (raw.name || '').trim()

      if (!name) {
        errors.push({ row: i + 1, reason: 'Missing name' })
        continue
      }

      if (existingNames.has(name.toLowerCase()) && mode === 'skip') {
        skipped.push(name)
        continue
      }

      const category = VALID_CATEGORIES.includes(raw.category) ? raw.category : 'kitchen'
      const base_unit = normalizeBaseUnit(raw.base_unit)
      const cost = parseFloat(raw.cost_per_base_unit)
      const currentStock = parseFloat(raw.current_stock)

      if (raw.cost_per_base_unit !== undefined && raw.cost_per_base_unit !== '' && isNaN(cost)) {
        errors.push({ row: i + 1, name, reason: 'Invalid cost_per_base_unit' })
        continue
      }

      toInsert.push({
        restaurant_id: restaurantId,
        name,
        brand: (raw.brand || '').trim() || null,
        category,
        base_unit,
        input_unit_type: base_unit === 'ml' ? 'ml' : 'grams',
        units_to_base_multiplier: 1,
        cost_per_base_unit: isNaN(cost) ? 0 : cost,
        current_stock: isNaN(currentStock) ? 0 : currentStock
      })
    }

    let imported = 0
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('stock_products').insert(toInsert)
      if (insertError) {
        return NextResponse.json({ error: `Import failed: ${insertError.message}` }, { status: 500 })
      }
      imported = toInsert.length
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped: skipped.length,
      errors,
      skippedNames: skipped
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
