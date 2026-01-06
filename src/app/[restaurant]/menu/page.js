'use client'
export const runtime = 'edge'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function PublicMenu({ params }) {
  const { restaurant: slug } = use(params)
  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [slug])

  const fetchData = async () => {
    try {
      // Get restaurant by slug
      const { data: restaurantData, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'approved')
        .single()

      if (restError || !restaurantData) {
        setError('Restaurant not found')
        setLoading(false)
        return
      }

      setRestaurant(restaurantData)

      // Get menu items
      const { data: items } = await supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories(id, name)
        `)
        .eq('restaurant_id', restaurantData.id)
        .eq('available', true)
        .order('sort_order')

      // Get categories
      const { data: cats } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('sort_order')

      setMenuItems(items || [])
      setCategories(cats || [])
      setLoading(false)

    } catch (err) {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory
    const matchesSearch = searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const groupedItems = categories.reduce((acc, cat) => {
    acc[cat.id] = filteredItems.filter(item => item.category_id === cat.id)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading menu...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Oops!</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            {restaurant.logo_url && (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">{restaurant.name}</h1>
              <p className="text-slate-500 text-sm">Browse our menu</p>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
            />
          </div>

          {/* Category Filter */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#6262bd] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#6262bd] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {selectedCategory === 'all' ? (
          // Show grouped by category
          categories.map((category) => {
            const items = groupedItems[category.id]
            if (!items || items.length === 0) return null

            return (
              <div key={category.id} className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">{category.name}</h2>
                {category.description && (
                  <p className="text-slate-600 mb-4">{category.description}</p>
                )}
                <div className="space-y-4">
                  {items.map((item) => (
                    <MenuItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          // Show filtered items
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No items found</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <MenuItem key={item.id} item={item} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-medium">
            Want to order? Scan the QR code at your table to place an order.
          </p>
        </div>
      </div>
    </div>
  )
}

function MenuItem({ item }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-100 p-6 hover:border-[#6262bd] transition-all">
      <div className="flex gap-4">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800">{item.name}</h3>
              {item.description && (
                <p className="text-slate-600 text-sm mt-1 line-clamp-2">{item.description}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-bold text-[#6262bd]">
                £{item.price.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Dietary Info */}
          {(item.is_vegetarian || item.is_vegan || item.is_gluten_free || item.allergens) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {item.is_vegan && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-lg font-medium">
                  Vegan
                </span>
              )}
              {item.is_vegetarian && !item.is_vegan && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-lg font-medium">
                  Vegetarian
                </span>
              )}
              {item.is_gluten_free && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg font-medium">
                  Gluten-Free
                </span>
              )}
              {item.allergens && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-lg font-medium">
                  Contains: {item.allergens}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
