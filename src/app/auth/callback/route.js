import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      // Check if admin
      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      // Check if has restaurant
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', session.user.id)
        .maybeSingle()

      // Check if is staff member
      const { data: staffMember } = await supabase
        .from('staff')
        .select('id, status')
        .eq('user_id', session.user.id)
        .maybeSingle()

      // Check if staff is deactivated
      if (staffMember && staffMember.status === 'inactive') {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/login?error=deactivated', request.url))
      }

      const isActiveStaff = staffMember && staffMember.status === 'active'

      if (admin && !restaurant) {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else if (restaurant) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else if (isActiveStaff) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else {
        return NextResponse.redirect(new URL('/auth/onboarding', request.url))
      }
    }
  }

  return NextResponse.redirect(new URL('/auth/login', request.url))
}