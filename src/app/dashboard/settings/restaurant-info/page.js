'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
export default function RestaurantInfo() {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [restaurantPhone, setRestaurantPhone] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  useEffect(() => {
    const fetchRestaurant = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Get restaurant (owners only)
      const { data: ownedRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (ownedRestaurant) {
        setRestaurant(ownedRestaurant)
        setLogoPreview(ownedRestaurant.logo_url || null)
        setRestaurantPhone(ownedRestaurant.phone || '')
      }
      setLoading(false)
    }
    fetchRestaurant()
  }, [])
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }
  const handleLogoUpload = async () => {
    if (!logoFile) return
    setUploadingLogo(true)
    setMessage(null)
    try {
      // Upload new logo
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${restaurant.id}/logo.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('restaurant-logos')
        .upload(fileName, logoFile, { upsert: true })
      if (uploadError) {
        console.error('Upload error:', uploadError)
        if (uploadError.message.includes('not found')) {
          setMessage({ type: 'error', text: 'Storage bucket not found. Please create the "restaurant-logos" bucket in Supabase Storage first.' })
        } else if (uploadError.message.includes('policy')) {
          setMessage({ type: 'error', text: 'Permission denied. Please set up storage policies.' })
        } else {
          setMessage({ type: 'error', text: `Failed to upload logo: ${uploadError.message}` })
        }
        setUploadingLogo(false)
        return
      }
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-logos')
        .getPublicUrl(fileName)
      // Update restaurant record
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ logo_url: publicUrl })
        .eq('id', restaurant.id)
      if (updateError) {
        setMessage({ type: 'error', text: 'Failed to update logo' })
      } else {
        setMessage({ type: 'success', text: 'Logo updated successfully!' })
        setRestaurant({ ...restaurant, logo_url: publicUrl })
        setLogoFile(null)
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      setMessage({ type: 'error', text: 'Failed to upload logo' })
    }
    setUploadingLogo(false)
  }
  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove the logo?')) return
    // Update restaurant record to remove logo
    const { error } = await supabase
      .from('restaurants')
      .update({ logo_url: null })
      .eq('id', restaurant.id)
    if (error) {
      setMessage({ type: 'error', text: 'Failed to remove logo' })
    } else {
      setMessage({ type: 'success', text: 'Logo removed successfully!' })
      setRestaurant({ ...restaurant, logo_url: null })
      setLogoPreview(null)
      setLogoFile(null)
    }
  }
  const handleSavePhone = async () => {
    setSavingPhone(true)
    const { error } = await supabase
      .from('restaurants')
      .update({ phone: restaurantPhone || null })
      .eq('id', restaurant.id)
    if (error) {
      setMessage({ type: 'error', text: 'Failed to update phone number' })
    } else {
      setMessage({ type: 'success', text: 'Phone number updated successfully!' })
      setRestaurant({ ...restaurant, phone: restaurantPhone })
    }
    setSavingPhone(false)
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }
  if (!restaurant) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          Only restaurant owners can access settings.
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Restaurant Information</h1>
        <p className="text-slate-500">Manage your restaurant's basic information and branding</p>
      </div>
      {message && (
        <div className={`mb-6 p-4 rounded-xl border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-600'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {message.text}
        </div>
      )}
      {/* Restaurant Information Section */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-700 mb-2">Restaurant Information</h2>
          <p className="text-sm text-slate-500">
            Contact information for your restaurant. This will be used in customer communications.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Restaurant Name
            </label>
            <input
              type="text"
              value={restaurant.name}
              disabled
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-2">
              Restaurant name cannot be changed from settings.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Restaurant Phone Number
            </label>
            <input
              type="tel"
              value={restaurantPhone}
              onChange={(e) => setRestaurantPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
            />
            <p className="text-xs text-slate-500 mt-2">
              This phone number will be included in cancellation emails so customers can contact you if there's an error.
            </p>
          </div>
          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSavePhone}
              disabled={savingPhone}
              className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {savingPhone ? 'Saving...' : 'Save Restaurant Information'}
            </button>
          </div>
        </div>
      </div>
      {/* Restaurant Logo Section */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-700 mb-2">Restaurant Logo</h2>
          <p className="text-sm text-slate-500">
            Upload your restaurant logo to personalize your dashboard. This logo will be visible to you and all your staff members.
          </p>
        </div>
        <div className="space-y-4">
          {/* Logo Preview */}
          {logoPreview && (
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                <img
                  src={logoPreview}
                  alt="Restaurant Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 mb-2">Current Logo</p>
                <button
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Remove Logo
                </button>
              </div>
            </div>
          )}
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {logoPreview ? 'Change Logo' : 'Upload Logo'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={uploadingLogo}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#6262bd] file:text-white hover:file:bg-[#5252a3] file:cursor-pointer disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-2">
              Recommended: Square image, at least 200x200px. PNG or JPG format.
            </p>
          </div>
          {/* Upload Button */}
          {logoFile && (
            <div className="pt-2">
              <button
                onClick={handleLogoUpload}
                disabled={uploadingLogo}
                className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
