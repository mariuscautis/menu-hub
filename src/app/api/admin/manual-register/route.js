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
  const supabaseAdmin = getSupabaseAdmin()
  const { data: admin } = await supabaseAdmin.from('admins').select('id').eq('user_id', user.id).single()
  return !!admin
}

function generateSlug(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

export async function POST(request) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { restaurantName, email, phone, venueType, venueTypeOther, trialDays = 14 } = await request.json()

    if (!restaurantName || !email) {
      return NextResponse.json({ error: 'Restaurant name and email are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Create Supabase auth user with a temporary password (they'll use magic link / reset)
    const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A1!'
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message?.includes('already')) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const userId = authData.user.id
    const slug = generateSlug(restaurantName)
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase.from('restaurants').insert({
      name: restaurantName,
      slug,
      owner_id: userId,
      email,
      phone: phone || null,
      venue_type: venueType || null,
      venue_type_other: venueType === 'other' ? venueTypeOther : null,
      status: 'approved',
      trial_ends_at: trialEndsAt,
      enabled_modules: { ordering: true, analytics: true, reservations: true, rota: true, reports: true, cash_drawer: true },
    })

    if (dbError) {
      // Clean up auth user if restaurant insert fails
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Send password reset email so they can set their own password
    await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password` }
    })

    return NextResponse.json({ success: true, slug, email })
  } catch (err) {
    console.error('manual-register error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
