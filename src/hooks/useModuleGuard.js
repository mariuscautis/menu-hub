'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRestaurant } from '@/lib/RestaurantContext'

/**
 * Redirects to /dashboard if the given module is disabled for this restaurant.
 * Defaults to enabled when the key is absent (backwards-compat).
 *
 * Usage: call at the top of any page component, before any other logic.
 *   useModuleGuard('reservations')
 */
export function useModuleGuard(moduleName) {
  const router = useRouter()
  const ctx = useRestaurant()

  useEffect(() => {
    if (!ctx) return // context not ready yet
    const modules = ctx.enabledModules || {}
    if (modules[moduleName] === false) {
      router.replace('/dashboard')
    }
  }, [ctx, moduleName, router])
}
