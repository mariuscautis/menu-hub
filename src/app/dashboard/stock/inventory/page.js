'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslations } from '@/lib/i18n/LanguageContext'

export default function InventoryManagement() {
  const t = useTranslations('inventory')
  const [products, setProducts] = useState([])
  const [entries, setEntries] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('items')
  const [filterStockType, setFilterStockType] = useState('all') // 'all', 'low'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')

  // Invoice states
  const [purchasingInvoices, setPurchasingInvoices] = useState([])
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState('')

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
    description: '',
    unit_type: 'units',
    min_stock_level: 0
  })

  // Stock entry form data
  const [stockForm, setStockForm] = useState({
    product_id: '',
    quantity: '',
    purchase_price: '',
    notes: '',
    purchasing_invoice_id: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStockDropdown && !event.target.closest('.stock-dropdown-container')) {
        setShowStockDropdown(false)
      }
      if (showInvoiceDropdown && !event.target.closest('.invoice-dropdown-container')) {
        setShowInvoiceDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showStockDropdown, showInvoiceDropdown])

  // Real-time subscriptions
  useEffect(() => {
    if (!restaurant) return

    const productsChannel = supabase
      .channel('inventory-products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_products',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        () => fetchData()
      )
      .subscribe()

    const entriesChannel = supabase
      .channel('inventory-entries-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_entries',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        () => fetchData()
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
      const { data: ownedRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (ownedRestaurant) {
        restaurantData = ownedRestaurant
      } else {
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

    // Fetch inventory products
    const { data: productsData } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('restaurant_id', restaurantData.id)
      .order('name')

    setProducts(productsData || [])

    // Fetch recent entries (last 50)
    const { data: entriesData } = await supabase
      .from('inventory_entries')
      .select(`
        *,
        inventory_products(name, brand, unit_type)
      `)
      .eq('restaurant_id', restaurantData.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setEntries(entriesData || [])

    // Fetch recent purchasing invoices
    const { data: invoicesData } = await supabase
      .from('purchasing_invoices')
      .select('id, reference_number, supplier_name, invoice_date')
      .eq('restaurant_id', restaurantData.id)
      .order('created_at', { ascending: false })
      .limit(5)

    setPurchasingInvoices(invoicesData || [])
    setLoading(false)
  }

  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product)
      setProductForm({
        name: product.name,
        brand: product.brand || '',
        description: product.description || '',
        unit_type: product.unit_type,
        min_stock_level: product.min_stock_level || 0
      })
    } else {
      setEditingProduct(null)
      setProductForm({
        name: '',
        brand: '',
        description: '',
        unit_type: 'units',
        min_stock_level: 0
      })
    }
    setShowProductModal(true)
  }

  const openStockModal = (product = null) => {
    if (product) {
      setStockForm({
        product_id: product.id,
        quantity: '',
        purchase_price: '',
        notes: '',
        purchasing_invoice_id: ''
      })
    } else {
      setStockForm({
        product_id: '',
        quantity: '',
        purchase_price: '',
        notes: '',
        purchasing_invoice_id: ''
      })
    }
    setStockProductSearch('')
    setShowStockDropdown(false)
    setInvoiceSearch('')
    setShowInvoiceDropdown(false)
    setShowStockModal(true)
  }

  const handleProductSubmit = async (e) => {
    e.preventDefault()

    const productData = {
      restaurant_id: restaurant.id,
      name: productForm.name,
      brand: productForm.brand || null,
      description: productForm.description || null,
      unit_type: productForm.unit_type,
      min_stock_level: parseInt(productForm.min_stock_level) || 0
    }

    if (editingProduct) {
      await supabase
        .from('inventory_products')
        .update(productData)
        .eq('id', editingProduct.id)
    } else {
      await supabase
        .from('inventory_products')
        .insert(productData)
    }

    setShowProductModal(false)
    fetchData()
  }

  const handleStockSubmit = async (e) => {
    e.preventDefault()

    const product = products.find(p => p.id === stockForm.product_id)
    if (!product) return

    const quantity = parseInt(stockForm.quantity)
    const purchasePrice = stockForm.purchase_price ? parseFloat(stockForm.purchase_price) : null

    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity')
      return
    }

    const entryData = {
      restaurant_id: restaurant.id,
      product_id: stockForm.product_id,
      quantity: quantity,
      purchase_price: purchasePrice,
      added_by_email: userEmail,
      notes: stockForm.notes || null,
      purchasing_invoice_id: stockForm.purchasing_invoice_id || null
    }

    const { error: entryError } = await supabase
      .from('inventory_entries')
      .insert(entryData)

    if (entryError) {
      console.error('Error inserting inventory entry:', entryError)
      alert('Failed to add stock entry: ' + entryError.message)
      return
    }

    setShowStockModal(false)
    setStockForm({ product_id: '', quantity: '', purchase_price: '', notes: '', purchasing_invoice_id: '' })
    fetchData()
  }

  const deleteProduct = async (id) => {
    if (!confirm('Are you sure? This will delete all entries for this item.')) return

    await supabase
      .from('inventory_products')
      .delete()
      .eq('id', id)

    fetchData()
  }

  // Filter and search products
  const filteredProducts = products
    .filter(p => {
      // Stats card filter
      if (filterStockType === 'low' && p.current_stock >= p.min_stock_level) return false

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
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'stock-low') return a.current_stock - b.current_stock
      if (sortBy === 'stock-high') return b.current_stock - a.current_stock
      return 0
    })

  // Calculate stats
  const stats = {
    totalItems: products.length,
    lowStock: products.filter(p => p.current_stock < p.min_stock_level).length,
    recentAdditions: entries.filter(e => {
      const date = new Date(e.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return date >= weekAgo
    }).length
  }

  if (loading) {
    return <div className="text-slate-500">{t('loading')}</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
          <p className="text-slate-500">{t('subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => openStockModal()}
            className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-green-700 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            {t('addStock')}
          </button>
          <button
            onClick={() => openProductModal()}
            className="bg-[#6262bd] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            {t('newItem')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-slate-100">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'items'
              ? 'text-[#6262bd] border-b-2 border-[#6262bd] -mb-0.5'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('items')} ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-[#6262bd] border-b-2 border-[#6262bd] -mb-0.5'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('history')} ({entries.length})
        </button>
      </div>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div>
          {/* Stats Cards - Clickable Filters */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => setFilterStockType('all')}
              className={`bg-white border-2 rounded-xl p-4 text-left transition-all ${
                filterStockType === 'all'
                  ? 'border-[#6262bd] ring-2 ring-[#6262bd]/20'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <p className="text-slate-500 text-sm font-medium mb-1">{t('totalItems')}</p>
              <p className="text-2xl font-bold text-[#6262bd]">{stats.totalItems}</p>
            </button>
            <button
              onClick={() => setFilterStockType('low')}
              className={`bg-white border-2 rounded-xl p-4 text-left transition-all ${
                filterStockType === 'low'
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <p className="text-slate-500 text-sm font-medium mb-1">{t('lowStockItems')}</p>
              <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
            </button>
            <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
              <p className="text-slate-500 text-sm font-medium mb-1">{t('recentAdditions')}</p>
              <p className="text-2xl font-bold text-green-600">{stats.recentAdditions}</p>
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
                placeholder={t('searchPlaceholder')}
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
              <option value="name">{t('sortAZ')}</option>
              <option value="stock-low">{t('sortLowStock')}</option>
              <option value="stock-high">{t('sortHighStock')}</option>
            </select>
          </div>

          {/* Results Count */}
          {(searchQuery || filterStockType !== 'all') && products.length > 0 && (
            <div className="mb-4 text-sm text-slate-600" dangerouslySetInnerHTML={{
              __html: t('showingItems')
                .replace('{filtered}', filteredProducts.length)
                .replace('{total}', products.length)
            }} />
          )}

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/>
                </svg>
              </div>
              {searchQuery || filterStockType !== 'all' ? (
                <>
                  <p className="text-slate-500 mb-2">{t('noItemsFound')}</p>
                  <p className="text-sm text-slate-400 mb-4">{t('tryAdjusting')}</p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setFilterStockType('all')
                    }}
                    className="text-[#6262bd] font-medium hover:underline"
                  >
                    {t('clearFilters')}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-slate-500 mb-4">{t('noItemsYet')}</p>
                  <button
                    onClick={() => openProductModal()}
                    className="text-[#6262bd] font-medium hover:underline"
                  >
                    {t('addFirstItem')}
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
                      <h3 className="text-lg font-semibold text-slate-800">{product.name}</h3>
                      {product.brand && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
                          {product.brand}
                        </span>
                      )}
                      {product.current_stock < product.min_stock_level && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                          Low Stock
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>
                        {t('currentStock')}: <strong className={`${product.current_stock < product.min_stock_level ? 'text-amber-600' : 'text-[#6262bd]'}`}>
                          {product.current_stock} {product.unit_type}
                        </strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        {t('minStockLevel')}: <strong>{product.min_stock_level}</strong>
                      </span>
                      {product.last_purchase_price && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>
                            Last Price: <strong className="text-green-600">£{parseFloat(product.last_purchase_price).toFixed(2)}</strong>
                          </span>
                        </>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-sm text-slate-500 mt-2">{product.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openStockModal(product)}
                      className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-medium hover:bg-green-100"
                    >
                      {t('addStockButton')}
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
              <p className="text-slate-500">{t('noEntries')}</p>
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b-2 border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">{t('date')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">{t('item')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">{t('quantity')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">{t('addedBy')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">{t('notes')}</th>
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
                            {entry.inventory_products?.name}
                          </div>
                          {entry.inventory_products?.brand && (
                            <div className="text-xs text-slate-500">
                              {entry.inventory_products.brand}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                          {entry.quantity} {entry.inventory_products?.unit_type}
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
          onClick={() => setShowProductModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {editingProduct ? t('editItem') : t('newItem')}
            </h2>

            <form onSubmit={handleProductSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('itemName')} *
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder={t('itemNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('brand')}
                </label>
                <input
                  type="text"
                  value={productForm.brand}
                  onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder={t('brandPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('description')}
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('unitType')} *
                  </label>
                  <select
                    value={productForm.unit_type}
                    onChange={(e) => setProductForm({ ...productForm, unit_type: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  >
                    <option value="units">{t('units')}</option>
                    <option value="pieces">{t('pieces')}</option>
                    <option value="sets">{t('sets')}</option>
                    <option value="boxes">{t('boxes')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('minStockLevel')}
                  </label>
                  <input
                    type="number"
                    value={productForm.min_stock_level}
                    onChange={(e) => setProductForm({ ...productForm, min_stock_level: e.target.value })}
                    min="0"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-medium hover:bg-[#5252a3]"
                >
                  {editingProduct ? t('saveChanges') : t('createItem')}
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
            <h2 className="text-xl font-bold text-slate-800 mb-6">{t('addStock')}</h2>

            <form onSubmit={handleStockSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('selectItem')} *
                </label>
                <div className="relative stock-dropdown-container">
                  <input
                    type="text"
                    value={showStockDropdown
                      ? stockProductSearch
                      : (stockForm.product_id
                          ? (() => {
                              const selectedProduct = products.find(p => p.id === stockForm.product_id)
                              return selectedProduct
                                ? `${selectedProduct.name}${selectedProduct.brand ? ` (${selectedProduct.brand})` : ''}`
                                : ''
                            })()
                          : ''
                        )
                    }
                    onChange={(e) => {
                      setStockProductSearch(e.target.value)
                      setShowStockDropdown(true)
                      if (stockForm.product_id) {
                        setStockForm({ ...stockForm, product_id: '' })
                      }
                    }}
                    onFocus={() => {
                      setShowStockDropdown(true)
                      setStockProductSearch('')
                    }}
                    placeholder={t('searchOrSelectItem')}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    required
                  />

                  {showStockDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {(() => {
                        const filteredProducts = products.filter(product => {
                          if (!stockProductSearch) return true
                          const query = stockProductSearch.toLowerCase()
                          return product.name.toLowerCase().includes(query) || product.brand?.toLowerCase().includes(query)
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
                              {product.name} {product.brand ? `(${product.brand})` : ''}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-slate-400 text-sm">
                            {t('noItemsFound')}
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
                        {t('quantity')} *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={stockForm.quantity}
                          onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                          required
                          min="1"
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                          placeholder="0"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                          {products.find(p => p.id === stockForm.product_id)?.unit_type}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {t('purchasePrice')}
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">£</span>
                        <input
                          type="number"
                          value={stockForm.purchase_price}
                          onChange={(e) => setStockForm({ ...stockForm, purchase_price: e.target.value })}
                          step="0.01"
                          min="0"
                          className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Invoice Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('linkToInvoice')} ({t('optional')})
                    </label>
                    <div className="relative invoice-dropdown-container">
                      <input
                        type="text"
                        value={showInvoiceDropdown
                          ? invoiceSearch
                          : (stockForm.purchasing_invoice_id
                              ? (() => {
                                  const selectedInvoice = purchasingInvoices.find(inv => inv.id === stockForm.purchasing_invoice_id)
                                  return selectedInvoice
                                    ? `${selectedInvoice.reference_number}${selectedInvoice.supplier_name ? ` - ${selectedInvoice.supplier_name}` : ''}`
                                    : ''
                                })()
                              : ''
                            )
                        }
                        onChange={(e) => {
                          setInvoiceSearch(e.target.value)
                          setShowInvoiceDropdown(true)
                          if (stockForm.purchasing_invoice_id) {
                            setStockForm({ ...stockForm, purchasing_invoice_id: '' })
                          }
                        }}
                        onFocus={() => {
                          setShowInvoiceDropdown(true)
                          setInvoiceSearch('')
                        }}
                        placeholder={t('searchOrSelectInvoice')}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                      />
                      {stockForm.purchasing_invoice_id && !showInvoiceDropdown && (
                        <button
                          type="button"
                          onClick={() => setStockForm({ ...stockForm, purchasing_invoice_id: '' })}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                          </svg>
                        </button>
                      )}

                      {showInvoiceDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          <div
                            onClick={() => {
                              setStockForm({ ...stockForm, purchasing_invoice_id: '' })
                              setShowInvoiceDropdown(false)
                              setInvoiceSearch('')
                            }}
                            className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-slate-500 border-b border-slate-100"
                          >
                            {t('noInvoice')}
                          </div>
                          {(() => {
                            const filteredInvoices = purchasingInvoices.filter(invoice => {
                              if (!invoiceSearch) return true
                              const query = invoiceSearch.toLowerCase()
                              return (
                                invoice.reference_number.toLowerCase().includes(query) ||
                                invoice.supplier_name?.toLowerCase().includes(query)
                              )
                            })

                            return filteredInvoices.length > 0 ? (
                              filteredInvoices.map((invoice) => (
                                <div
                                  key={invoice.id}
                                  onClick={() => {
                                    setStockForm({ ...stockForm, purchasing_invoice_id: invoice.id })
                                    setShowInvoiceDropdown(false)
                                    setInvoiceSearch('')
                                  }}
                                  className="px-4 py-2 hover:bg-[#6262bd] hover:text-white cursor-pointer transition-colors"
                                >
                                  <div className="font-medium">{invoice.reference_number}</div>
                                  <div className="text-xs opacity-75">
                                    {invoice.supplier_name && `${invoice.supplier_name} • `}
                                    {new Date(invoice.invoice_date).toLocaleDateString()}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-slate-400 text-sm">
                                No invoices found
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('notesOptional')}
                    </label>
                    <textarea
                      value={stockForm.notes}
                      onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
                      placeholder={t('notesPlaceholder')}
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
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!stockForm.product_id}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('addStock')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
