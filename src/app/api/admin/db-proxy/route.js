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

function getSupabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Verify the caller is a platform admin using their auth token
async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.replace('Bearer ', '')
  const supabase = getSupabaseAnon()

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return false

  const supabaseAdmin = getSupabaseAdmin()
  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return !!admin
}

export async function POST(request) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { table, operation, data, match, select } = await request.json()

    if (!table || !operation) {
      return NextResponse.json({ error: 'table and operation are required' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    let query = supabaseAdmin.from(table)
    let result

    if (operation === 'insert') {
      query = query.insert(data)
      if (select) query = query.select(select)
      result = await query
    } else if (operation === 'update') {
      if (!match) return NextResponse.json({ error: 'match is required for update' }, { status: 400 })
      query = query.update(data)
      for (const [col, val] of Object.entries(match)) {
        query = query.eq(col, val)
      }
      if (select) query = query.select(select)
      result = await query
    } else if (operation === 'delete') {
      if (!match) return NextResponse.json({ error: 'match is required for delete' }, { status: 400 })
      query = query.delete()
      for (const [col, val] of Object.entries(match)) {
        query = query.eq(col, val)
      }
      result = await query
    } else if (operation === 'upsert') {
      query = query.upsert(data)
      if (select) query = query.select(select)
      result = await query
    } else {
      return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
