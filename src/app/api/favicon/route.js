import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

async function fetchImageAsResponse(url) {
  const res = await fetch(url)
  if (!res.ok) return null
  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'image/png'
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
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
      const response = await fetchImageAsResponse(faviconUrl)
      if (response) return response
    }

    // Fall back to the default app icon
    const defaultIconUrl = new URL('/icon-192x192.png', request.url)
    const response = await fetchImageAsResponse(defaultIconUrl.toString())
    if (response) return response

    return new NextResponse(null, { status: 404 })
  } catch (error) {
    console.error('Error fetching favicon:', error)
    try {
      const defaultIconUrl = new URL('/icon-192x192.png', request.url)
      const response = await fetchImageAsResponse(defaultIconUrl.toString())
      if (response) return response
    } catch {}
    return new NextResponse(null, { status: 404 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'edge'
