'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

let cache = null

export function useSeoSettings(pageKey, defaults) {
  const [seo, setSeo] = useState({ ...defaults, ogImage: null })

  useEffect(() => {
    const load = async () => {
      if (!cache) {
        const { data } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'seo')
          .single()
        cache = data?.value || {}
      }
      const overrides = cache[pageKey]
      if (overrides) {
        setSeo({
          title: overrides.title || defaults.title,
          description: overrides.description || defaults.description,
          ogImage: overrides.ogImage || null,
        })
      }
    }
    load()
  }, [pageKey])

  return seo
}
