'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { useCurrency } from '@/lib/CurrencyContext'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'
import { useModuleGuard } from '@/hooks/useModuleGuard'

export default function StockManagement() {
  useModuleGuard('ordering')
  const t = useTranslations('stock')
  const { currencySymbol } = useCurrency()
  const restaurantCtx = useRestaurant()
  const supabase = useAdminSupabase()
  const [products, setProducts] = useState([])
  const [entries, setEntries] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStockType, setFilterStockType] = useState('all') // 'all', 'low', 'kitchen', 'bar'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name') // 'name', 'stock-low', 'stock-high'
  const [taxCategories, setTaxCategories] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  // Stock modal combo box states
  const [showStockDropdown, setShowStockDropdown] = useState(false)
  const [stockProductSearch, setStockProductSearch] = useState('')
  const [stockModalTab, setStockModalTab] = useState('add') // 'add' | 'adjust'
  const [adjustForm, setAdjustForm] = useState({ current_stock: '', current_stock_value: '' })

  // Invoice dropdown states
  const [purchasingInvoices, setPurchasingInvoices] = useState([])
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState('')

  // Product form data
  const [productForm, setProductForm] = useState({
    name: '',
    brand: '',
    category: 'kitchen',
    base_unit: 'grams',
    input_unit_type: 'kg',
    units_to_base_multiplier: 1000,
    tax_category_id: ''
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
  }, [restaurantCtx])

  // Click outside to close stock product dropdown
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
    if (!restaurantCtx?.restaurant) return
    const restaurantData = restaurantCtx.restaurant
    setRestaurant(restaurantData)

    // Use API route (bypasses RLS) for staff PIN sessions and impersonating admins
    const isStaffSession = !!localStorage.getItem('staff_session')
    if (isStaffSession || restaurantCtx?.isPlatformAdmin) {
      try {
        const res = await fetch(`/api/stock/products?restaurantId=${restaurantData.id}`)
        const json = await res.json()
        setProducts(json.products || [])
        setEntries(json.entries || [])
        setPurchasingInvoices(json.invoices || [])
        setTaxCategories(json.taxCategories || [])
        setLoading(false)
        return
      } catch (err) {
        // Fall through to direct Supabase queries below
      }
    }

    // Fetch tax categories
    const { data: taxCatsData } = await supabase
      .from('product_tax_categories')
      .select('*')
      .eq('restaurant_id', restaurantData.id)
      .eq('is_active', true)
      .order('name')

    setTaxCategories(taxCatsData || [])

    // Fetch products with tax category info
    const { data: productsData } = await supabase
      .from('stock_products')
      .select(`
        *,
        product_tax_categories(id, name, rate)
      `)
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

    // Fetch recent purchasing invoices (last 5 for dropdown)
    const { data: invoicesData } = await supabase
      .from('purchasing_invoices')
      .select('id, reference_number, supplier_name, invoice_date')
      .eq('restaurant_id', restaurantData.id)
      .order('created_at', { ascending: false })
      .limit(5)

    setPurchasingInvoices(invoicesData || [])
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
        units_to_base_multiplier: product.units_to_base_multiplier,
        tax_category_id: product.tax_category_id || ''
      })
    } else {
      setEditingProduct(null)
      setProductForm({
        name: '',
        brand: '',
        category: 'kitchen',
        base_unit: 'grams',
        input_unit_type: 'kg',
        units_to_base_multiplier: 1000,
        tax_category_id: ''
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
    setStockModalTab('add')
    setAdjustForm({ current_stock: '', current_stock_value: '' })
    setShowStockModal(true)
  }

  const openAdjustModal = (product) => {
    setStockForm({ product_id: product.id, quantity: '', purchase_price: '', notes: '', purchasing_invoice_id: '' })
    setStockProductSearch('')
    setShowStockDropdown(false)
    setInvoiceSearch('')
    setShowInvoiceDropdown(false)
    setStockModalTab('adjust')
    const currentInInputUnits = parseFloat(product.current_stock || 0) / parseFloat(product.units_to_base_multiplier || 1)
    setAdjustForm({ current_stock: currentInInputUnits > 0 ? currentInInputUnits.toFixed(2) : '', current_stock_value: '' })
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
      units_to_base_multiplier: parseFloat(productForm.units_to_base_multiplier),
      tax_category_id: productForm.tax_category_id || null
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
      notes: stockForm.notes || null,
      purchasing_invoice_id: stockForm.purchasing_invoice_id || null
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
    setStockForm({ product_id: '', quantity: '', purchase_price: '', notes: '', purchasing_invoice_id: '' })
    fetchData()
  }

  const handleAdjustValue = async (e) => {
    e.preventDefault()
    const product = products.find(p => p.id === stockForm.product_id)
    if (!product) return

    const newStock = parseFloat(adjustForm.current_stock)
    const newValue = parseFloat(adjustForm.current_stock_value)

    if (isNaN(newStock) || newStock < 0) {
      alert(t('invalidStockQty'))
      return
    }
    if (isNaN(newValue) || newValue < 0) {
      alert(t('invalidStockValue'))
      return
    }

    const multiplier = parseFloat(product.units_to_base_multiplier || 1)
    const newStockBase = newStock * multiplier
    const costPerBaseUnit = newStockBase > 0 && newValue > 0 ? newValue / newStockBase : 0

    await supabase
      .from('stock_products')
      .update({
        current_stock: newStockBase,
        cost_per_base_unit: costPerBaseUnit
      })
      .eq('id', product.id)

    setShowStockModal(false)
    setAdjustForm({ current_stock: '', current_stock_value: '' })
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

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected product${selectedIds.size > 1 ? 's' : ''}? This will also delete their stock entries.`)) return
    await supabase.from('stock_products').delete().in('id', [...selectedIds])
    setSelectedIds(new Set())
    fetchData()
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)))
    }
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
      // Stats card filter (Total, Low Stock, Kitchen, Bar)
      if (filterStockType === 'low' && p.current_stock >= 100) return false
      if (filterStockType === 'kitchen' && p.category !== 'kitchen') return false
      if (filterStockType === 'bar' && p.category !== 'bar') return false

      // Category filter (from the smaller buttons below)
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
            {t('newProduct')}
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
          {t('products')} ({products.length})
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

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          {/* Stats Cards - Clickable Filters */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <button
              onClick={() => setFilterStockType('all')}
              className={`bg-white border-2 rounded-xl p-4 text-left transition-all ${
                filterStockType === 'all'
                  ? 'border-[#6262bd] ring-2 ring-[#6262bd]/20'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <p className="text-slate-500 text-sm font-medium mb-1">{t('totalProducts')}</p>
              <p className="text-2xl font-bold text-[#6262bd]">{stats.totalProducts}</p>
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
            <button
              onClick={() => setFilterStockType('kitchen')}
              className={`bg-white border-2 rounded-xl p-4 text-left transition-all ${
                filterStockType === 'kitchen'
                  ? 'border-green-500 ring-2 ring-green-500/20'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <p className="text-slate-500 text-sm font-medium mb-1">{t('kitchenItems')}</p>
              <p className="text-2xl font-bold text-green-600">{stats.kitchenItems}</p>
            </button>
            <button
              onClick={() => setFilterStockType('bar')}
              className={`bg-white border-2 rounded-xl p-4 text-left transition-all ${
                filterStockType === 'bar'
                  ? 'border-orange-500 ring-2 ring-orange-500/20'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <p className="text-slate-500 text-sm font-medium mb-1">{t('barItems')}</p>
              <p className="text-2xl font-bold text-orange-600">{stats.barItems}</p>
            </button>
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
              {t('all')}
            </button>
            <button
              onClick={() => setFilterCategory('kitchen')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterCategory === 'kitchen'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              🍳 {t('kitchen')}
            </button>
            <button
              onClick={() => setFilterCategory('bar')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterCategory === 'bar'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              🍸 {t('bar')}
            </button>
          </div>

          {/* Results Count */}
          {(searchQuery || filterCategory !== 'all' || filterStockType !== 'all') && products.length > 0 && (
            <div className="mb-4 text-sm text-slate-600" dangerouslySetInnerHTML={{
              __html: t('showingProducts')
                .replace('{filtered}', filteredProducts.length)
                .replace('{total}', products.length)
            }} />
          )}

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  {searchQuery || filterCategory !== 'all' || filterStockType !== 'all' ? (
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  ) : (
                    <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                  )}
                </svg>
              </div>
              {searchQuery || filterCategory !== 'all' || filterStockType !== 'all' ? (
                <>
                  <p className="text-slate-500 mb-2">{t('noProductsFound')}</p>
                  <p className="text-sm text-slate-400 mb-4">
                    {t('tryAdjusting')}
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setFilterCategory('all')
                      setFilterStockType('all')
                    }}
                    className="text-[#6262bd] font-medium hover:underline"
                  >
                    {t('clearFilters')}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-slate-500 mb-4">{t('noProductsYet')}</p>
                  <button
                    onClick={() => openProductModal()}
                    className="text-[#6262bd] font-medium hover:underline"
                  >
                    {t('addFirstProduct')}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {/* Select all row */}
              <div className="flex items-center gap-3 px-2">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                  ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredProducts.length }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 accent-[#6262bd] cursor-pointer"
                />
                <span className="text-sm text-slate-500">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select all (${filteredProducts.length})`}
                </span>
              </div>

              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`bg-white border-2 rounded-2xl p-6 flex items-center gap-3 ${
                    selectedIds.has(product.id) ? 'border-[#6262bd] bg-[#6262bd]/5' :
                    product.current_stock <= 0 ? 'border-red-300 bg-red-50' : 'border-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleSelect(product.id)}
                    className="w-4 h-4 rounded border-slate-300 accent-[#6262bd] cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">
                        {product.name}
                      </h3>
                      {product.current_stock <= 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                          ⚠ Out of Stock
                        </span>
                      )}
                      {product.current_stock > 0 && !product.cost_per_base_unit && (
                        <button
                          onClick={() => openAdjustModal(product)}
                          className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium hover:bg-amber-200 transition-colors"
                        >
                          ⚠ Set value
                        </button>
                      )}
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
                        {product.category === 'bar' ? `🍸 ${t('bar')}` : `🍳 ${t('kitchen')}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>
                        {t('currentStock')}: <strong className={product.current_stock <= 0 ? 'text-red-500' : 'text-[#6262bd]'}>{formatStock(product.current_stock, product.base_unit)}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        {t('inputUnit')}: <strong>{getUnitLabel(product.input_unit_type)}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        1 {product.input_unit_type} = {product.units_to_base_multiplier} {product.base_unit}
                      </span>
                      {product.product_tax_categories && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>
                            {t('tax')}: <strong className="text-purple-600">{product.product_tax_categories.name} ({product.product_tax_categories.rate}%)</strong>
                          </span>
                        </>
                      )}
                    </div>
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
                </div>
              ))}
            </div>
          )}

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <button
                onClick={deleteSelected}
                className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                Delete selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          {entries.length === 0 ? (
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
              <p className="text-slate-500">{t('noStockEntries')}</p>
            </div>
          ) : (
            <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b-2 border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">{t('date')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">{t('product')}</th>
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
              {editingProduct ? t('editProduct') : t('newProduct')}
            </h2>

            <form onSubmit={handleProductSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('productName')} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={productForm.name}
                    onChange={handleProductFormChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder={t('productNamePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('brand')}
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={productForm.brand}
                    onChange={handleProductFormChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder={t('brandPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('category')} *
                </label>
                <select
                  name="category"
                  value={productForm.category}
                  onChange={handleProductFormChange}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                >
                  <option value="kitchen">🍳 {t('kitchen')}</option>
                  <option value="bar">🍸 {t('bar')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('baseStorageUnit')} *
                  </label>
                  <select
                    name="base_unit"
                    value={productForm.base_unit}
                    onChange={handleProductFormChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  >
                    <option value="grams">{t('gramsForSolids')}</option>
                    <option value="ml">{t('mlForLiquids')}</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('baseUnitHelp')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('inputUnitType')} *
                  </label>
                  <select
                    name="input_unit_type"
                    value={productForm.input_unit_type}
                    onChange={handleProductFormChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  >
                    <optgroup label={t('weight')}>
                      <option value="kg">{t('kilograms')}</option>
                      <option value="grams">{t('grams')}</option>
                    </optgroup>
                    <optgroup label={t('volume')}>
                      <option value="liters">{t('liters')}</option>
                      <option value="ml">{t('milliliters')}</option>
                    </optgroup>
                    <optgroup label={t('countedItems')}>
                      <option value="bottles">{t('bottles')}</option>
                      <option value="cans">{t('cans')}</option>
                      <option value="units">{t('units')}</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('inputUnitHelp')}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('conversionFactor')} *
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
                  {t('conversionHelp').replace('{inputUnit}', productForm.input_unit_type).replace('{multiplier}', productForm.units_to_base_multiplier).replace('{baseUnit}', productForm.base_unit)}
                  {['bottles', 'cans', 'units'].includes(productForm.input_unit_type) && (
                    <span className="block mt-1">
                      {t('conversionExample')}
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('productTaxCategory')}
                </label>
                <select
                  name="tax_category_id"
                  value={productForm.tax_category_id}
                  onChange={handleProductFormChange}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                >
                  <option value="">{t('noTaxCategory')}</option>
                  {taxCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.rate}%)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {t('taxCategoryHelp')}
                  {taxCategories.length === 0 && (
                    <span className="block mt-1 text-amber-600">
                      {t('noTaxCategoriesAvailable')}
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
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-medium hover:bg-[#5252a3]"
                >
                  {editingProduct ? t('saveChanges') : t('createProduct')}
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
            <h2 className="text-xl font-bold text-slate-800 mb-4">{t('addStock')}</h2>

            {/* Tab toggle */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => setStockModalTab('add')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${stockModalTab === 'add' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t('addStock')}
              </button>
              <button
                type="button"
                onClick={() => setStockModalTab('adjust')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${stockModalTab === 'adjust' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t('adjustStockValue')}
              </button>
            </div>

            <form onSubmit={stockModalTab === 'add' ? handleStockSubmit : handleAdjustValue} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('selectProduct')} *
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
                    placeholder={t('searchOrSelectProduct')}
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
                            {t('noProductsFound')}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {stockForm.product_id && stockModalTab === 'add' && (
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
                        {t('purchasePrice')} *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                          {currencySymbol}
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
                        <strong>{t('totalStock')}:</strong> {(parseFloat(stockForm.quantity) * products.find(p => p.id === stockForm.product_id)?.units_to_base_multiplier).toFixed(2)} {products.find(p => p.id === stockForm.product_id)?.base_unit}
                      </p>
                      <p className="text-sm text-slate-700">
                        <strong>{t('costPerUnit').replace('{unit}', products.find(p => p.id === stockForm.product_id)?.base_unit)}:</strong> {(() => { const v = parseFloat(stockForm.purchase_price) / (parseFloat(stockForm.quantity) * products.find(p => p.id === stockForm.product_id)?.units_to_base_multiplier); return `${currencySymbol}${v < 0.1 ? v.toFixed(4) : v.toFixed(2)}`; })()}
                      </p>
                    </div>
                  )}

                  {/* Invoice Selection (Optional) */}
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

              {stockForm.product_id && stockModalTab === 'adjust' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                    {t('adjustStockValueNote')}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {t('currentStockQty')} *
                      </label>
                      <div className="relative">
                        {(() => {
                          const p = products.find(pr => pr.id === stockForm.product_id)
                          const currentInInputUnit = p ? ((p.current_stock || 0) / (p.units_to_base_multiplier || 1)).toFixed(2) : '0'
                          return <>
                            <input
                              type="number"
                              value={adjustForm.current_stock}
                              onChange={(e) => setAdjustForm({ ...adjustForm, current_stock: e.target.value })}
                              required
                              step="0.01"
                              min="0"
                              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                              placeholder={currentInInputUnit}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-xs">
                              {p?.input_unit_type}
                            </span>
                          </>
                        })()}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {t('currentStockValue')} *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          value={adjustForm.current_stock_value}
                          onChange={(e) => setAdjustForm({ ...adjustForm, current_stock_value: e.target.value })}
                          required
                          step="0.01"
                          min="0"
                          className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {adjustForm.current_stock && adjustForm.current_stock_value && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-slate-700">
                        {(() => {
                          const p = products.find(pr => pr.id === stockForm.product_id)
                          const qty = parseFloat(adjustForm.current_stock)
                          const val = parseFloat(adjustForm.current_stock_value)
                          if (!qty || !val || !p) return '—'
                          const multiplier = parseFloat(p.units_to_base_multiplier || 1)
                          const costPerInputUnit = val / qty
                          const unit = p.input_unit_type
                          return <><strong>{t('costPerUnit').replace('{unit}', unit)}:</strong>{' '}{currencySymbol}{costPerInputUnit < 0.1 ? costPerInputUnit.toFixed(4) : costPerInputUnit.toFixed(2)}</>
                        })()}
                      </p>
                    </div>
                  )}
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
                  className={`flex-1 text-white py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${stockModalTab === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-[#6262bd] hover:bg-[#5252a3]'}`}
                >
                  {stockModalTab === 'add' ? t('addStock') : t('saveAdjustment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
