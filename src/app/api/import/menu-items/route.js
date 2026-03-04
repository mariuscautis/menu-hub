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

export async function POST(request) {
  try {
    const { restaurantId, items, mode = 'skip' } = await request.json()

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 })
    }
    if (items.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 items per import' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Load existing menu items and categories once
    const [{ data: existingItems }, { data: existingCategories }] = await Promise.all([
      supabase.from('menu_items').select('name').eq('restaurant_id', restaurantId),
      supabase.from('menu_categories').select('id, name').eq('restaurant_id', restaurantId)
    ])

    const existingNames = new Set((existingItems || []).map(i => i.name.toLowerCase().trim()))
    const categoryMap = new Map((existingCategories || []).map(c => [c.name.toLowerCase().trim(), c.id]))

    // Collect new categories to create
    const newCategoryNames = new Set()
    for (const item of items) {
      const catName = (item.category || '').trim()
      if (catName && !categoryMap.has(catName.toLowerCase())) {
        newCategoryNames.add(catName)
      }
    }

    // Insert missing categories
    if (newCategoryNames.size > 0) {
      const toInsert = Array.from(newCategoryNames).map((name, i) => ({
        restaurant_id: restaurantId,
        name,
        sort_order: (existingCategories?.length || 0) + i
      }))
      const { data: created, error: catError } = await supabase
        .from('menu_categories')
        .insert(toInsert)
        .select('id, name')
      if (catError) {
        return NextResponse.json({ error: `Failed to create categories: ${catError.message}` }, { status: 500 })
      }
      for (const c of created || []) {
        categoryMap.set(c.name.toLowerCase().trim(), c.id)
      }
    }

    const toInsert = []
    const skipped = []
    const errors = []

    for (let i = 0; i < items.length; i++) {
      const raw = items[i]
      const name = (raw.name || '').trim()

      if (!name) {
        errors.push({ row: i + 1, reason: 'Missing name' })
        continue
      }

      const price = parseFloat(raw.price)
      if (isNaN(price) || price < 0) {
        errors.push({ row: i + 1, name, reason: 'Invalid price' })
        continue
      }

      if (existingNames.has(name.toLowerCase()) && mode === 'skip') {
        skipped.push(name)
        continue
      }

      const catName = (raw.category || '').trim()
      const category_id = catName ? (categoryMap.get(catName.toLowerCase()) || null) : null
      const department = ['kitchen', 'bar'].includes(raw.department) ? raw.department : 'kitchen'

      toInsert.push({
        restaurant_id: restaurantId,
        name,
        description: (raw.description || '').trim() || null,
        price,
        category_id,
        department,
        available: raw.available === 'false' || raw.available === false ? false : true
      })
    }

    let imported = 0
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('menu_items').insert(toInsert)
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
