import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.replace('Bearer ', '')
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token)
  if (error || !user) return false
  const supabase = getSupabaseAdmin()
  const { data: admin } = await supabase.from('admins').select('id').eq('user_id', user.id).single()
  return !!admin
}

export async function DELETE(request) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { restaurantId } = await request.json()
    if (!restaurantId) return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })

    const supabase = getSupabaseAdmin()

    // Get the owner_id before deleting the restaurant row
    const { data: restaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', restaurantId)
      .single()

    if (fetchError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Delete the restaurant row
    const { error: deleteError } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', restaurantId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Delete the Supabase auth user
    if (restaurant.owner_id) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(restaurant.owner_id)
      if (authDeleteError) {
        console.error('Auth user delete failed (restaurant row already deleted):', authDeleteError.message)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('permanent-delete error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
