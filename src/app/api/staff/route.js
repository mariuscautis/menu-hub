export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create admin client with service role key
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { restaurantId, email, name, role, pin_code, department, annual_holiday_days, holiday_year_start, is_hub } = await request.json()

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
    const { data: staffData, error: staffError} = await supabaseAdmin
      .from('staff')
      .insert({
        restaurant_id: restaurantId,
        email,
        name,
        role: role || 'staff',
        status: 'active',
        department: department || 'kitchen',
        pin_code: pin_code,
        is_hub: is_hub || false
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

    // Create leave entitlement if holiday days are provided
    if (annual_holiday_days && holiday_year_start) {
      const { error: entitlementError } = await supabaseAdmin
        .from('staff_leave_entitlements')
        .insert({
          restaurant_id: restaurantId,
          staff_id: staffData.id,
          annual_holiday_days: parseFloat(annual_holiday_days),
          holiday_year_start: holiday_year_start
        })

      if (entitlementError) {
        console.error('Leave entitlement creation error:', entitlementError)
        // Don't fail the whole operation, just log the error
        // The staff member was created successfully
      }
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

export async function PUT(request) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { staffId, restaurantId, name, email, role, department, is_hub, annual_holiday_days, holiday_year_start } = await request.json()

    if (!staffId || !restaurantId) {
      return NextResponse.json({ error: 'staffId and restaurantId are required' }, { status: 400 })
    }

    // Update staff record
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .update({ name, email, role, department, is_hub })
      .eq('id', staffId)
      .eq('restaurant_id', restaurantId)

    if (staffError) {
      console.error('Staff update error:', staffError)
      return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
    }

    // Upsert leave entitlement (only for non-hub staff)
    if (!is_hub && annual_holiday_days !== undefined && holiday_year_start) {
      const { data: existing } = await supabaseAdmin
        .from('staff_leave_entitlements')
        .select('id')
        .eq('staff_id', staffId)
        .maybeSingle()

      if (existing) {
        const { error: updateErr } = await supabaseAdmin
          .from('staff_leave_entitlements')
          .update({
            annual_holiday_days: parseFloat(annual_holiday_days),
            holiday_year_start
          })
          .eq('staff_id', staffId)
        if (updateErr) console.error('Entitlement update error:', updateErr)
      } else {
        const { error: insertErr } = await supabaseAdmin
          .from('staff_leave_entitlements')
          .insert({
            restaurant_id: restaurantId,
            staff_id: staffId,
            annual_holiday_days: parseFloat(annual_holiday_days),
            holiday_year_start
          })
        if (insertErr) console.error('Entitlement insert error:', insertErr)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Unexpected error in PUT /api/staff:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
