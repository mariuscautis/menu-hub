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
  const { slug } = await params

  try {
    const supabase = getSupabaseClient()

    // Fetch restaurant info
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name, logo_url, slug')
      .eq('slug', slug)
      .single()

    // Fetch branding settings
    const { data: brandingData } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'branding')
      .single()

    const branding = brandingData?.value || {}
    const platformName = branding.platform_name || 'Veno App'
    const themeColor = branding.theme_color || '#6262bd'
    const backgroundColor = branding.background_color || '#ffffff'

    // Use restaurant name if available, otherwise platform name
    const appName = restaurant?.name || platformName

    // Build icons array - prioritize restaurant logo, then platform icons, then defaults
    const icons = []
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

    // Use restaurant logo as the app icon if available
    const restaurantLogo = restaurant?.logo_url
    const platformLogo = branding.logo_url

    for (const size of sizes) {
      if (restaurantLogo) {
        // Use restaurant logo for all sizes (browser will scale)
        icons.push({
          src: restaurantLogo,
          sizes: `${size}x${size}`,
          type: 'image/png',
          purpose: 'any'
        })
      } else if (platformLogo) {
        // Fall back to platform logo
        icons.push({
          src: platformLogo,
          sizes: `${size}x${size}`,
          type: 'image/png',
          purpose: 'any'
        })
      } else {
        // Fall back to default icons
        icons.push({
          src: `/icon-${size}x${size}.png`,
          sizes: `${size}x${size}`,
          type: 'image/png',
          purpose: 'maskable any'
        })
      }
    }

    // Restaurant-specific manifest with start_url pointing to staff login
    const manifest = {
      name: `${appName} - Staff App`,
      short_name: appName,
      description: `Staff app for ${appName}`,
      start_url: `/r/${slug}/auth/staff-login`,
      scope: `/r/${slug}/`,
      display: 'standalone',
      background_color: backgroundColor,
      theme_color: themeColor,
      orientation: 'portrait-primary',
      icons: icons,
      categories: ['business', 'productivity'],
      screenshots: [],
      shortcuts: [
        {
          name: 'Staff Login',
          short_name: 'Login',
          description: 'Go to staff login',
          url: `/r/${slug}/auth/staff-login`,
          icons: [{ src: icons.find(i => i.sizes === '192x192')?.src || '/icon-192x192.png', sizes: '192x192' }]
        },
        {
          name: 'Staff Dashboard',
          short_name: 'Dashboard',
          description: 'View staff dashboard',
          url: `/r/${slug}/staff`,
          icons: [{ src: icons.find(i => i.sizes === '192x192')?.src || '/icon-192x192.png', sizes: '192x192' }]
        }
      ]
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('Error generating manifest:', error)

    // Return default manifest on error
    const defaultManifest = {
      name: 'Staff App',
      short_name: 'Staff',
      description: 'Staff app for restaurant management',
      start_url: `/r/${slug}/auth/staff-login`,
      scope: `/r/${slug}/`,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#6262bd',
      orientation: 'portrait-primary',
      icons: [
        { src: '/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'maskable any' },
        { src: '/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'maskable any' },
        { src: '/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'maskable any' },
        { src: '/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'maskable any' },
        { src: '/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'maskable any' },
        { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
        { src: '/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'maskable any' },
        { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
      ],
      categories: ['business', 'productivity'],
      shortcuts: []
    }

    return NextResponse.json(defaultManifest, {
      headers: {
        'Content-Type': 'application/manifest+json'
      }
    })
  }
}

// Force dynamic rendering to avoid build-time data fetching
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
