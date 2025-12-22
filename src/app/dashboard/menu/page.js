'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
export default function Menu() {
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [stockProducts, setStockProducts] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    available: true,
    image_url: '',
    department: 'kitchen',
    dynamic_pricing_enabled: false,
    base_cost: '',
    profit_margin_percentage: 100,
    price_rounding_mode: 'none'
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  // Recipe management
  const [recipeIngredients, setRecipeIngredients] = useState([])
  const [showRecipeSection, setShowRecipeSection] = useState(false)
  const [ingredientSearches, setIngredientSearches] = useState({}) // Store search query for each ingredient
  const [showDropdowns, setShowDropdowns] = useState({}) // Track which dropdowns are open
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterAvailability, setFilterAvailability] = useState('all')
  const [sortBy, setSortBy] = useState('name') // 'name', 'price-low', 'price-high', 'stock'
  useEffect(() => {
    fetchData()
  }, [])
  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!restaurant) return
    // Subscribe to menu items changes
    const menuChannel = supabase
      .channel('menu-items-realtime')
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
    // Subscribe to stock changes to update availability badges
    const stockChannel = supabase
      .channel('stock-realtime')
      .on('postgres_changes', {
          event: 'UPDATE',
          table: 'stock_products',
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
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close all dropdowns if click is outside
      if (!event.target.closest('.ingredient-dropdown-container')) {
        setShowDropdowns({})
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
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
    } else {
      // Check if staff by user_id (preferred) or email (fallback)
      const { data: staffRecords } = await supabase
        .from('staff')
        .select('*, restaurants(*)')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .eq('status', 'active')
      const staffRecord = staffRecords && staffRecords.length > 0 ? staffRecords[0] : null
      if (staffRecord && staffRecord.restaurants) {
        restaurantData = staffRecord.restaurants
      }
    }
    if (!restaurantData) {
      setLoading(false)
      return
    }
    setRestaurant(restaurantData)
    // Fetch menu items with ingredients, dynamic pricing data, and cost info
    const { data: items } = await supabase
      .from('menu_items')
      .select(`
        *,
        menu_categories(name),
        menu_item_ingredients(
          id,
          quantity_needed,
          stock_products(id, name, brand, base_unit, current_stock, cost_per_base_unit)
        )
      `)
      .eq('restaurant_id', restaurantData.id)
      .order('sort_order')
    const { data: cats } = await supabase
      .from('menu_categories')
      .select('*')
    // Fetch stock products for recipe management with cost data
    const { data: products } = await supabase
      .from('stock_products')
      .select('*')
      .order('name')
    setMenuItems(items || [])
    setCategories(cats || [])
    setStockProducts(products || [])
    setLoading(false)
  }
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }
  // Calculate base cost from recipe ingredients
  const calculateBaseCost = () => {
    if (!recipeIngredients || recipeIngredients.length === 0) {
      return 0
    }
    let totalCost = 0
    for (const ingredient of recipeIngredients) {
      if (!ingredient.stock_product_id || !ingredient.quantity_needed) continue
      const product = stockProducts.find(p => p.id === ingredient.stock_product_id)
      if (!product || !product.cost_per_base_unit) continue
      const ingredientCost = parseFloat(ingredient.quantity_needed) * parseFloat(product.cost_per_base_unit)
      totalCost += ingredientCost
    }
    return totalCost
  }
  // Apply price rounding based on mode
  const applyPriceRounding = (price, mode) => {
    if (mode === 'whole') {
      // Round to nearest whole number
      return Math.round(price)
    } else if (mode === 'half') {
      // Round to nearest 0.5
      return Math.round(price * 2) / 2
    }
    // No rounding
    return price
  }
  // Calculate dynamic price preview (before rounding)
  const calculateDynamicPriceBeforeRounding = () => {
    const baseCost = formData.dynamic_pricing_enabled ? calculateBaseCost() : (parseFloat(formData.base_cost) || 0)
    const profitMargin = parseFloat(formData.profit_margin_percentage) || 0
    if (baseCost > 0 && profitMargin >= 0) {
      return baseCost + (baseCost * (profitMargin / 100))
    }
    return 0
  }
  // Calculate dynamic price preview (with rounding)
  const calculateDynamicPrice = () => {
    const priceBeforeRounding = calculateDynamicPriceBeforeRounding()
    return applyPriceRounding(priceBeforeRounding, formData.price_rounding_mode)
  }
  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }
  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        description: item.description || '',
        price: item.price,
        category_id: item.category_id || '',
        available: item.available,
        image_url: item.image_url || '',
        department: item.department || 'kitchen',
        dynamic_pricing_enabled: item.dynamic_pricing_enabled || false,
        base_cost: item.base_cost || '',
        profit_margin_percentage: item.profit_margin_percentage || 100,
        price_rounding_mode: item.price_rounding_mode || 'none'
      })
      setImagePreview(item.image_url || null)
      setImageFile(null)
      // Load recipe ingredients
      if (item.menu_item_ingredients && item.menu_item_ingredients.length > 0) {
        setRecipeIngredients(
          item.menu_item_ingredients.map(ing => ({
            id: ing.id,
            stock_product_id: ing.stock_products.id,
            quantity_needed: ing.quantity_needed
          }))
        )
        setShowRecipeSection(true)
      } else {
        setRecipeIngredients([])
        setShowRecipeSection(false)
      }
    } else {
      setEditingItem(null)
      setFormData({
        name: '',
        description: '',
        price: '',
        category_id: '',
        available: true,
        image_url: '',
        department: 'kitchen',
        dynamic_pricing_enabled: false,
        base_cost: '',
        profit_margin_percentage: 100,
        price_rounding_mode: 'none'
      })
      setImagePreview(null)
      setRecipeIngredients([])
      setShowRecipeSection(false)
    }
    setShowModal(true)
  }
  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setRecipeIngredients([])
    setShowRecipeSection(false)
    setIngredientSearches({})
    setShowDropdowns({})
  }
  const addIngredient = () => {
    const newIndex = recipeIngredients.length
    setRecipeIngredients([
      ...recipeIngredients,
      { stock_product_id: '', quantity_needed: '' }
    ])
    setIngredientSearches({ ...ingredientSearches, [newIndex]: '' })
  }
  const removeIngredient = (index) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index))
    // Clean up search state for this ingredient
    const newSearches = { ...ingredientSearches }
    delete newSearches[index]
    setIngredientSearches(newSearches)
    const newDropdowns = { ...showDropdowns }
    delete newDropdowns[index]
    setShowDropdowns(newDropdowns)
  }
  const updateIngredient = (index, field, value) => {
    const updated = [...recipeIngredients]
    updated[index][field] = value
    setRecipeIngredients(updated)
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)
    let imageUrl = formData.image_url
    // Upload new image if selected
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${restaurant.id}/${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('menu-items')
        .upload(fileName, imageFile)
      if (uploadError) {
        console.error('Upload error:', uploadError)
        if (uploadError.message.includes('not found')) {
          alert('Storage bucket not found. Please create the "menu-items" bucket in Supabase Storage first. See SETUP_IMAGES.md for instructions.')
        } else if (uploadError.message.includes('policy')) {
          alert('Permission denied. Please set up storage policies. See SETUP_IMAGES.md for instructions.')
        } else {
          alert(`Failed to upload image: ${uploadError.message}`)
        }
        setUploading(false)
        return
      }
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .getPublicUrl(fileName)
      imageUrl = publicUrl
      // Delete old image if editing and had an old image
      if (editingItem?.image_url) {
        const oldPath = editingItem.image_url.split('/menu-items/')[1]
        if (oldPath) {
          await supabase.storage.from('menu-items').remove([oldPath])
        }
      }
    }
    const calculatedBaseCost = calculateBaseCost()
    const itemData = {
      restaurant_id: restaurant.id,
      name: formData.name,
      description: formData.description,
      price: formData.dynamic_pricing_enabled ? calculateDynamicPrice() : parseFloat(formData.price),
      category_id: formData.category_id || null,
      available: formData.available,
      image_url: imageUrl,
      department: formData.department,
      dynamic_pricing_enabled: formData.dynamic_pricing_enabled,
      base_cost: formData.dynamic_pricing_enabled ? calculatedBaseCost : null,
      profit_margin_percentage: formData.dynamic_pricing_enabled ? parseFloat(formData.profit_margin_percentage) : null,
      calculated_price: formData.dynamic_pricing_enabled ? calculateDynamicPrice() : null,
      price_rounding_mode: formData.dynamic_pricing_enabled ? formData.price_rounding_mode : 'none'
    }
    let menuItemId
    if (editingItem) {
      await supabase
        .from('menu_items')
        .update(itemData)
        .eq('id', editingItem.id)
      menuItemId = editingItem.id
    } else {
      const { data: newItem } = await supabase
        .from('menu_items')
        .insert(itemData)
        .select()
        .single()
      menuItemId = newItem.id
    }
    // Save recipe ingredients
    if (showRecipeSection && menuItemId) {
      // Delete existing ingredients
      await supabase
        .from('menu_item_ingredients')
        .delete()
        .eq('menu_item_id', menuItemId)
      // Insert new ingredients
      const validIngredients = recipeIngredients.filter(
        ing => ing.stock_product_id && ing.quantity_needed > 0
      )
      if (validIngredients.length > 0) {
        await supabase
          .from('menu_item_ingredients')
          .insert(
            validIngredients.map(ing => ({
              menu_item_id: menuItemId,
              stock_product_id: ing.stock_product_id,
              quantity_needed: parseFloat(ing.quantity_needed)
            }))
          )
      }
    }
    setUploading(false)
    closeModal()
  }
  const deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    // Find the item to get its image URL
    const item = menuItems.find(i => i.id === id)
    // Delete image from storage if it exists
    if (item?.image_url) {
      const imagePath = item.image_url.split('/menu-items/')[1]
      if (imagePath) {
        await supabase.storage.from('menu-items').remove([imagePath])
      }
    }
    await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)
  }
  const toggleAvailability = async (item) => {
    await supabase
      .from('menu_items')
      .update({ available: !item.available })
      .eq('id', item.id)
  }
  const getStockStatus = (item) => {
  if (!item.menu_item_ingredients || item.menu_item_ingredients.length === 0) {
    return { status: 'no_recipe', message: 'No recipe', color: 'slate' }
  } // ✅ MISSING BRACE

    let minServings = Infinity
    let hasOutOfStock = false
    for (const ing of item.menu_item_ingredients) {
      const product = ing.stock_products
      if (!product) continue
      const availableServings = Math.floor(product.current_stock / ing.quantity_needed)
      minServings = Math.min(minServings, availableServings)
      if (product.current_stock < ing.quantity_needed) {
        hasOutOfStock = true
      }
    }
    if (hasOutOfStock || minServings === 0) {
      return { status: 'out_of_stock', message: 'Out of stock', color: 'red', servings: 0 }
    } else if (minServings < 5) {
      return { status: 'low_stock', message: `Low stock (${minServings} left)`, color: 'amber', servings: minServings }
    }
    return { status: 'in_stock', message: `${minServings} available`, color: 'green', servings: minServings }
  }
  const formatStockAmount = (amount, unit) => {
    if (amount >= 1000 && unit === 'grams') {
      return `${(amount / 1000).toFixed(2)} kg`
    }
    if (amount >= 1000 && unit === 'ml') {
      return `${(amount / 1000).toFixed(2)} L`
    }
    return `${amount.toFixed(0)} ${unit}`
  }
  // Filter and search menu items
  const filteredMenuItems = menuItems
    .filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = item.name.toLowerCase().includes(query)
        const matchesDescription = item.description?.toLowerCase().includes(query)
        if (!(matchesName || matchesDescription)) return false
      }
      // Department filter
      if (filterDepartment !== 'all' && item.department !== filterDepartment) return false
      // Availability filter
      if (filterAvailability === 'available' && !item.available) return false
      if (filterAvailability === 'unavailable' && item.available) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'price-low') {
        return a.price - b.price
      } else if (sortBy === 'price-high') {
        return b.price - a.price
      } else if (sortBy === 'stock') {
        const aStatus = getStockStatus(a)
        const bStatus = getStockStatus(b)
        // Sort by stock status priority: out of stock, low stock, in stock, no recipe
        const priority = { 'out_of_stock': 0, 'low_stock': 1, 'in_stock': 2, 'no_recipe': 3 }
        return priority[aStatus.status] - priority[bStatus.status]
      }
      return 0
    })
  // Calculate stats
  const stats = {
    total: menuItems.length,
    available: menuItems.filter(i => i.available).length,
    unavailable: menuItems.filter(i => !i.available).length,
    withRecipes: menuItems.filter(i => i.menu_item_ingredients && i.menu_item_ingredients.length > 0).length,
    outOfStock: menuItems.filter(i => {
      const status = getStockStatus(i)
      return status.status === 'out_of_stock'
    }).length,
    kitchen: menuItems.filter(i => i.department === 'kitchen').length,
    bar: menuItems.filter(i => i.department === 'bar').length
  }
  if (loading) {
    return <div className="text-slate-500">Loading menu...</div>
  }
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Menu</h1>
          <p className="text-slate-500">Manage your menu items and recipes</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#6262bd] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Add Item
        </button>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
          <p className="text-slate-500 text-sm font-medium mb-1">Total Items</p>
          <p className="text-2xl font-bold text-[#6262bd]">{stats.total}</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
          <p className="text-slate-500 text-sm font-medium mb-1">Available</p>
          <p className="text-2xl font-bold text-green-600">{stats.available}</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
          <p className="text-slate-500 text-sm font-medium mb-1">With Recipes</p>
          <p className="text-2xl font-bold text-blue-600">{stats.withRecipes}</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
          <p className="text-slate-500 text-sm font-medium mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
        </div>
      </div>
      {/* Search and Filter Bar */}
      <div className="mb-6 flex gap-3">
        <div className="flex-1 relative">
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items by name or description..."
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
          <option value="price-low">Sort: Price (Low)</option>
          <option value="price-high">Sort: Price (High)</option>
          <option value="stock">Sort: Stock Status</option>
        </select>
      </div>
      {/* Filter Buttons */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilterDepartment('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterDepartment === 'all'
              ? 'bg-[#6262bd] text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterDepartment('kitchen')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterDepartment === 'kitchen'
              ? 'bg-green-600 text-white'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          🍳 Kitchen
        </button>
        <button
          onClick={() => setFilterDepartment('bar')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterDepartment === 'bar'
              ? 'bg-orange-600 text-white'
              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          }`}
        >
          🍸 Bar
        </button>
        <div className="w-px bg-slate-200 mx-2"></div>
        <button
          onClick={() => setFilterAvailability('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterAvailability === 'all'
              ? 'bg-slate-700 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Status
        </button>
        <button
          onClick={() => setFilterAvailability('available')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterAvailability === 'available'
              ? 'bg-green-600 text-white'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          Available
        </button>
        <button
          onClick={() => setFilterAvailability('unavailable')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterAvailability === 'unavailable'
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          Unavailable
        </button>
      </div>
      {/* Results Count */}
      {(searchQuery || filterDepartment !== 'all' || filterAvailability !== 'all') && menuItems.length > 0 && (
        <div className="mb-4 text-sm text-slate-600">
          Showing <strong>{filteredMenuItems.length}</strong> of <strong>{menuItems.length}</strong> items
        </div>
      )}
      {/* Menu Items */}
      {filteredMenuItems.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              {searchQuery || filterDepartment !== 'all' || filterAvailability !== 'all' ? (
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              ) : (
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              )}
            </svg>
          </div>
          {searchQuery || filterDepartment !== 'all' || filterAvailability !== 'all' ? (
            <>
              <p className="text-slate-500 mb-2">No items found</p>
              <p className="text-sm text-slate-400 mb-4">
                Try adjusting your search or filters
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterDepartment('all')
                  setFilterAvailability('all')
                }}
                className="text-[#6262bd] font-medium hover:underline"
              >
                Clear all filters
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-500 mb-4">No menu items yet</p>
              <button
                onClick={() => openModal()}
                className="text-[#6262bd] font-medium hover:underline"
              >
                Add your first item
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMenuItems.map((item) => {
            const stockStatus = getStockStatus(item)
            return (
              <div
                key={item.id}
                className={`bg-white border-2 rounded-2xl p-6 ${
                  item.available ? 'border-slate-100' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-24 h-24 rounded-xl object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className={`text-lg font-semibold ${item.available ? 'text-slate-800' : 'text-slate-400'}`}>
                        {item.name}
                      </h3>
                      {!item.available && (
                        <span className="px-2 py-1 bg-slate-200 text-slate-500 text-xs rounded-full font-medium">
                          Unavailable
                        </span>
                      )}
                      {item.menu_categories?.name && (
                        <span className="px-2 py-1 bg-[#6262bd]/10 text-[#6262bd] text-xs rounded-full font-medium">
                          {item.menu_categories.name}
                        </span>
                      )}
                      {item.department && (
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          item.department === 'bar'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {item.department === 'bar' ? '🍸 Bar' : '🍳 Kitchen'}
                        </span>
                      )}
                      {/* Stock Status Badge */}
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        stockStatus.color === 'red' ? 'bg-red-100 text-red-700' :
                        stockStatus.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                        stockStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {stockStatus.message}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-slate-500 text-sm mb-2">{item.description}</p>
                    )}
                    {/* Recipe Display */}
                    {item.menu_item_ingredients && item.menu_item_ingredients.length > 0 && (
                      <div className="mt-2 mb-2">
                        <p className="text-xs font-medium text-slate-600 mb-1">Recipe:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.menu_item_ingredients.map((ing, idx) => {
                            const product = ing.stock_products
                            const hasEnough = product.current_stock >= ing.quantity_needed
                            return (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-1 rounded ${
                                  hasEnough
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-red-50 text-red-700 font-medium'
                                }`}
                              >
                                {formatStockAmount(ing.quantity_needed, product.base_unit)} {product.name}
                                {!hasEnough && ' ⚠️'}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-[#6262bd]">£{item.price?.toFixed(2)}</p>
                      {item.dynamic_pricing_enabled && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium" title={`Base cost: £${item.base_cost?.toFixed(2)} + ${item.profit_margin_percentage}% margin`}>
                          Auto Priced
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAvailability(item)}
                      className={`p-2 rounded-xl ${
                        item.available
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                      title={item.available ? 'Mark unavailable' : 'Mark available'}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        {item.available ? (
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        ) : (
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => openModal(item)}
                      className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-3xl my-8 mx-4 max-h-[calc(100vh-4rem)] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-400"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Item Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder="Margherita Pizza"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Price (£)
                    {formData.dynamic_pricing_enabled && (
                      <span className="text-xs text-purple-600 ml-2">(Auto-calculated)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.dynamic_pricing_enabled ? calculateDynamicPrice().toFixed(2) : formData.price}
                    onChange={handleChange}
                    required={!formData.dynamic_pricing_enabled}
                    disabled={formData.dynamic_pricing_enabled}
                    step="0.01"
                    min="0"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none text-slate-700 ${
                      formData.dynamic_pricing_enabled
                        ? 'border-purple-200 bg-purple-50 cursor-not-allowed'
                        : 'border-slate-200 focus:border-[#6262bd]'
                    }`}
                    placeholder="9.99"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
                  placeholder="Fresh tomatoes, mozzarella, basil..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Item Image
                </label>
                {imagePreview && (
                  <div className="mb-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-xl object-cover"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#6262bd] file:text-white hover:file:bg-[#5252a3] file:cursor-pointer"
                />
              </div>
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category
                  </label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                >
                  <option value="kitchen">Kitchen</option>
                  <option value="bar">Bar</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="available"
                  checked={formData.available}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-300 text-[#6262bd] focus:ring-[#6262bd]"
                />
                <label className="text-sm font-medium text-slate-700">
                  Available for ordering
                </label>
              </div>
              {/* Dynamic Pricing Section */}
              <div className="border-t-2 border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Dynamic Pricing</h3>
                    <p className="text-sm text-slate-500">Automatically calculate price based on cost and margin</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="dynamic_pricing_enabled"
                      checked={formData.dynamic_pricing_enabled}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-slate-300 text-[#6262bd] focus:ring-[#6262bd]"
                    />
                    <label className="text-sm font-medium text-slate-700">
                      Enable
                    </label>
                  </div>
                </div>
                {formData.dynamic_pricing_enabled && (
                  <div className="space-y-4 bg-blue-50 p-4 rounded-xl">
                    {/* Base Cost Display (Auto-calculated from Recipe) */}
                    {recipeIngredients.length > 0 ? (
                      <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Base Cost (Auto-calculated)</p>
                            <p className="text-xs text-slate-500">Based on recipe ingredient costs</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-800">
                              £{calculateBaseCost().toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {/* Ingredient Breakdown */}
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs font-medium text-slate-600 mb-2">Ingredient Costs:</p>
                          <div className="space-y-1">
                            {recipeIngredients.map((ingredient, idx) => {
                              const product = stockProducts.find(p => p.id === ingredient.stock_product_id)
                              if (!product || !ingredient.quantity_needed) return null
                              const cost = parseFloat(ingredient.quantity_needed) * parseFloat(product.cost_per_base_unit || 0)
                              return (
                                <div key={idx} className="flex justify-between text-xs text-slate-600">
                                  <span>{product.name}</span>
                                  <span>£{cost.toFixed(2)}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                        <p className="text-sm font-medium text-amber-700 mb-1">No Recipe Added</p>
                        <p className="text-xs text-amber-600">
                          Add recipe ingredients below to automatically calculate the base cost for dynamic pricing.
                        </p>
                      </div>
                    )}
                    {/* Profit Margin and Rounding Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Profit Margin (%)
                        </label>
                        <input
                          type="number"
                          name="profit_margin_percentage"
                          value={formData.profit_margin_percentage}
                          onChange={handleChange}
                          required={formData.dynamic_pricing_enabled}
                          step="1"
                          min="0"
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                          placeholder="150"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          E.g., 150% = £2.50 cost → £6.25 price
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Price Rounding
                        </label>
                        <select
                          name="price_rounding_mode"
                          value={formData.price_rounding_mode}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                        >
                          <option value="none">No Rounding</option>
                          <option value="half">Round to £0.50</option>
                          <option value="whole">Round to £1.00</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                          Make prices customer-friendly
                        </p>
                      </div>
                    </div>
                    {/* Calculated Price Preview */}
                    {calculateBaseCost() > 0 && formData.profit_margin_percentage !== '' && (
                      <div className="bg-white border-2 border-blue-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-600 mb-1">Calculated Selling Price</p>
                            <p className="text-xs text-slate-500">
                              £{calculateBaseCost().toFixed(2)} + ({formData.profit_margin_percentage}% margin)
                            </p>
                            {formData.price_rounding_mode !== 'none' && (
                              <p className="text-xs text-slate-400 mt-1">
                                Before rounding: £{calculateDynamicPriceBeforeRounding().toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-[#6262bd]">
                              £{calculateDynamicPrice().toFixed(2)}
                            </p>
                            {formData.price_rounding_mode !== 'none' && (
                              <p className="text-xs text-green-600 font-medium mt-1">
                                {formData.price_rounding_mode === 'whole' ? 'Rounded to nearest £1' : 'Rounded to nearest £0.50'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bg-blue-100 border-2 border-blue-200 rounded-xl p-3">
                      <p className="text-xs text-blue-700 font-medium mb-1">How it works:</p>
                      <p className="text-xs text-blue-600">
                        The base cost is automatically calculated from your recipe ingredients&apos; purchase prices.
                        <br />
                        Selling Price = Base Cost + (Base Cost × Profit Margin %)
                        <br />
                        Example: £0.50 cost with 200% margin = £0.50 + (£0.50 × 2) = £1.50
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {/* Recipe Section */}
              <div className="border-t-2 border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Add Product Content/Recipe</h3>
                    <p className="text-sm text-slate-500">Link this item to stock ingredients</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRecipeSection(!showRecipeSection)}
                    className="text-[#6262bd] font-medium hover:underline"
                  >
                    {showRecipeSection ? 'Hide' : 'Add Content'}
                  </button>
                </div>
                {showRecipeSection && (
                  <div className="space-y-3">
                    {recipeIngredients.map((ingredient, index) => {
                      // Filter stock products based on search query for this ingredient
                      const searchQuery = (ingredientSearches[index] || '').toLowerCase()
                      const filteredProducts = stockProducts.filter(product => {
                        const searchText = `${product.name} ${product.brand || ''} ${product.base_unit}`.toLowerCase()
                        return searchText.includes(searchQuery)
                      })
                      // Get selected product name for display
                      const selectedProduct = stockProducts.find(p => p.id === ingredient.stock_product_id)
                      const displayValue = selectedProduct
                        ? `${selectedProduct.name} ${selectedProduct.brand ? `(${selectedProduct.brand})` : ''} - ${selectedProduct.base_unit}`
                        : ''
                      return (
                        <div key={index} className="flex gap-3 items-start">
                          <div className="flex-1 relative ingredient-dropdown-container">
                            {/* Search/Select Input */}
                            <input
                              type="text"
                              value={showDropdowns[index] ? (ingredientSearches[index] || '') : displayValue}
                              onChange={(e) => {
                                setIngredientSearches({ ...ingredientSearches, [index]: e.target.value })
                                setShowDropdowns({ ...showDropdowns, [index]: true })
                                // Clear selection when typing
                                if (ingredient.stock_product_id) {
                                  updateIngredient(index, 'stock_product_id', '')
                                }
                              }}
                              onFocus={() => {
                                setIngredientSearches({ ...ingredientSearches, [index]: '' })
                                setShowDropdowns({ ...showDropdowns, [index]: true })
                              }}
                              placeholder="Search or select ingredient..."
                              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                            />
                            {/* Dropdown List */}
                            {showDropdowns[index] && (
                              <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                {filteredProducts.length > 0 ? (
                                  filteredProducts.map((product) => (
                                    <div
                                      key={product.id}
                                      onClick={() => {
                                        updateIngredient(index, 'stock_product_id', product.id)
                                        setShowDropdowns({ ...showDropdowns, [index]: false })
                                        setIngredientSearches({ ...ingredientSearches, [index]: '' })
                                      }}
                                      className="px-4 py-2 hover:bg-[#6262bd] hover:text-white cursor-pointer transition-colors"
                                    >
                                      {product.name} {product.brand ? `(${product.brand})` : ''} - {product.base_unit}
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-4 py-2 text-slate-400 text-sm">
                                    No ingredients found
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Hidden required input for form validation */}
                            <input
                              type="hidden"
                              value={ingredient.stock_product_id}
                              required
                            />
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              value={ingredient.quantity_needed}
                              onChange={(e) => updateIngredient(index, 'quantity_needed', e.target.value)}
                              required
                              step="0.01"
                              min="0.01"
                              placeholder="Amount"
                              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-[#6262bd] hover:text-[#6262bd] font-medium"
                    >
                      + Add Ingredient
                    </button>
                    {stockProducts.length === 0 && (
                      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
                        No stock products available. Please add stock products first in the Stock section.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={uploading}
                  className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-medium hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Saving...' : (editingItem ? 'Save Changes' : 'Add Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
