import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const department = searchParams.get('department')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    // Build query using admin client
    let query = supabaseAdmin
      .from('menu_items')
      .select('id, name, department, menu_item_ingredients(*)')
      .eq('restaurant_id', restaurantId)
      .order('name')

    // Filter by department if specified
    if (department && department !== 'all' && department !== 'universal') {
      query = query.eq('department', department)
    }

    const { data: items, error } = await query

    if (error) {
      console.error('Error fetching menu items:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: items || []
    })
  } catch (error) {
    console.error('Error in menu-items API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
