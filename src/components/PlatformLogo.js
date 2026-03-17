'use client'

import { usePlatformBranding } from '@/lib/usePlatformBranding'

export default function PlatformLogo({
  size = 'md',
  showText = true,
  stacked = true,
  className = '',
  textClassName = '',
  darkMode = false
}) {
  const { branding, loading } = usePlatformBranding()

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm',
    xl: 'text-base'
  }

  const letterSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  }

  const logoSize = sizeClasses[size] || sizeClasses.md
  const textSize = textSizeClasses[size] || textSizeClasses.md
  const letterSize = letterSizeClasses[size] || letterSizeClasses.md

  const textColor = darkMode ? 'text-white/80' : 'text-slate-500'

  const layout = stacked ? 'flex-col items-center gap-0.5' : 'flex-row items-center gap-2'

  if (loading) {
    return (
      <div className={`flex ${layout} ${className}`}>
        <div className={`${logoSize} bg-slate-200 rounded-xl animate-pulse`} />
        {showText && <div className="w-16 h-3 bg-slate-200 rounded animate-pulse" />}
      </div>
    )
  }

  return (
    <div className={`flex ${layout} ${className}`}>
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
        <span className={`font-semibold ${textSize} ${textColor} ${textClassName} leading-tight text-center`}>
          {branding.platform_name}
        </span>
      )}
    </div>
  )
}
