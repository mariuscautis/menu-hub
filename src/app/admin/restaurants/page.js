'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false })

    setRestaurants(data || [])
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    await supabase
      .from('restaurants')
      .update({ status })
      .eq('id', id)

    fetchRestaurants()
  }

  const deleteRestaurant = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove all their data including menu items, tables, and orders.`)) {
      return
    }

    await supabase.from('restaurants').delete().eq('id', id)
    fetchRestaurants()
  }

  const filteredRestaurants = restaurants.filter(r => {
    if (filter === 'all') return true
    return r.status === filter
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-700'
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return <div className="text-slate-500">Loading restaurants...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Restaurants</h1>
          <p className="text-slate-500">Manage all restaurant accounts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-medium capitalize ${
              filter === f
                ? 'bg-[#6262bd] text-white'
                : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {f}
            {f === 'pending' && restaurants.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                {restaurants.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Restaurants List */}
      {filteredRestaurants.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <p className="text-slate-500">No {filter === 'all' ? '' : filter} restaurants found</p>
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Restaurant</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Registered</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRestaurants.map((restaurant) => (
                <tr key={restaurant.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{restaurant.name}</p>
                    <p className="text-sm text-slate-400">{restaurant.slug}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-700">{restaurant.email}</p>
                    {restaurant.phone && (
                      <p className="text-sm text-slate-400">{restaurant.phone}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(restaurant.status)}`}>
                      {restaurant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(restaurant.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {restaurant.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(restaurant.id, 'approved')}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(restaurant.id, 'rejected')}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {restaurant.status === 'approved' && (
                        <button
                          onClick={() => updateStatus(restaurant.id, 'rejected')}
                          className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200"
                        >
                          Suspend
                        </button>
                      )}
                      {restaurant.status === 'rejected' && (
                        <button
                          onClick={() => updateStatus(restaurant.id, 'approved')}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                        >
                          Reactivate
                        </button>
                      )}
                      <button
                        onClick={() => deleteRestaurant(restaurant.id, restaurant.name)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}