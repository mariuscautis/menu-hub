import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create admin client with service role key
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
    const { restaurantId, email, name, role, pin_code, department } = await request.json()

    // Validate required fields
    if (!email || !pin_code || !restaurantId) {
      return NextResponse.json(
        { error: 'Email, PIN code, and restaurant ID are required' },
        { status: 400 }
      )
    }

    if (pin_code.length !== 3 || !/^\d{3}$/.test(pin_code)) {
      return NextResponse.json(
        { error: 'PIN code must be exactly 3 digits' },
        { status: 400 }
      )
    }

    // Check if email already exists in staff table for this restaurant
    const { data: existingStaff } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('email', email)
      .maybeSingle()

    if (existingStaff) {
      return NextResponse.json(
        { error: 'This email is already added as staff for this restaurant' },
        { status: 400 }
      )
    }

    // Check if PIN code already exists for this restaurant
    const { data: existingPin } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('pin_code', pin_code)
      .maybeSingle()

    if (existingPin) {
      return NextResponse.json(
        { error: 'This PIN code is already in use. Please generate a different one.' },
        { status: 400 }
      )
    }

    // Add staff member to staff table (no auth account needed)
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        restaurant_id: restaurantId,
        email,
        name,
        role: role || 'staff',
        status: 'active',
        department: department || 'kitchen',
        pin_code: pin_code
      })
      .select()
      .single()

    if (staffError) {
      console.error('Staff insert error:', staffError)
      return NextResponse.json(
        { error: 'Failed to add staff member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff: staffData
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
