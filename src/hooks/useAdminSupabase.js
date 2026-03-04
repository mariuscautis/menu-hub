'use client'

import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/lib/RestaurantContext'

/**
 * Returns a Supabase-compatible client.
 * - For normal users: returns the standard supabase client unchanged.
 * - For impersonating admins: write operations (insert/update/delete/upsert)
 *   are proxied through /api/admin/db-proxy which uses the service role key,
 *   bypassing RLS. Read operations still go through the normal client.
 */
export function useAdminSupabase() {
  const ctx = useRestaurant()
  const isImpersonating = ctx?.isPlatformAdmin && typeof sessionStorage !== 'undefined'
    && !!sessionStorage.getItem('impersonation_session')

  if (!isImpersonating) {
    return supabase
  }

  // Proxy write operations through the admin API route
  return buildProxyClient()
}

function buildProxyClient() {
  // Get the current session token to send as Bearer auth
  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  async function proxyWrite(table, operation, data, match, select) {
    const token = await getToken()
    const res = await fetch('/api/admin/db-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ table, operation, data, match, select })
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: { message: json.error || 'Proxy error' } }
    return { data: json.data, error: null }
  }

  // Chainable builder that intercepts .insert/.update/.delete/.upsert
  function makeTableProxy(tableName) {
    let _operation = null
    let _data = null
    let _match = {}
    let _select = null

    const chain = {
      insert(data) {
        _operation = 'insert'
        _data = data
        return chain
      },
      update(data) {
        _operation = 'update'
        _data = data
        return chain
      },
      delete() {
        _operation = 'delete'
        return chain
      },
      upsert(data) {
        _operation = 'upsert'
        _data = data
        return chain
      },
      eq(col, val) {
        _match[col] = val
        return chain
      },
      select(cols) {
        _select = cols
        return chain
      },
      // Thenable — executes the proxied operation when awaited
      then(resolve, reject) {
        return proxyWrite(tableName, _operation, _data, _match, _select)
          .then(resolve, reject)
      },
      catch(reject) {
        return proxyWrite(tableName, _operation, _data, _match, _select)
          .catch(reject)
      }
    }

    return chain
  }

  // Return an object that looks like supabase but intercepts write-path .from() calls
  return {
    // Reads: pass through to real supabase
    auth: supabase.auth,
    channel: (...args) => supabase.channel(...args),
    removeChannel: (...args) => supabase.removeChannel(...args),
    from(table) {
      const realTable = supabase.from(table)

      // Wrap: if a write method is called first, use proxy; reads fall through
      return {
        // Reads — delegate to real client
        select: (...args) => realTable.select(...args),

        // Writes — proxy
        insert: (data) => makeTableProxy(table).insert(data),
        update: (data) => makeTableProxy(table).update(data),
        delete: () => makeTableProxy(table).delete(),
        upsert: (data) => makeTableProxy(table).upsert(data),
      }
    }
  }
}
