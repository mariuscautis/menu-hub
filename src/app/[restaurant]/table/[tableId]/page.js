'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'

export default function CustomerMenu({ params }) {
  const { restaurant: slug, tableId } = use(params)
  const [restaurant, setRestaurant] = useState(null)
  const [table, setTable] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCart, setShowCart] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [callingWaiter, setCallingWaiter] = useState(false)
  const [waiterCalled, setWaiterCalled] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState({})

  useEffect(() => {
    fetchData()
  }, [slug, tableId])

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!restaurant || !table) return

    // Subscribe to menu items changes (availability updates)
    const menuChannel = supabase
      .channel('menu-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        () => {
          // Refetch menu items when availability changes
          fetchData()
        }
      )
      .subscribe()

    // Subscribe to stock changes (to update available servings)
    const stockChannel = supabase
      .channel('stock-products-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stock_products',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        () => {
          // Refetch menu items to get updated stock levels
          fetchData()
        }
      )
      .subscribe()

    // Subscribe to waiter calls (to update button when staff acknowledges)
    const waiterCallsChannel = supabase
      .channel(`waiter-calls-customer-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'waiter_calls',
          filter: `table_id=eq.${table.id}`
        },
        (payload) => {
          console.log('Customer menu - Waiter call updated:', payload)
          // When staff acknowledges (status changes to 'completed'), the button is already showing "waiter called"
          // So we just need to keep it visible for a bit longer then allow new calls
          if (payload.new.status === 'completed') {
            // Keep showing "Waiter will be with you shortly!" for 10 seconds after acknowledgement
            setTimeout(() => {
              setWaiterCalled(false)
            }, 10000)
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(menuChannel)
      supabase.removeChannel(stockChannel)
      supabase.removeChannel(waiterCallsChannel)
    }
  }, [restaurant, table])

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

      // Get table
      const { data: tableData } = await supabase
        .from('tables')
        .select('*')
        .eq('id', tableId)
        .eq('restaurant_id', restaurantData.id)
        .single()

      if (!tableData) {
        setError('Table not found')
        setLoading(false)
        return
      }

      setTable(tableData)

      // Get menu items with stock information
      const { data: items } = await supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories(id, name),
          menu_item_ingredients(
            id,
            quantity_needed,
            stock_products(id, name, current_stock, base_unit)
          )
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

  // Check how many servings are available
  const getAvailableServings = (item) => {
    if (!item.menu_item_ingredients || item.menu_item_ingredients.length === 0) {
      return 999 // No recipe tracking, assume unlimited
    }

    let minServings = Infinity
    for (const ing of item.menu_item_ingredients) {
      const product = ing.stock_products
      if (!product) continue

      const availableServings = Math.floor(product.current_stock / ing.quantity_needed)
      minServings = Math.min(minServings, availableServings)
    }

    return minServings === Infinity ? 0 : minServings
  }

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id)
    const currentQuantity = existing ? existing.quantity : 0
    const availableServings = getAvailableServings(item)

    // Check if we can add more
    if (currentQuantity >= availableServings) {
      alert(`Sorry, only ${availableServings} servings available for ${item.name}`)
      return
    }

    if (existing) {
      setCart(cart.map(c =>
        c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ))
    } else {
      setCart([...cart, { ...item, quantity: 1 }])
    }
  }

  const removeFromCart = (itemId) => {
    const existing = cart.find(c => c.id === itemId)
    if (existing.quantity === 1) {
      setCart(cart.filter(c => c.id !== itemId))
    } else {
      setCart(cart.map(c => 
        c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
      ))
    }
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  const callWaiter = async () => {
    if (callingWaiter || waiterCalled) return

    setCallingWaiter(true)

    try {
      const { error } = await supabase
        .from('waiter_calls')
        .insert({
          restaurant_id: restaurant.id,
          table_id: table.id,
          table_number: table.table_number,
          status: 'pending'
        })

      if (error) throw error

      setWaiterCalled(true)
      // The real-time subscription will reset waiterCalled when staff acknowledges

    } catch (err) {
      console.error('Failed to call waiter:', err)
      alert('Failed to call waiter. Please try again.')
    } finally {
      setCallingWaiter(false)
    }
  }

  const placeOrder = async () => {
    if (cart.length === 0) return

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          table_id: table.id,
          total: getCartTotal(),
          customer_name: customerName || null,
          notes: orderNotes || null,
          status: 'pending'
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price_at_time: item.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      setOrderPlaced(true)
      setCart([])
      setShowCart(false)

    } catch (err) {
      alert('Failed to place order. Please try again.')
    }
  }

  // Group items by category
  const groupedItems = categories.length > 0
    ? categories.map(cat => ({
        ...cat,
        items: menuItems.filter(item => item.category_id === cat.id)
      })).filter(cat => cat.items.length > 0)
    : [{ id: null, name: 'Menu', items: menuItems }]

  // Add uncategorized items
  const uncategorized = menuItems.filter(item => !item.category_id)
  if (uncategorized.length > 0 && categories.length > 0) {
    groupedItems.push({ id: 'uncategorized', name: 'Other', items: uncategorized })
  }

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

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
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">{error}</h1>
          <p className="text-slate-500">Please scan the QR code again or ask staff for help.</p>
        </div>
      </div>
    )
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Order Placed!</h1>
          <p className="text-slate-500 mb-6">
            Your order has been sent to the kitchen. We'll bring it to Table {table.table_number} shortly.
          </p>
          <button
            onClick={() => setOrderPlaced(false)}
            className="bg-[#6262bd] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#5252a3]"
          >
            Order More
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b-2 border-slate-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{restaurant.name}</h1>
              <p className="text-slate-500 text-sm">Table {table.table_number}</p>
            </div>
            {restaurant.logo_url && (
              <img src={restaurant.logo_url} alt={restaurant.name} className="w-12 h-12 rounded-xl object-cover" />
            )}
          </div>
        </div>
      </div>

      {/* Call Waiter Button */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <button
          onClick={callWaiter}
          disabled={callingWaiter || waiterCalled}
          className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
            waiterCalled
              ? 'bg-green-100 text-green-700 border-2 border-green-200'
              : 'bg-amber-50 text-amber-700 border-2 border-amber-200 hover:bg-amber-100 active:scale-95'
          } disabled:cursor-not-allowed`}
        >
          {waiterCalled ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span>Waiter will be with you shortly!</span>
            </>
          ) : (
            <>
              <span className="text-xl">👋</span>
              <span>{callingWaiter ? 'Calling Waiter...' : 'Call Waiter'}</span>
            </>
          )}
        </button>
      </div>

      {/* Menu */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {groupedItems.map((category) => {
          const categoryId = category.id || 'menu'
          const isExpanded = expandedCategories[categoryId] ?? false

          return (
            <div key={categoryId} className="mb-6">
              {/* Category Header - Clickable */}
              <button
                onClick={() => toggleCategory(categoryId)}
                className="w-full flex items-center justify-between bg-white border-2 border-slate-100 rounded-xl px-5 py-4 mb-3 hover:bg-slate-50 transition-colors active:scale-[0.99]"
              >
                <h2 className="text-lg font-bold text-slate-800">{category.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 font-medium">
                    {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                  </span>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                  </svg>
                </div>
              </button>

              {/* Category Items - Collapsible with slide animation */}
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: isExpanded ? `${category.items.length * 200}px` : '0px',
                  opacity: isExpanded ? 1 : 0
                }}
              >
                <div className="space-y-3">
                  {category.items.map((item) => {
                    const cartItem = cart.find(c => c.id === item.id)
                    const availableServings = getAvailableServings(item)
                    const showLimitedStock = availableServings < 999 && availableServings <= 5
                    return (
                      <div key={item.id} className="bg-white border-2 border-slate-100 rounded-2xl p-4">
                        <div className="flex justify-between gap-4">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-20 h-20 rounded-xl object-cover"
                            />
                          )}
                          <div className="flex-1 pr-4">
                            <h3 className="font-semibold text-slate-800">{item.name}</h3>
                            {item.description && (
                              <p className="text-slate-500 text-sm mt-1">{item.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-[#6262bd] font-bold">£{item.price.toFixed(2)}</p>
                              {showLimitedStock && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                                  Only {availableServings} left
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            {cartItem ? (
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 13H5v-2h14v2z"/>
                                  </svg>
                                </button>
                                <span className="font-semibold text-slate-800 w-6 text-center">
                                  {cartItem.quantity}
                                </span>
                                <button
                                  onClick={() => addToCart(item)}
                                  className="w-8 h-8 rounded-full bg-[#6262bd] text-white flex items-center justify-center hover:bg-[#5252a3]"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="w-10 h-10 rounded-full bg-[#6262bd] text-white flex items-center justify-center hover:bg-[#5252a3]"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-2 border-slate-100">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-[#6262bd] text-white py-4 rounded-xl font-semibold hover:bg-[#5252a3] flex items-center justify-between px-6"
            >
              <span className="flex items-center gap-2">
                <span className="bg-white/20 px-2 py-1 rounded-lg text-sm">
                  {getCartCount()}
                </span>
                View Order
              </span>
              <span>£{getCartTotal().toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setShowCart(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Your Order</h2>
              <button
                onClick={() => setShowCart(false)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-slate-500 text-sm">£{item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 13H5v-2h14v2z"/>
                        </svg>
                      </button>
                      <span className="font-semibold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-8 h-8 rounded-full bg-[#6262bd] text-white flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                      </button>
                      <span className="font-semibold text-slate-800 w-16 text-right">
                        £{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Name (optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder="So we can call your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Special Requests (optional)
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
                    placeholder="Allergies, no onions, extra spicy..."
                  />
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 border-slate-100 pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold text-slate-800">
                  <span>Total</span>
                  <span>£{getCartTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={placeOrder}
                className="w-full bg-[#6262bd] text-white py-4 rounded-xl font-semibold hover:bg-[#5252a3]"
              >
                Place Order
              </button>

              <p className="text-center text-slate-400 text-sm mt-4">
                Payment will be collected at the table
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}