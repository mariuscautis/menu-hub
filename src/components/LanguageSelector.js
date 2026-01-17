'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' }
]

export default function LanguageSelector({ className = '' }) {
  const { locale, changeLanguage } = useLanguage()

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0]

  return (
    <div className={`relative ${className}`}>
      <select
        value={locale}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 bg-white cursor-pointer appearance-none pr-10"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}
