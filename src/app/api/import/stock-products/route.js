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

// Map CSV base_unit to DB base_unit ('grams' or 'ml'), input_unit_type, and multiplier
function resolveUnitFields(raw) {
  const v = (raw || '').trim().toLowerCase()

  // Weight-based → base_unit = 'grams'
  if (['g', 'gram', 'grams'].includes(v))
    return { base_unit: 'grams', input_unit_type: 'grams', multiplier: 1 }
  if (['kg', 'kilogram', 'kilograms'].includes(v))
    return { base_unit: 'grams', input_unit_type: 'kg', multiplier: 1000 }

  // Volume-based → base_unit = 'ml'
  if (['ml', 'milliliter', 'millilitre'].includes(v))
    return { base_unit: 'ml', input_unit_type: 'ml', multiplier: 1 }
  if (['l', 'liter', 'litre', 'liters', 'litres'].includes(v))
    return { base_unit: 'ml', input_unit_type: 'liters', multiplier: 1000 }

  // Countable items → base_unit = 'grams' (DB constraint), input_unit_type = 'unit', multiplier = 1
  // The current_stock_value / current_stock gives cost per piece directly
  if (['unit', 'units', 'piece', 'pieces'].includes(v))
    return { base_unit: 'grams', input_unit_type: 'unit', multiplier: 1 }
  if (['bottle', 'bottles'].includes(v))
    return { base_unit: 'ml', input_unit_type: 'bottles', multiplier: 750 }
  if (['can', 'cans'].includes(v))
    return { base_unit: 'ml', input_unit_type: 'cans', multiplier: 330 }

  // Safe default
  return { base_unit: 'grams', input_unit_type: 'grams', multiplier: 1 }
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
      const { base_unit, input_unit_type, multiplier } = resolveUnitFields(raw.base_unit)
      const currentStock = parseFloat(raw.current_stock)
      const stockValue = parseFloat(raw.current_stock_value)

      if (raw.current_stock_value !== undefined && raw.current_stock_value !== '' && isNaN(stockValue)) {
        errors.push({ row: i + 1, name, reason: 'Invalid current_stock_value' })
        continue
      }

      // current_stock in the DB is always in base units.
      // CSV current_stock is in the input unit, so convert: e.g. 5 kg → 5000 grams
      const stockInputQty = isNaN(currentStock) ? 0 : currentStock
      const stockBaseQty = stockInputQty * multiplier
      const totalValue = isNaN(stockValue) ? 0 : stockValue
      // cost_per_base_unit = total value / base qty
      const costPerBaseUnit = stockBaseQty > 0 && totalValue > 0 ? totalValue / stockBaseQty : 0

      toInsert.push({
        restaurant_id: restaurantId,
        name,
        brand: (raw.brand || '').trim() || null,
        category,
        base_unit,
        input_unit_type,
        units_to_base_multiplier: multiplier,
        cost_per_base_unit: costPerBaseUnit,
        current_stock: stockBaseQty
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
