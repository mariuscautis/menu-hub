export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/bridge
// Body: { code: "XXXX-XXXX" }
// Called by VenoApp Bridge on first setup to resolve restaurant_id from bridge code
export async function POST(request) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Bridge code required' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('get_restaurant_by_bridge_code', {
      p_code: code.trim()
    })

    if (error) {
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }

    if (data?.error) {
      return NextResponse.json({ error: 'Invalid bridge code' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
