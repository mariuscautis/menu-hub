'use client'

import { usePlatformBranding } from '@/lib/usePlatformBranding'

export default function PlatformLogo({
  size = 'md',
  showText = true,
  className = '',
  textClassName = '',
  darkMode = false
}) {
  const { branding, loading } = usePlatformBranding()

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }

  const letterSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  }

  const logoSize = sizeClasses[size] || sizeClasses.md
  const textSize = textSizeClasses[size] || textSizeClasses.md
  const letterSize = letterSizeClasses[size] || letterSizeClasses.md

  const textColor = darkMode ? 'text-white' : 'text-slate-800'

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`${logoSize} bg-slate-200 rounded-xl animate-pulse`} />
        {showText && <div className="w-24 h-6 bg-slate-200 rounded animate-pulse" />}
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {branding.logo_url ? (
        <img
          src={branding.logo_url}
          alt={branding.platform_name}
          className={`${logoSize} rounded-xl object-contain`}
        />
      ) : (
        <div className={`${logoSize} bg-[#6262bd] rounded-xl flex items-center justify-center`}>
          <span className={`text-white font-bold ${letterSize}`}>
            {branding.platform_name?.charAt(0) || 'V'}
          </span>
        </div>
      )}
      {showText && (
        <span className={`font-bold ${textSize} ${textColor} ${textClassName}`}>
          {branding.platform_name}
        </span>
      )}
    </div>
  )
}
