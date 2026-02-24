import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create client lazily inside the handler to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function GET() {
  try {
    const supabase = getSupabaseClient()

    // Fetch branding settings
    const { data: brandingData } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'branding')
      .single()

    const branding = brandingData?.value || {}
    const platformName = branding.platform_name || 'Menu Hub'
    const themeColor = branding.theme_color || '#6262bd'
    const backgroundColor = branding.background_color || '#ffffff'

    // Build icons array - use custom icons if available, otherwise default
    const icons = []
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

    for (const size of sizes) {
      const customIcon = branding[`icon_${size}`]
      if (customIcon) {
        icons.push({
          src: customIcon,
          sizes: `${size}x${size}`,
          type: 'image/png',
          purpose: 'maskable any'
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

    const manifest = {
      name: `${platformName} - Restaurant Management`,
      short_name: platformName,
      description: 'Complete restaurant management system for orders, reservations, staff, and inventory',
      start_url: '/',
      display: 'standalone',
      background_color: backgroundColor,
      theme_color: themeColor,
      orientation: 'portrait-primary',
      icons: icons,
      categories: ['business', 'productivity'],
      screenshots: [],
      shortcuts: [
        {
          name: 'Orders',
          short_name: 'Orders',
          description: 'View and manage orders',
          url: '/dashboard/orders',
          icons: [{ src: icons.find(i => i.sizes === '192x192')?.src || '/icon-192x192.png', sizes: '192x192' }]
        },
        {
          name: 'Staff Dashboard',
          short_name: 'Staff',
          description: 'Staff view and rota',
          url: '/staff-login',
          icons: [{ src: icons.find(i => i.sizes === '192x192')?.src || '/icon-192x192.png', sizes: '192x192' }]
        },
        {
          name: 'Reservations',
          short_name: 'Reservations',
          description: 'Manage table reservations',
          url: '/dashboard/reservations',
          icons: [{ src: icons.find(i => i.sizes === '192x192')?.src || '/icon-192x192.png', sizes: '192x192' }]
        }
      ]
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    })
  } catch (error) {
    console.error('Error generating manifest:', error)

    // Return default manifest on error
    const defaultManifest = {
      name: 'Menu Hub - Restaurant Management',
      short_name: 'Menu Hub',
      description: 'Complete restaurant management system for orders, reservations, staff, and inventory',
      start_url: '/',
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
