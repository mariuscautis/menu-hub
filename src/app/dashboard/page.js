'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingOrders: 0,
    menuItems: 0,
    tables: 0
  })
  const [restaurant, setRestaurant] = useState(null)
  const [userType, setUserType] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let restaurantData = null

      // Check if owner
      const { data: ownedRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (ownedRestaurant) {
        restaurantData = ownedRestaurant
        setUserType('owner')
      } else {
        // Check if staff by user_id (preferred) or email (fallback)
        const { data: staffRecords } = await supabase
          .from('staff')
          .select('*, restaurants(*)')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .eq('status', 'active')

        const staffRecord = staffRecords && staffRecords.length > 0 ? staffRecords[0] : null

        if (staffRecord && staffRecord.restaurants) {
          // Update user_id if missing
          if (!staffRecord.user_id) {
            await supabase
              .from('staff')
              .update({ user_id: user.id })
              .eq('id', staffRecord.id)
          }

          restaurantData = staffRecord.restaurants
          setUserType(staffRecord.role === 'admin' ? 'staff-admin' : 'staff')
        }
      }

      if (!restaurantData) return
      setRestaurant(restaurantData)

      // Get today's orders
      const today = new Date().toISOString().split('T')[0]
      const { count: todayOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantData.id)
        .gte('created_at', today)

      // Get pending orders
      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantData.id)
        .in('status', ['pending', 'preparing'])

      // Get menu items count
      const { count: menuItems } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantData.id)

      // Get tables count
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
  }, [])

  const canSeeAdminStats = userType === 'owner' || userType === 'staff-admin'

  const statCards = [
    { label: "Today's Orders", value: stats.todayOrders, color: 'text-[#6262bd]' },
    { label: 'Pending Orders', value: stats.pendingOrders, color: 'text-amber-600' },
    { label: 'Menu Items', value: stats.menuItems, color: 'text-slate-600', adminOnly: true },
    { label: 'Tables', value: stats.tables, color: 'text-slate-600', adminOnly: true },
  ]

  return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Welcome back!</h1>
          <p className="text-slate-500">{restaurant?.name} Dashboard</p>
        </div>

      {/* Only show pending message for restaurant owners with pending restaurant status */}
      {userType === 'owner' && restaurant?.status === 'pending' && (
        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
          <p className="text-amber-700 font-medium">Your restaurant is pending approval. Some features may be limited.</p>
        </div>
      )}

      <div className={`grid sm:grid-cols-2 ${canSeeAdminStats ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-6 mb-8`}>
        {statCards
          .filter(stat => !stat.adminOnly || canSeeAdminStats)
          .map((stat) => (
            <div key={stat.label} className="bg-white border-2 border-slate-100 rounded-2xl p-6">
              <p className="text-slate-500 text-sm font-medium mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
      </div>

      <div className={`grid ${canSeeAdminStats ? 'lg:grid-cols-2' : ''} gap-6`}>
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-700 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/dashboard/orders" className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <span className="font-medium text-slate-700">View orders</span>
              <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/>
              </svg>
            </a>
            {canSeeAdminStats && (
              <>
                <a href="/dashboard/menu" className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <span className="font-medium text-slate-700">Manage menu</span>
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/>
                  </svg>
                </a>
                <a href="/dashboard/tables" className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <span className="font-medium text-slate-700">Generate QR codes</span>
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/>
                  </svg>
                </a>
              </>
            )}
          </div>
        </div>

        {canSeeAdminStats && (
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-700 mb-4">Your Menu Link</h2>
            {restaurant && (
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500 mb-2">Share this link with customers:</p>
                <code className="text-[#6262bd] font-medium break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/{restaurant.slug}
                </code>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
  )
}