'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslations } from '@/lib/i18n/LanguageContext'

export default function PurchasingInvoices() {
  const t = useTranslations('purchasingInvoices')
  const [invoices, setInvoices] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Date filter states
  const [dateFilter, setDateFilter] = useState('all') // all, today, this-week, this-month, custom
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [linkedItems, setLinkedItems] = useState([])

  // Image upload states
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [uploading, setUploading] = useState(false)

  // Form data
  const [invoiceForm, setInvoiceForm] = useState({
    reference_number: '',
    supplier_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    notes: '',
    total_amount: '',
    image_urls: []
  })

  useEffect(() => {
    fetchData()
  }, [])

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

    // Fetch invoices
    const { data: invoicesData } = await supabase
      .from('purchasing_invoices')
      .select('*')
      .eq('restaurant_id', restaurantData.id)
      .order('invoice_date', { ascending: false })

    setInvoices(invoicesData || [])
    setLoading(false)
  }

  const openInvoiceModal = (invoice = null) => {
    if (invoice) {
      setEditingInvoice(invoice)
      setInvoiceForm({
        reference_number: invoice.reference_number,
        supplier_name: invoice.supplier_name || '',
        invoice_date: invoice.invoice_date,
        notes: invoice.notes || '',
        total_amount: invoice.total_amount || '',
        image_urls: invoice.image_urls || []
      })
      setImagePreviews(invoice.image_urls || [])
    } else {
      setEditingInvoice(null)
      setInvoiceForm({
        reference_number: '',
        supplier_name: '',
        invoice_date: new Date().toISOString().split('T')[0],
        notes: '',
        total_amount: '',
        image_urls: []
      })
      setImagePreviews([])
    }
    setImageFiles([])
    setShowInvoiceModal(true)
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Add to existing files
    setImageFiles(prev => [...prev, ...files])

    // Create previews for new files
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    // Check if it's an existing image URL or a new file
    const existingUrlCount = invoiceForm.image_urls.length

    if (index < existingUrlCount) {
      // Remove from existing URLs
      setInvoiceForm(prev => ({
        ...prev,
        image_urls: prev.image_urls.filter((_, i) => i !== index)
      }))
    } else {
      // Remove from new files
      const fileIndex = index - existingUrlCount
      setImageFiles(prev => prev.filter((_, i) => i !== fileIndex))
    }

    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async () => {
    if (imageFiles.length === 0) return invoiceForm.image_urls

    const uploadedUrls = [...invoiceForm.image_urls]

    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${restaurant.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('purchasing-invoices')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
          alert('Storage bucket not found. Please create a "purchasing-invoices" bucket in Supabase.')
        }
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('purchasing-invoices')
        .getPublicUrl(fileName)

      uploadedUrls.push(publicUrl)
    }

    return uploadedUrls
  }

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)

    try {
      // Upload any new images
      const allImageUrls = await uploadImages()

      const invoiceData = {
        restaurant_id: restaurant.id,
        reference_number: invoiceForm.reference_number,
        supplier_name: invoiceForm.supplier_name || null,
        invoice_date: invoiceForm.invoice_date,
        notes: invoiceForm.notes || null,
        total_amount: invoiceForm.total_amount ? parseFloat(invoiceForm.total_amount) : null,
        image_urls: allImageUrls,
        created_by_email: userEmail
      }

      if (editingInvoice) {
        await supabase
          .from('purchasing_invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id)
      } else {
        await supabase
          .from('purchasing_invoices')
          .insert(invoiceData)
      }

      setShowInvoiceModal(false)
      setImageFiles([])
      setImagePreviews([])
      fetchData()
    } catch (error) {
      console.error('Error saving invoice:', error)
      alert('Failed to save invoice: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const viewInvoiceDetails = async (invoice) => {
    setViewingInvoice(invoice)

    // Fetch linked stock entries from both tables
    const [foodStockRes, inventoryRes] = await Promise.all([
      supabase
        .from('stock_entries')
        .select('*, stock_products(name, brand)')
        .eq('purchasing_invoice_id', invoice.id),
      supabase
        .from('inventory_entries')
        .select('*, inventory_products(name, brand)')
        .eq('purchasing_invoice_id', invoice.id)
    ])

    const foodItems = (foodStockRes.data || []).map(item => ({
      ...item,
      type: 'food',
      productName: item.stock_products?.name,
      productBrand: item.stock_products?.brand
    }))

    const inventoryItems = (inventoryRes.data || []).map(item => ({
      ...item,
      type: 'inventory',
      productName: item.inventory_products?.name,
      productBrand: item.inventory_products?.brand
    }))

    setLinkedItems([...foodItems, ...inventoryItems].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    ))

    setShowDetailModal(true)
  }

  const deleteInvoice = async (id) => {
    if (!confirm(t('confirmDelete'))) return

    // Delete associated images from storage
    const invoice = invoices.find(inv => inv.id === id)
    if (invoice?.image_urls?.length > 0) {
      for (const url of invoice.image_urls) {
        const path = url.split('/purchasing-invoices/')[1]
        if (path) {
          await supabase.storage.from('purchasing-invoices').remove([path])
        }
      }
    }

    await supabase
      .from('purchasing_invoices')
      .delete()
      .eq('id', id)

    fetchData()
  }

  // Helper function to check if date is within range
  const isDateInRange = (invoiceDate) => {
    const date = new Date(invoiceDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (dateFilter) {
      case 'today':
        const todayStr = today.toISOString().split('T')[0]
        return invoiceDate === todayStr
      case 'this-week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return date >= weekStart && date <= weekEnd
      case 'this-month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        return date >= monthStart && date <= monthEnd
      case 'custom':
        if (!customStartDate && !customEndDate) return true
        const start = customStartDate ? new Date(customStartDate) : new Date(0)
        const end = customEndDate ? new Date(customEndDate) : new Date('2099-12-31')
        return date >= start && date <= end
      default:
        return true
    }
  }

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    // Date filter
    if (!isDateInRange(inv.invoice_date)) return false

    // Search filter
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      inv.reference_number.toLowerCase().includes(query) ||
      inv.supplier_name?.toLowerCase().includes(query)
    )
  })

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
        <button
          onClick={() => openInvoiceModal()}
          className="bg-[#6262bd] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          {t('addInvoice')}
        </button>
      </div>

      {/* Search and Date Filter */}
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[250px] max-w-md">
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
        </div>

        {/* Date Filter Dropdown */}
        <div className="flex items-center gap-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 bg-white"
          >
            <option value="all">{t('allDates')}</option>
            <option value="today">{t('today')}</option>
            <option value="this-week">{t('thisWeek')}</option>
            <option value="this-month">{t('thisMonth')}</option>
            <option value="custom">{t('customRange')}</option>
          </select>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                placeholder={t('startDate')}
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                placeholder={t('endDate')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </div>
          <p className="text-slate-500 mb-4">{t('noInvoicesYet')}</p>
          <button
            onClick={() => openInvoiceModal()}
            className="text-[#6262bd] font-medium hover:underline"
          >
            {t('addFirstInvoice')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white border-2 border-slate-100 rounded-2xl p-6 flex justify-between items-center"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {invoice.reference_number}
                  </h3>
                  {invoice.supplier_name && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
                      {invoice.supplier_name}
                    </span>
                  )}
                  {invoice.image_urls?.length > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      {invoice.image_urls.length} {t('images')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span>
                    {t('invoiceDate')}: <strong>{new Date(invoice.invoice_date).toLocaleDateString()}</strong>
                  </span>
                  {invoice.total_amount && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>
                        {t('amount')}: <strong className="text-green-600">£{parseFloat(invoice.total_amount).toFixed(2)}</strong>
                      </span>
                    </>
                  )}
                  <span className="text-slate-300">•</span>
                  <span>
                    {t('createdBy')}: {invoice.created_by_email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => viewInvoiceDetails(invoice)}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100"
                >
                  {t('viewDetails')}
                </button>
                <button
                  onClick={() => openInvoiceModal(invoice)}
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button
                  onClick={() => deleteInvoice(invoice.id)}
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

      {/* New/Edit Invoice Modal */}
      {showInvoiceModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {editingInvoice ? t('editInvoice') : t('createInvoice')}
            </h2>

            <form onSubmit={handleInvoiceSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('referenceNumber')} *
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.reference_number}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, reference_number: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder={t('referenceNumberPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('invoiceDate')} *
                  </label>
                  <input
                    type="date"
                    value={invoiceForm.invoice_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('supplierName')}
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.supplier_name}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, supplier_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                    placeholder={t('supplierNamePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('totalAmount')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">£</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={invoiceForm.total_amount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, total_amount: e.target.value })}
                      className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('invoiceImages')}
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4">
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex flex-col items-center cursor-pointer">
                    <svg className="w-8 h-8 text-slate-400 mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z"/>
                    </svg>
                    <span className="text-sm text-slate-500">{t('uploadImages')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-400 text-center mt-2">{t('imagesHelp')}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('notes')}
                </label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
                  placeholder={t('notesPlaceholder')}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-medium hover:bg-[#5252a3] disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : (editingInvoice ? t('saveInvoice') : t('createInvoice'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetailModal && viewingInvoice && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{t('invoiceDetails')}</h2>
                <p className="text-slate-500">{viewingInvoice.reference_number}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm text-slate-500">{t('supplier')}</p>
                <p className="font-medium text-slate-800">{viewingInvoice.supplier_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('invoiceDate')}</p>
                <p className="font-medium text-slate-800">{new Date(viewingInvoice.invoice_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('amount')}</p>
                <p className="font-medium text-green-600">
                  {viewingInvoice.total_amount ? `£${parseFloat(viewingInvoice.total_amount).toFixed(2)}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('createdBy')}</p>
                <p className="font-medium text-slate-800">{viewingInvoice.created_by_email}</p>
              </div>
              {viewingInvoice.notes && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-500">{t('notes')}</p>
                  <p className="font-medium text-slate-800">{viewingInvoice.notes}</p>
                </div>
              )}
            </div>

            {/* Images */}
            {viewingInvoice.image_urls?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-700 mb-3">{t('images')}</h3>
                <div className="grid grid-cols-3 gap-3">
                  {viewingInvoice.image_urls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={url}
                        alt={`Invoice image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    </a>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">{t('clickToEnlarge')}</p>
              </div>
            )}

            {/* Linked Items */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">{t('linkedItems')}</h3>
              {linkedItems.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl">
                  <p className="text-slate-500">{t('noLinkedItems')}</p>
                </div>
              ) : (
                <div className="border-2 border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t('type')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t('item')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t('quantity')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t('price')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">{t('date')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedItems.map((item) => (
                        <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              item.type === 'food'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.type === 'food' ? t('foodStockEntry') : t('inventoryEntry')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{item.productName}</div>
                            {item.productBrand && (
                              <div className="text-xs text-slate-500">{item.productBrand}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {item.quantity} {item.unit_used || 'units'}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {item.purchase_price ? `£${parseFloat(item.purchase_price).toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-sm">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
