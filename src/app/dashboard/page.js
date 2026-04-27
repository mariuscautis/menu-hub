'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/lib/RestaurantContext'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingOrders: 0,
    menuItems: 0,
    tables: 0
  })
  const [restaurant, setRestaurant] = useState(null)
  const [userType, setUserType] = useState(null)
  const restaurantCtx = useRestaurant()
  const orderingEnabled = restaurantCtx?.enabledModules?.ordering !== false

  useEffect(() => {
    if (!restaurantCtx?.restaurant) return
    const fetchData = async () => {
      const restaurantData = restaurantCtx.restaurant
      setRestaurant(restaurantData)
      setUserType(restaurantCtx.userType)

      const today = new Date().toISOString().split('T')[0]
      const { count: todayOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantData.id)
        .gte('created_at', today)

      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantData.id)
        .in('status', ['pending', 'preparing'])

      const { count: menuItems } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantData.id)

      const { count: tables } = await supabase
        .from('tables')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantData.id)

      setStats({
        todayOrders: todayOrders || 0,
        pendingOrders: pendingOrders || 0,
        menuItems: menuItems || 0,
        tables: tables || 0
      })
    }
    fetchData()
  }, [restaurantCtx])

  const canSeeAdminStats = userType === 'owner' || userType === 'staff-admin'

  const statCards = [
    {
      label: "Today's Orders",
      value: stats.todayOrders,
      accent: '#6262bd',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
        </svg>
      )
    },
    {
      label: 'Pending Orders',
      value: stats.pendingOrders,
      accent: '#f59e0b',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      )
    },
    {
      label: 'Menu Items',
      value: stats.menuItems,
      accent: '#10b981',
      adminOnly: true,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      )
    },
    {
      label: 'Tables',
      value: stats.tables,
      accent: '#64748b',
      adminOnly: true,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6 0H5v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4zm6 0H5v4h4v-4zm2-8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V5zm6 0h-4v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4zm6 0h-4v4h4v-4z"/>
        </svg>
      )
    },
  ]

  const quickActions = [
    { href: '/dashboard/orders', label: 'View orders', always: true },
    { href: '/dashboard/menu', label: 'Manage menu', adminOnly: true },
    { href: '/dashboard/tables', label: 'Generate QR codes', adminOnly: true },
  ]

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-1">Overview</p>
        <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back.</h1>
        {restaurant?.name && (
          <p className="text-sm text-zinc-500 mt-0.5">{restaurant.name}</p>
        )}
      </div>

      {/* Pending approval notice */}
      {userType === 'owner' && restaurant?.status === 'pending' && (
        <div className="mb-6 p-4 border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <p className="text-amber-400 text-sm">Your restaurant is pending approval. Some features may be limited.</p>
        </div>
      )}

      {orderingEnabled ? (
        <>
          {/* Stats grid */}
          <div className={`grid gap-px bg-zinc-800 mb-8 ${canSeeAdminStats ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {statCards
              .filter(stat => !stat.adminOnly || canSeeAdminStats)
              .map((stat) => (
                <div key={stat.label} className="bg-zinc-950 px-6 py-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-600">{stat.label}</p>
                    <span style={{ color: stat.accent }}>{stat.icon}</span>
                  </div>
                  <p className="text-4xl font-bold tracking-tight" style={{ color: stat.accent }}>{stat.value}</p>
                </div>
              ))}
          </div>

          {/* Quick actions */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">Quick actions</p>
            <div className="grid gap-px bg-zinc-800">
              {quickActions
                .filter(a => a.always || (a.adminOnly && canSeeAdminStats))
                .map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="bg-zinc-950 flex items-center justify-between px-6 py-4 hover:bg-zinc-900 transition-colors group"
                  >
                    <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">{action.label}</span>
                    <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/>
                    </svg>
                  </Link>
                ))}
            </div>
          </div>
        </>
      ) : (
        <div className="border border-zinc-800 bg-zinc-900 p-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-zinc-800 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-zinc-200 mb-2">Your account is active</h2>
          <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
            Your current plan does not include the Ordering & Menu module. Contact your administrator to enable ordering, tables, menu management, and more.
          </p>
        </div>
      )}
    </div>
  )
}
