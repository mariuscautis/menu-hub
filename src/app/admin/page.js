'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    pendingApproval: 0,
    approvedRestaurants: 0,
    totalOrders: 0
  })

  useEffect(() => {
    const fetchStats = async () => {
      const { count: total } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true })

      const { count: pending } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      const { count: approved } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')

      const { count: orders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      setStats({
        totalRestaurants: total || 0,
        pendingApproval: pending || 0,
        approvedRestaurants: approved || 0,
        totalOrders: orders || 0
      })
    }

    fetchStats()
  }, [])

  const statCards = [
    { label: 'Total Restaurants', value: stats.totalRestaurants, color: 'text-slate-700' },
    { label: 'Pending Approval', value: stats.pendingApproval, color: 'text-amber-600' },
    { label: 'Approved', value: stats.approvedRestaurants, color: 'text-green-600' },
    { label: 'Total Orders', value: stats.totalOrders, color: 'text-[#6262bd]' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-500">Overview of Menu Hub platform</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white border-2 border-slate-100 rounded-2xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}