import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Offline-caching fetch wrapper
// ---------------------------------------------------------------------------
// Wraps the global fetch so that every Supabase REST *read* response (GET
// queries and POST-based RPC calls) is transparently cached in localStorage.
// When the device is offline and a request fails, the cached response is
// returned instead. Data mutations (INSERT, UPDATE, DELETE) pass through
// normally and are never cached.
//
// This is the client-side only wrapper — the admin client (server) is not
// affected.
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'sbcache_'
// Max age for cached responses (7 days). Stale data is still better than no data.
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Build a short, deterministic cache key from a Request/URL + init.
 * Caches GET requests to Supabase REST API and read-only RPC POST calls.
 */
function cacheKeyFor(input, init) {
  const method = (init?.method || 'GET').toUpperCase()
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url
  if (!url) return null

  // Only cache Supabase REST API requests
  if (!url.includes('.supabase.co/rest/v1/')) return null

  if (method === 'GET') {
    return CACHE_PREFIX + url
  }

  // Also cache RPC calls (POST to /rest/v1/rpc/...) since they are read-only queries
  if (method === 'POST' && url.includes('/rest/v1/rpc/')) {
    const body = typeof init?.body === 'string' ? init.body : ''
    return CACHE_PREFIX + url + '::' + body
  }

  return null
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    // Check staleness
    if (Date.now() - entry.ts > MAX_CACHE_AGE_MS) {
      localStorage.removeItem(key)
      return null
    }
    return entry
  } catch {
    return null
  }
}

function writeCache(key, status, body) {
  try {
    localStorage.setItem(key, JSON.stringify({ status, body, ts: Date.now() }))
  } catch {
    // localStorage full — evict oldest entries
    evictOldestCacheEntries()
    try {
      localStorage.setItem(key, JSON.stringify({ status, body, ts: Date.now() }))
    } catch {
      // Still can't write — ignore silently
    }
  }
}

function evictOldestCacheEntries() {
  try {
    const entries = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(CACHE_PREFIX)) {
        try {
          const v = JSON.parse(localStorage.getItem(k))
          entries.push({ key: k, ts: v.ts || 0 })
        } catch {
          // Corrupt entry — remove it
          localStorage.removeItem(k)
        }
      }
    }
    // Sort oldest first and remove the oldest half
    entries.sort((a, b) => a.ts - b.ts)
    const removeCount = Math.max(Math.floor(entries.length / 2), 5)
    for (let i = 0; i < removeCount && i < entries.length; i++) {
      localStorage.removeItem(entries[i].key)
    }
  } catch {
    // Ignore
  }
}

/**
 * Create a fetch wrapper that caches Supabase REST GET responses for offline use.
 */
function createCachingFetch() {
  // Only add caching on the client side
  if (typeof window === 'undefined') return undefined

  return async (input, init) => {
    const key = cacheKeyFor(input, init)

    try {
      const response = await fetch(input, init)

      // Cache successful GET responses
      if (key && response.ok) {
        const cloned = response.clone()
        cloned.text().then((body) => {
          writeCache(key, response.status, body)
        }).catch(() => {})
      }

      return response
    } catch (err) {
      // Network error — try to serve from cache for GET requests
      if (key) {
        const cached = readCache(key)
        if (cached) {
          return new Response(cached.body, {
            status: cached.status,
            headers: { 'Content-Type': 'application/json', 'X-Offline-Cache': 'true' },
          })
        }
      }

      // No cache available — re-throw
      throw err
    }
  }
}

// Lazy initialization for build-time compatibility
let _supabase = null
let _supabaseAdmin = null

function getSupabase() {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and anon key are required')
    }
    const cachingFetch = createCachingFetch()
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      ...(cachingFetch ? { global: { fetch: cachingFetch } } : {}),
    })
  }
  return _supabase
}

function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin can only be used on the server')
  }
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL and service role key are required')
    }
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  }
  return _supabaseAdmin
}

// Export as property getters to maintain backward compatibility
export const supabase = new Proxy({}, {
  get(target, prop) {
    return getSupabase()[prop]
  }
})

export const supabaseAdmin = new Proxy({}, {
  get(target, prop) {
    return getSupabaseAdmin()[prop]
  }
})