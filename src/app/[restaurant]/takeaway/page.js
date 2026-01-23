'use client'
export const runtime = 'edge'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'

// Generate a unique 6-character pickup code (ABC123 format)
function generatePickupCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // Exclude I, O to avoid confusion
  const numbers = '0123456789'
  let code = ''
  for (let i = 0; i < 3; i++) code += letters[Math.floor(Math.random() * letters.length)]
  for (let i = 0; i < 3; i++) code += numbers[Math.floor(Math.random() * numbers.length)]
  return code
}

export default function TakeawayMenu({ params }) {
  const { restaurant: slug } = use(params)
  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCart, setShowCart] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [pickupCode, setPickupCode] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [expandedCategories, setExpandedCategories] = useState({})
  const [placingOrder, setPlacingOrder] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [translations, setTranslations] = useState(null)

  useEffect(() => {
    fetchData()
  }, [slug])

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!restaurant) return

    // Subscribe to menu items changes (availability updates)
    const menuChannel = supabase
      .channel('takeaway-menu-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        () => {
          fetchData()
        }
      )
      .subscribe()

    // Subscribe to stock changes
    const stockChannel = supabase
      .channel('takeaway-stock-products-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stock_products',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(menuChannel)
      supabase.removeChannel(stockChannel)
    }
  }, [restaurant])

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

      // Load translations based on restaurant's email language
      const locale = restaurantData.email_language || 'en'
      try {
        const translationModule = await import(`@/messages/${locale}.json`)
        setTranslations(translationModule.default.takeaway)
      } catch (error) {
        // Fallback to English if translation fails
        const translationModule = await import('@/messages/en.json')
        setTranslations(translationModule.default.takeaway)
      }

      // Get menu items that are available AND marked for takeaway
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
        .eq('takeaway_available', true)
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

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const placeOrder = async () => {
    if (cart.length === 0) return

    // Validate required fields
    if (!customerName.trim()) {
      alert('Please enter your name')
      return
    }

    if (!customerEmail.trim()) {
      setEmailError('Email is required')
      return
    }

    if (!validateEmail(customerEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setEmailError('')
    setPlacingOrder(true)

    try {
      // Generate unique pickup code
      const code = generatePickupCode()

      // Use restaurant's email language preference (fallback to 'en')
      const supportedLocales = ['en', 'ro', 'fr', 'it', 'es']
      const restaurantLocale = restaurant.email_language
      const locale = restaurantLocale && supportedLocales.includes(restaurantLocale) ? restaurantLocale : 'en'

      // Create takeaway order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          table_id: null, // No table for takeaway
          total: getCartTotal(),
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim().toLowerCase(),
          customer_phone: customerPhone.trim() || null,
          notes: orderNotes.trim() || null,
          status: 'pending',
          order_type: 'takeaway',
          pickup_code: code,
          locale: locale
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

      // Send confirmation email via API
      try {
        const emailResponse = await fetch('/api/takeaway/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            restaurantId: restaurant.id,
            locale: locale
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json()
          console.error('Email API error:', errorData)
        } else {
          console.log('Confirmation email sent successfully')
        }
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr)
        // Don't fail the order if email fails
      }

      setPickupCode(code)
      setOrderPlaced(true)
      setCart([])
      setShowCart(false)

    } catch (err) {
      console.error('Failed to place order:', err)
      alert('Failed to place order. Please try again.')
    } finally {
      setPlacingOrder(false)
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

  // Helper function to get translation text
  const t = (key, replacements = {}) => {
    if (!translations) return ''
    let text = translations[key] || key
    Object.entries(replacements).forEach(([key, value]) => {
      text = text.replace(`{${key}}`, value)
    })
    return text
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">{translations ? t('loadingMenu') : 'Loading takeaway menu...'}</div>
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
          <h1 className="text-xl font-bold text-slate-800 mb-2">{translations ? t('errorTitle') : error}</h1>
          <p className="text-slate-500">{translations ? t('errorDescription') : 'Please check the URL or contact the restaurant.'}</p>
        </div>
      </div>
    )
  }

  if (menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 9h-4.79l-4.38-6.56c-.19-.28-.51-.42-.83-.42s-.64.14-.83.43L6.79 9H2c-.55 0-1 .45-1 1 0 .09.01.18.04.27l2.54 9.27c.23.84 1 1.46 1.92 1.46h13c.92 0 1.69-.62 1.93-1.46l2.54-9.27L23 10c0-.55-.45-1-1-1zM12 4.8L14.8 9H9.2L12 4.8zM18.5 19l-12.99.01L3.31 11H20.7l-2.2 8z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">{translations ? t('noItemsTitle') : 'No Takeaway Items Available'}</h1>
          <p className="text-slate-500">{translations ? t('noItemsDescription') : 'This restaurant hasn\'t set up their takeaway menu yet.'}</p>
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
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{t('orderPlacedTitle')}</h1>
          <p className="text-slate-500 mb-6">
            {t('orderPlacedDescription')}
          </p>

          {/* Pickup Code Display */}
          <div className="bg-white border-2 border-cyan-200 rounded-2xl p-6 mb-6">
            <p className="text-sm text-slate-500 mb-2">{t('pickupCodeTitle')}</p>
            <p className="text-4xl font-bold text-cyan-600 tracking-widest mb-2">{pickupCode}</p>
            <p className="text-sm text-slate-500">{t('pickupCodeDescription')}</p>
          </div>

          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-700">
              <strong>{t('emailSentTitle')}</strong> {t('emailSentDescription', { email: customerEmail })}
            </p>
          </div>

          <button
            onClick={() => {
              setOrderPlaced(false)
              setPickupCode('')
              setCustomerName('')
              setCustomerEmail('')
              setCustomerPhone('')
              setOrderNotes('')
            }}
            className="bg-[#6262bd] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#5252a3]"
          >
            {t('placeAnotherOrder')}
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
              <p className="text-cyan-600 text-sm font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 9h-4.79l-4.38-6.56c-.19-.28-.51-.42-.83-.42s-.64.14-.83.43L6.79 9H2c-.55 0-1 .45-1 1 0 .09.01.18.04.27l2.54 9.27c.23.84 1 1.46 1.92 1.46h13c.92 0 1.69-.62 1.93-1.46l2.54-9.27L23 10c0-.55-.45-1-1-1zM12 4.8L14.8 9H9.2L12 4.8zM18.5 19l-12.99.01L3.31 11H20.7l-2.2 8z"/>
                </svg>
                {t('takeawayMenu')}
              </p>
            </div>
            {restaurant.logo_url && (
              <img src={restaurant.logo_url} alt={restaurant.name} className="w-12 h-12 rounded-xl object-cover" />
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="bg-cyan-50 border-2 border-cyan-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <div className="text-sm text-cyan-700">
            <p className="font-medium mb-1">{t('howItWorksTitle')}</p>
            <p>{t('howItWorksDescription')}</p>
          </div>
        </div>
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
                    {category.items.length} {category.items.length === 1 ? t('itemCount_one') : t('itemCount_other')}
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

              {/* Category Items - Collapsible */}
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
                                  {t('onlyLeft', { count: availableServings })}
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
              className="w-full bg-cyan-600 text-white py-4 rounded-xl font-semibold hover:bg-cyan-700 flex items-center justify-between px-6"
            >
              <span className="flex items-center gap-2">
                <span className="bg-white/20 px-2 py-1 rounded-lg text-sm">
                  {getCartCount()}
                </span>
                {t('viewOrder')}
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
            className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{t('yourOrder')}</h2>
                <p className="text-sm text-cyan-600">{t('payWithCash')}</p>
              </div>
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
                      <p className="text-slate-500 text-sm">£{item.price.toFixed(2)} {t('each')}</p>
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
                    {t('yourName')} <span className="text-red-500">{t('required')}</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder={t('namePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('emailAddress')} <span className="text-red-500">{t('required')}</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value)
                      setEmailError('')
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-slate-700 ${
                      emailError ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-[#6262bd]'
                    }`}
                    placeholder={t('emailPlaceholder')}
                    required
                  />
                  {emailError && (
                    <p className="text-red-500 text-sm mt-1">{emailError}</p>
                  )}
                  <p className="text-slate-400 text-xs mt-1">{t('emailHelper')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('phoneNumber')}
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder={t('phonePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('specialRequests')}
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
                    placeholder={t('requestsPlaceholder')}
                  />
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 border-slate-100 pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold text-slate-800">
                  <span>{t('total')}</span>
                  <span>£{getCartTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={placeOrder}
                disabled={placingOrder || cart.length === 0}
                className="w-full bg-cyan-600 text-white py-4 rounded-xl font-semibold hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {placingOrder ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    {t('placingOrder')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 9h-4.79l-4.38-6.56c-.19-.28-.51-.42-.83-.42s-.64.14-.83.43L6.79 9H2c-.55 0-1 .45-1 1 0 .09.01.18.04.27l2.54 9.27c.23.84 1 1.46 1.92 1.46h13c.92 0 1.69-.62 1.93-1.46l2.54-9.27L23 10c0-.55-.45-1-1-1zM12 4.8L14.8 9H9.2L12 4.8zM18.5 19l-12.99.01L3.31 11H20.7l-2.2 8z"/>
                    </svg>
                    {t('placeOrder')}
                  </>
                )}
              </button>

              <p className="text-center text-slate-400 text-sm mt-4">
                {t('paymentNotice')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
