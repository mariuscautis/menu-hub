'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslations } from '@/lib/i18n/LanguageContext'

export default function RestaurantInfo() {
  const t = useTranslations('restaurantInfo')
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
          setMessage({ type: 'error', text: t('storageBucketNotFound') })
        } else if (uploadError.message.includes('policy')) {
          setMessage({ type: 'error', text: t('permissionDenied') })
        } else {
          setMessage({ type: 'error', text: `${t('failedUploadLogo')}: ${uploadError.message}` })
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
        setMessage({ type: 'error', text: t('failedUpdateLogo') })
      } else {
        setMessage({ type: 'success', text: t('logoUpdatedSuccess') })
        setRestaurant({ ...restaurant, logo_url: publicUrl })
        setLogoFile(null)
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      setMessage({ type: 'error', text: t('failedUploadLogo') })
    }
    setUploadingLogo(false)
  }
  const handleRemoveLogo = async () => {
    if (!confirm(t('confirmRemoveLogo'))) return
    // Update restaurant record to remove logo
    const { error } = await supabase
      .from('restaurants')
      .update({ logo_url: null })
      .eq('id', restaurant.id)
    if (error) {
      setMessage({ type: 'error', text: t('failedRemoveLogo') })
    } else {
      setMessage({ type: 'success', text: t('logoRemovedSuccess') })
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
      setMessage({ type: 'error', text: t('failedUpdatePhone') })
    } else {
      setMessage({ type: 'success', text: t('phoneUpdatedSuccess') })
      setRestaurant({ ...restaurant, phone: restaurantPhone })
    }
    setSavingPhone(false)
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500">{t('loading')}</div>
      </div>
    )
  }
  if (!restaurant) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          {t('accessError')}
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{t('pageTitle')}</h1>
        <p className="text-slate-500">{t('pageSubtitle')}</p>
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
          <h2 className="text-lg font-bold text-slate-700 mb-2">{t('sectionTitle')}</h2>
          <p className="text-sm text-slate-500">
            {t('sectionDescription')}
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('restaurantNameLabel')}
            </label>
            <input
              type="text"
              value={restaurant.name}
              disabled
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-2">
              {t('nameCannotChange')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('restaurantPhoneLabel')}
            </label>
            <input
              type="tel"
              value={restaurantPhone}
              onChange={(e) => setRestaurantPhone(e.target.value)}
              placeholder={t('phonePlaceholder')}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
            />
            <p className="text-xs text-slate-500 mt-2">
              {t('phoneHelpText')}
            </p>
          </div>
          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSavePhone}
              disabled={savingPhone}
              className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {savingPhone ? t('saving') : t('saveButton')}
            </button>
          </div>
        </div>
      </div>
      {/* Restaurant Logo Section */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-700 mb-2">{t('logoSectionTitle')}</h2>
          <p className="text-sm text-slate-500">
            {t('logoSectionDescription')}
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
                <p className="text-sm font-medium text-slate-700 mb-2">{t('currentLogo')}</p>
                <button
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {t('removeLogo')}
                </button>
              </div>
            </div>
          )}
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {logoPreview ? t('changeLogo') : t('uploadLogo')}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={uploadingLogo}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#6262bd] file:text-white hover:file:bg-[#5252a3] file:cursor-pointer disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-2">
              {t('logoHelpText')}
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
                {uploadingLogo ? t('uploading') : t('uploadLogoButton')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
