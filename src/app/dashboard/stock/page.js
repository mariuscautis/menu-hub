'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function StockManagement() {
  const [products, setProducts] = useState([])
  const [entries, setEntries] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name') // 'name', 'stock-low', 'stock-high'

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  // Stock modal combo box states
  const [showStockDropdown, setShowStockDropdown] = useState(false)
  const [stockProductSearch, setStockProductSearch] = useState('')

  // Product form data
  const [productForm, setProductForm] = useState({
    name: '',
    brand: '',
    category: 'kitchen',
    base_unit: 'grams',
    input_unit_type: 'kg',
    units_to_base_multiplier: 1000
  })

  // Stock entry form data
  const [stockForm, setStockForm] = useState({
    product_id: '',
    quantity: '',
    purchase_price: '',
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  // Click outside to close stock product dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStockDropdown && !event.target.closest('.stock-dropdown-container')) {
        setShowStockDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showStockDropdown])

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!restaurant) return

    // Subscribe to stock product changes
    const productsChannel = supabase
      .channel('stock-products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_products',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        () => {
          fetchData()
        }
      )
      .subscribe()

    // Subscribe to stock entry changes
    const entriesChannel = supabase
      .channel('stock-entries-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_entries',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(productsChannel)
      supabase.removeChannel(entriesChannel)
    }
  }, [restaurant])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserEmail(user.email)
    let restaurantData = null

    // Check for staff session (PIN login)
    const staffSessionData = localStorage.getItem('staff_session')
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)
        restaurantData = staffSession.restaurant
        setUserEmail(staffSession.email)
      } catch (err) {
        localStorage.removeItem('staff_session')
      }
    }

    if (!restaurantData) {
      // Check if owner
      const { data: ownedRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (ownedRestaurant) {
        restaurantData = ownedRestaurant
      } else {
        // Check if staff
        const { data: staffRecords } = await supabase
          .from('staff')
          .select('*, restaurants(*)')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .eq('status', 'active')

        const staffRecord = staffRecords && staffRecords.length > 0 ? staffRecords[0] : null
        if (staffRecord?.restaurants) {
          restaurantData = staffRecord.restaurants
        }
      }
    }

    if (!restaurantData) {
      setLoading(false)
      return
    }

    setRestaurant(restaurantData)

    // Fetch products
    const { data: productsData } = await supabase
      .from('stock_products')
      .select('*')
      .eq('restaurant_id', restaurantData.id)
      .order('name')

    setProducts(productsData || [])

    // Fetch recent entries (last 50)
    const { data: entriesData } = await supabase
      .from('stock_entries')
      .select(`
        *,
        stock_products(name, brand, input_unit_type)
      `)
      .eq('restaurant_id', restaurantData.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setEntries(entriesData || [])
    setLoading(false)
  }

  const handleProductFormChange = (e) => {
    const { name, value } = e.target
    let updatedForm = { ...productForm, [name]: value }

    // Auto-calculate multiplier when input_unit_type or base_unit changes
    if (name === 'input_unit_type' || name === 'base_unit') {
      updatedForm = calculateMultiplier(updatedForm)
    }

    setProductForm(updatedForm)
  }

  const calculateMultiplier = (form) => {
    const { input_unit_type, base_unit } = form
    let multiplier = 1

    // Weight conversions
    if (base_unit === 'grams') {
      if (input_unit_type === 'kg') multiplier = 1000
      else if (input_unit_type === 'grams') multiplier = 1
    }

    // Volume conversions
    if (base_unit === 'ml') {
      if (input_unit_type === 'liters') multiplier = 1000
      else if (input_unit_type === 'ml') multiplier = 1
      // For bottles, cans, units - user will specify custom amount
      else if (['bottles', 'cans', 'units'].includes(input_unit_type)) {
        multiplier = form.units_to_base_multiplier || 750 // Default to 750ml for bottles
      }
    }

    return { ...form, units_to_base_multiplier: multiplier }
  }

  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product)
      setProductForm({
        name: product.name,
        brand: product.brand || '',
        category: product.category,
        base_unit: product.base_unit,
        input_unit_type: product.input_unit_type,
        units_to_base_multiplier: product.units_to_base_multiplier
      })
    } else {
      setEditingProduct(null)
      setProductForm({
        name: '',
        brand: '',
        category: 'kitchen',
        base_unit: 'grams',
        input_unit_type: 'kg',
        units_to_base_multiplier: 1000
      })
    }
    setShowProductModal(true)
  }

  const openStockModal = (product = null) => {
    if (product) {
      setStockForm({
        product_id: product.id,
        quantity: '',
        notes: ''
      })
    } else {
      setStockForm({
        product_id: '',
        quantity: '',
        notes: ''
      })
    }
    setStockProductSearch('')
    setShowStockDropdown(false)
    setShowStockModal(true)
  }

  const handleProductSubmit = async (e) => {
    e.preventDefault()

    const productData = {
      restaurant_id: restaurant.id,
      name: productForm.name,
      brand: productForm.brand || null,
      category: productForm.category,
      base_unit: productForm.base_unit,
      input_unit_type: productForm.input_unit_type,
      units_to_base_multiplier: parseFloat(productForm.units_to_base_multiplier)
    }

    if (editingProduct) {
      await supabase
        .from('stock_products')
        .update(productData)
        .eq('id', editingProduct.id)
    } else {
      await supabase
        .from('stock_products')
        .insert(productData)
    }

    setShowProductModal(false)
    fetchData()
  }

  const handleStockSubmit = async (e) => {
    e.preventDefault()

    const product = products.find(p => p.id === stockForm.product_id)
    if (!product) return

    const quantity = parseFloat(stockForm.quantity)
    const purchasePrice = parseFloat(stockForm.purchase_price)

    // Validation
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity')
      return
    }
    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      alert('Please enter a valid purchase price')
      return
    }

    // Calculate cost per base unit
    // Example: If adding 5 kg at $50, and multiplier is 1000 (kg to grams)
    // Total base units = 5 * 1000 = 5000 grams
    // Cost per gram = $50 / 5000 = $0.01
    const totalBaseUnits = quantity * product.units_to_base_multiplier
    const costPerBaseUnit = purchasePrice / totalBaseUnits

    console.log('Stock entry calculation:', {
      quantity,
      purchasePrice,
      multiplier: product.units_to_base_multiplier,
      totalBaseUnits,
      costPerBaseUnit
    })

    const entryData = {
      restaurant_id: restaurant.id,
      product_id: stockForm.product_id,
      quantity: quantity,
      unit_used: product.input_unit_type,
      purchase_price: purchasePrice,
      added_by_email: userEmail,
      notes: stockForm.notes || null
    }

    const { error: entryError } = await supabase
      .from('stock_entries')
      .insert(entryData)

    if (entryError) {
      console.error('Error inserting stock entry:', entryError)
      alert('Failed to add stock entry: ' + entryError.message)
      return
    }

    // Update the product's cost tracking
    const { error: updateError } = await supabase
      .from('stock_products')
      .update({
        cost_per_base_unit: costPerBaseUnit,
        last_purchase_price: purchasePrice,
        last_purchase_date: new Date().toISOString()
      })
      .eq('id', stockForm.product_id)

    if (updateError) {
      console.error('Error updating product cost:', updateError)
      alert('Failed to update product cost: ' + updateError.message)
      return
    }

    console.log('Stock added successfully. Cost per base unit:', costPerBaseUnit)

    setShowStockModal(false)
    setStockForm({ product_id: '', quantity: '', purchase_price: '', notes: '' })
    fetchData()
  }

  const deleteProduct = async (id) => {
    if (!confirm('Are you sure? This will delete all stock entries for this product.')) return

    await supabase
      .from('stock_products')
      .delete()
      .eq('id', id)

    fetchData()
  }

  const formatStock = (amount, unit) => {
    if (amount === 0) return `0 ${unit}`
    if (amount >= 1000 && unit === 'grams') {
      return `${(amount / 1000).toFixed(2)} kg`
    }
    if (amount >= 1000 && unit === 'ml') {
      return `${(amount / 1000).toFixed(2)} L`
    }
    return `${amount.toFixed(2)} ${unit}`
  }

  const getUnitLabel = (unitType) => {
    const labels = {
      'kg': 'Kilograms',
      'grams': 'Grams',
      'liters': 'Liters',
      'ml': 'Milliliters',
      'bottles': 'Bottles',
      'cans': 'Cans',
      'units': 'Units'
    }
    return labels[unitType] || unitType
  }

  // Filter and search products
  const filteredProducts = products
    .filter(p => {
      // Category filter
      if (filterCategory !== 'all' && p.category !== filterCategory) return false

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = p.name.toLowerCase().includes(query)
        const matchesBrand = p.brand?.toLowerCase().includes(query)
        return matchesName || matchesBrand
      }

      return true
    })
    .sort((a, b) => {
      // Sort logic
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'stock-low') {
        return a.current_stock - b.current_stock
      } else if (sortBy === 'stock-high') {
        return b.current_stock - a.current_stock
      }
      return 0
    })

  // Calculate stats
  const stats = {
    totalProducts: products.length,
    lowStock: products.filter(p => p.current_stock < 100).length,
    kitchenItems: products.filter(p => p.category === 'kitchen').length,
    barItems: products.filter(p => p.category === 'bar').length
  }

  if (loading) {
    return <div className="text-slate-500">Loading stock management...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stock Management</h1>
          <p className="text-slate-500">Track inventory for bar and kitchen</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => openStockModal()}
            className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Stock
          </button>
          <button
            onClick={() => openProductModal()}
            className="bg-[#6262bd] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            New Product
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-slate-100">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'products'
              ? 'text-[#6262bd] border-b-2 border-[#6262bd] -mb-0.5'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-[#6262bd] border-b-2 border-[#6262bd] -mb-0.5'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          History ({entries.length})
        </button>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
              <p className="text-slate-500 text-sm font-medium mb-1">Total Products</p>
              <p className="text-2xl font-bold text-[#6262bd]">{stats.totalProducts}</p>
            </div>
            <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
              <p className="text-slate-500 text-sm font-medium mb-1">Low Stock Items</p>
              <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
            </div>
            <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
              <p className="text-slate-500 text-sm font-medium mb-1">Kitchen Items</p>
              <p className="text-2xl font-bold text-green-600">{stats.kitchenItems}</p>
            </div>
            <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
              <p className="text-slate-500 text-sm font-medium mb-1">Bar Items</p>
              <p className="text-2xl font-bold text-orange-600">{stats.barItems}</p>
            </div>
          </div>

          {/* Search and Sort Bar */}
          <div className="mb-6 flex gap-3">
            <div className="flex-1 relative">
              <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or brand..."
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 bg-white"
            >
              <option value="name">Sort: A-Z</option>
              <option value="stock-low">Sort: Low Stock</option>
              <option value="stock-high">Sort: High Stock</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterCategory === 'all'
                  ? 'bg-[#6262bd] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCategory('kitchen')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterCategory === 'kitchen'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              🍳 Kitchen
            </button>
            <button
              onClick={() => setFilterCategory('bar')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterCategory === 'bar'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              🍸 Bar
            </button>
          </div>

          {/* Results Count */}
          {(searchQuery || filterCategory !== 'all') && products.length > 0 && (
            <div className="mb-4 text-sm text-slate-600">
              Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
            </div>
          )}

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  {searchQuery || filterCategory !== 'all' ? (
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  ) : (
                    <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                  )}
                </svg>
              </div>
              {searchQuery || filterCategory !== 'all' ? (
                <>
                  <p className="text-slate-500 mb-2">No products found</p>
                  <p className="text-sm text-slate-400 mb-4">
                    Try adjusting your search or filters
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setFilterCategory('all')
                    }}
                    className="text-[#6262bd] font-medium hover:underline"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <p className="text-slate-500 mb-4">No products yet</p>
                  <button
                    onClick={() => openProductModal()}
                    className="text-[#6262bd] font-medium hover:underline"
                  >
                    Add your first product
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border-2 border-slate-100 rounded-2xl p-6 flex justify-between items-center"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">
                        {product.name}
                      </h3>
                      {product.brand && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
                          {product.brand}
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        product.category === 'bar'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {product.category === 'bar' ? '🍸 Bar' : '🍳 Kitchen'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>
                        Current Stock: <strong className="text-[#6262bd]">{formatStock(product.current_stock, product.base_unit)}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        Input Unit: <strong>{getUnitLabel(product.input_unit_type)}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        1 {product.input_unit_type} = {product.units_to_base_multiplier} {product.base_unit}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openStockModal(product)}
                      className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-medium hover:bg-green-100"
                    >
                      + Add Stock
                    </button>
                    <button
                      onClick={() => openProductModal(product)}
                      className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          {entries.length === 0 ? (
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
              <p className="text-slate-500">No stock entries yet</p>
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b-2 border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Product</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Quantity</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Added By</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">
                            {entry.stock_products?.name}
                          </div>
                          {entry.stock_products?.brand && (
                            <div className="text-xs text-slate-500">
                              {entry.stock_products.brand}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                          {entry.quantity} {entry.unit_used}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {entry.added_by_email}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {entry.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New/Edit Product Modal */}
      {showProductModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowProductModal(false)
            setEditingProduct(null)
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {editingProduct ? 'Edit Product' : 'New Product'}
            </h2>

            <form onSubmit={handleProductSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={productForm.name}
                    onChange={handleProductFormChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder="All-Purpose Flour"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Brand (Optional)
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={productForm.brand}
                    onChange={handleProductFormChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder="King Arthur"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={productForm.category}
                  onChange={handleProductFormChange}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                >
                  <option value="kitchen">🍳 Kitchen</option>
                  <option value="bar">🍸 Bar</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Base Storage Unit *
                  </label>
                  <select
                    name="base_unit"
                    value={productForm.base_unit}
                    onChange={handleProductFormChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  >
                    <option value="grams">Grams (for solids)</option>
                    <option value="ml">Milliliters (for liquids)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    How this item will be stored in the system
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Input Unit Type *
                  </label>
                  <select
                    name="input_unit_type"
                    value={productForm.input_unit_type}
                    onChange={handleProductFormChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  >
                    <optgroup label="Weight">
                      <option value="kg">Kilograms (kg)</option>
                      <option value="grams">Grams (g)</option>
                    </optgroup>
                    <optgroup label="Volume">
                      <option value="liters">Liters (L)</option>
                      <option value="ml">Milliliters (ml)</option>
                    </optgroup>
                    <optgroup label="Counted Items">
                      <option value="bottles">Bottles</option>
                      <option value="cans">Cans</option>
                      <option value="units">Units (pieces)</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    How you'll add this item
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Conversion Factor *
                </label>
                <input
                  type="number"
                  name="units_to_base_multiplier"
                  value={productForm.units_to_base_multiplier}
                  onChange={handleProductFormChange}
                  required
                  step="0.01"
                  min="0.01"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
                <p className="text-xs text-slate-500 mt-1">
                  1 {productForm.input_unit_type} = {productForm.units_to_base_multiplier} {productForm.base_unit}
                  {['bottles', 'cans', 'units'].includes(productForm.input_unit_type) && (
                    <span className="block mt-1">
                      Example: A standard wine bottle is 750ml, so enter 750
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-medium hover:bg-[#5252a3]"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showStockModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowStockModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">Add Stock</h2>

            <form onSubmit={handleStockSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Product *
                </label>
                <div className="relative stock-dropdown-container">
                  {/* Combo Bar Input */}
                  <input
                    type="text"
                    value={showStockDropdown
                      ? stockProductSearch
                      : (stockForm.product_id
                          ? (() => {
                              const selectedProduct = products.find(p => p.id === stockForm.product_id)
                              return selectedProduct
                                ? `${selectedProduct.name}${selectedProduct.brand ? ` (${selectedProduct.brand})` : ''} - ${selectedProduct.category}`
                                : ''
                            })()
                          : ''
                        )
                    }
                    onChange={(e) => {
                      setStockProductSearch(e.target.value)
                      setShowStockDropdown(true)
                      // Clear selection when typing
                      if (stockForm.product_id) {
                        setStockForm({ ...stockForm, product_id: '' })
                      }
                    }}
                    onFocus={() => {
                      setShowStockDropdown(true)
                      setStockProductSearch('')
                    }}
                    placeholder="Search or select product..."
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    required
                  />

                  {/* Dropdown List */}
                  {showStockDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {(() => {
                        const filteredProducts = products.filter(product => {
                          if (!stockProductSearch) return true
                          const query = stockProductSearch.toLowerCase()
                          const matchesName = product.name.toLowerCase().includes(query)
                          const matchesBrand = product.brand?.toLowerCase().includes(query)
                          const matchesCategory = product.category.toLowerCase().includes(query)
                          return matchesName || matchesBrand || matchesCategory
                        })

                        return filteredProducts.length > 0 ? (
                          filteredProducts.map((product) => (
                            <div
                              key={product.id}
                              onClick={() => {
                                setStockForm({ ...stockForm, product_id: product.id })
                                setShowStockDropdown(false)
                                setStockProductSearch('')
                              }}
                              className="px-4 py-2 hover:bg-[#6262bd] hover:text-white cursor-pointer transition-colors"
                            >
                              {product.name} {product.brand ? `(${product.brand})` : ''} - {product.category}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-slate-400 text-sm">
                            No products found
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {stockForm.product_id && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Quantity *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={stockForm.quantity}
                          onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                          required
                          step="0.01"
                          min="0.01"
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                          placeholder="0"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                          {products.find(p => p.id === stockForm.product_id)?.input_unit_type}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Purchase Price *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                          £
                        </span>
                        <input
                          type="number"
                          value={stockForm.purchase_price}
                          onChange={(e) => setStockForm({ ...stockForm, purchase_price: e.target.value })}
                          required
                          step="0.01"
                          min="0.01"
                          className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {stockForm.quantity && stockForm.purchase_price && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-slate-700 mb-1">
                        <strong>Total stock:</strong> {(parseFloat(stockForm.quantity) * products.find(p => p.id === stockForm.product_id)?.units_to_base_multiplier).toFixed(2)} {products.find(p => p.id === stockForm.product_id)?.base_unit}
                      </p>
                      <p className="text-sm text-slate-700">
                        <strong>Cost per {products.find(p => p.id === stockForm.product_id)?.base_unit}:</strong> £{(parseFloat(stockForm.purchase_price) / (parseFloat(stockForm.quantity) * products.find(p => p.id === stockForm.product_id)?.units_to_base_multiplier)).toFixed(4)}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={stockForm.notes}
                      onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
                      placeholder="Supplier, invoice number, etc."
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!stockForm.product_id}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
