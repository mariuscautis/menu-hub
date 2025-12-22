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

export async function PUT(request) {
  try {
    const { staffId, userId, newPassword } = await request.json()

    // Validate required fields
    if (!staffId || !userId || !newPassword) {
      return NextResponse.json(
        { error: 'Staff ID, user ID, and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Verify the staff member exists
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff')
      .select('id, user_id')
      .eq('id', staffId)
      .single()

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Update the user's password in Supabase Auth
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
