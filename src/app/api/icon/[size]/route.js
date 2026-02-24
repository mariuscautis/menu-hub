import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create client lazily inside the handler to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function GET(request, { params }) {
  const { size } = await params
  const validSizes = ['72', '96', '128', '144', '152', '192', '384', '512']

  if (!validSizes.includes(size)) {
    return new NextResponse('Invalid size', { status: 400 })
  }

  try {
    const supabase = getSupabaseClient()

    // Fetch branding settings
    const { data: brandingData } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'branding')
      .single()

    const customIcon = brandingData?.value?.[`icon_${size}`]

    if (customIcon) {
      // Redirect to the custom icon URL
      return NextResponse.redirect(customIcon)
    }

    // Redirect to default icon
    const defaultIconUrl = new URL(`/icon-${size}x${size}.png`, request.url)
    return NextResponse.redirect(defaultIconUrl)
  } catch (error) {
    console.error('Error fetching icon:', error)
    // Fall back to default icon
    const defaultIconUrl = new URL(`/icon-${size}x${size}.png`, request.url)
    return NextResponse.redirect(defaultIconUrl)
  }
}

// Force dynamic rendering to avoid build-time data fetching
export const dynamic = 'force-dynamic'
