export const runtime = 'edge';

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

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      restaurantId,
      menuItemId,
      quantity,
      reason,
      staffName,
      staffEmail,
      staffId,
      notes
    } = body

    if (!restaurantId || !menuItemId || !quantity || !reason || !staffName || !staffEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Call the log_stock_loss function using admin client
    const { data, error } = await supabaseAdmin.rpc('log_stock_loss', {
      p_restaurant_id: restaurantId,
      p_menu_item_id: menuItemId,
      p_quantity: parseInt(quantity),
      p_reason: reason,
      p_staff_name: staffName,
      p_staff_email: staffEmail,
      p_staff_id: staffId || null,
      p_notes: notes || null
    })

    if (error) {
      console.error('Error logging loss:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error in log-loss API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
