import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function GET(request) {
  try {
    const supabase = getSupabaseClient()

    const { data: brandingData } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'branding')
      .single()

    const faviconUrl = brandingData?.value?.favicon_url

    if (faviconUrl) {
      return NextResponse.redirect(faviconUrl)
    }

    // Fall back to the default app icon
    const defaultIconUrl = new URL('/icon-192x192.png', request.url)
    return NextResponse.redirect(defaultIconUrl)
  } catch (error) {
    console.error('Error fetching favicon:', error)
    const defaultIconUrl = new URL('/icon-192x192.png', request.url)
    return NextResponse.redirect(defaultIconUrl)
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'edge'
