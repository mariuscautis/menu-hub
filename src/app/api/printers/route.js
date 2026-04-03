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

// GET /api/printers?restaurant_id=xxx
export async function GET(request) {
  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  if (!restaurantId) return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('printers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/printers — create a printer
export async function POST(request) {
  const supabase = getSupabaseAdmin()
  const body = await request.json()
  const { restaurant_id, name, department } = body

  if (!restaurant_id || !name || !department) {
    return NextResponse.json({ error: 'restaurant_id, name and department are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('printers')
    .insert({ restaurant_id, name, department, is_active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT /api/printers — update a printer
export async function PUT(request) {
  const supabase = getSupabaseAdmin()
  const body = await request.json()
  const { id, name, department, is_active } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates = {}
  if (name !== undefined) updates.name = name
  if (department !== undefined) updates.department = department
  if (is_active !== undefined) updates.is_active = is_active
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('printers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/printers?id=xxx
export async function DELETE(request) {
  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('printers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
