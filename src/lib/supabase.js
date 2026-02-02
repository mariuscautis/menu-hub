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

/**
 * Clear cached Supabase responses for a specific table's orders.
 * This should be called after offline payment to prevent stale orders from appearing.
 * @param {string} tableId - The table ID to clear cache for
 */
export function clearOrdersCacheForTable(tableId) {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove = []
    // Create multiple search patterns to catch all variations
    const searchPatterns = [
      tableId,
      encodeURIComponent(tableId),
      `table_id=eq.${tableId}`,
      `table_id%3Deq.${tableId}`, // URL-encoded =
      `"table_id":"${tableId}"`, // JSON body format
    ]

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        // Check if any pattern matches
        const shouldRemove = searchPatterns.some(pattern => key.includes(pattern))
        if (shouldRemove) {
          keysToRemove.push(key)
        }
        // Also clear any order-related caches for this table
        // This is more aggressive but prevents stale data
        if (key.includes('/orders') || key.includes('order_items')) {
          keysToRemove.push(key)
        }
      }
    }

    // Deduplicate and remove
    const uniqueKeys = [...new Set(keysToRemove)]
    for (const key of uniqueKeys) {
      localStorage.removeItem(key)
    }

    // Also mark this table as "paid offline" so handleNewOrder knows to skip cached data
    markTablePaidOffline(tableId)

    console.log(`[Supabase Cache] Cleared ${uniqueKeys.length} cache entries for table ${tableId}`)
  } catch {
    // Ignore errors
  }
}

/**
 * Clear ALL cached Supabase responses related to orders.
 * This is more aggressive than clearOrdersCacheForTable and should be called
 * after sync operations to ensure no stale order data remains.
 */
export function clearAllOrdersCache() {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        // Clear any cache entry that involves orders or order_items
        if (key.includes('/orders') || key.includes('order_items')) {
          keysToRemove.push(key)
        }
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key)
    }
    console.log(`[Supabase Cache] Cleared ${keysToRemove.length} order-related cache entries`)
  } catch {
    // Ignore errors
  }
}

/**
 * Clear table-specific localStorage cache (table_orders_${tableId}).
 * @param {string} tableId - The table ID to clear cache for
 */
export function clearTableOrdersLocalCache(tableId) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`table_orders_${tableId}`)
  } catch {
    // Ignore errors
  }
}

/**
 * Mark a table as having been paid offline.
 * This prevents stale cached orders from loading until the device syncs.
 */
export function markTablePaidOffline(tableId) {
  if (typeof window === 'undefined') return
  try {
    const key = 'offline_paid_tables'
    const existing = JSON.parse(localStorage.getItem(key) || '{}')
    existing[tableId] = Date.now()
    localStorage.setItem(key, JSON.stringify(existing))
  } catch {
    // Ignore
  }
}

/**
 * Check if a table was paid offline (and hasn't synced yet).
 */
export function wasTablePaidOffline(tableId) {
  if (typeof window === 'undefined') return false
  try {
    const key = 'offline_paid_tables'
    const existing = JSON.parse(localStorage.getItem(key) || '{}')
    return !!existing[tableId]
  } catch {
    return false
  }
}

/**
 * Clear the offline paid status for a table (call after sync or when back online).
 */
export function clearTablePaidOfflineStatus(tableId) {
  if (typeof window === 'undefined') return
  try {
    const key = 'offline_paid_tables'
    const existing = JSON.parse(localStorage.getItem(key) || '{}')
    delete existing[tableId]
    localStorage.setItem(key, JSON.stringify(existing))
  } catch {
    // Ignore
  }
}

/**
 * Clear all offline paid table statuses (call when coming back online after sync).
 */
export function clearAllOfflinePaidTables() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('offline_paid_tables')
  } catch {
    // Ignore
  }
}

/**
 * Mark a table as cleaned offline.
 * This prevents the payment sync from resetting the table to 'needs_cleaning'.
 */
export function markTableCleanedOffline(tableId) {
  if (typeof window === 'undefined') return
  try {
    const key = 'offline_cleaned_tables'
    const existing = JSON.parse(localStorage.getItem(key) || '{}')
    existing[tableId] = Date.now()
    localStorage.setItem(key, JSON.stringify(existing))
  } catch {
    // Ignore
  }
}

/**
 * Check if a table was cleaned offline.
 */
export function wasTableCleanedOffline(tableId) {
  if (typeof window === 'undefined') return false
  try {
    const key = 'offline_cleaned_tables'
    const existing = JSON.parse(localStorage.getItem(key) || '{}')
    return !!existing[tableId]
  } catch {
    return false
  }
}

/**
 * Clear the offline cleaned status for a table (call after sync).
 */
export function clearTableCleanedOfflineStatus(tableId) {
  if (typeof window === 'undefined') return
  try {
    const key = 'offline_cleaned_tables'
    const existing = JSON.parse(localStorage.getItem(key) || '{}')
    delete existing[tableId]
    localStorage.setItem(key, JSON.stringify(existing))
  } catch {
    // Ignore
  }
}

/**
 * Clear all offline cleaned table statuses.
 */
export function clearAllOfflineCleanedTables() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('offline_cleaned_tables')
  } catch {
    // Ignore
  }
}

export const supabaseAdmin = new Proxy({}, {
  get(target, prop) {
    return getSupabaseAdmin()[prop]
  }
})