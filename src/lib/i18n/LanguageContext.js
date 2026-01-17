'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState('en')
  const [messages, setMessages] = useState({})

  useEffect(() => {
    // Load saved language preference
    const saved = localStorage.getItem('app_language') || 'en'
    setLocale(saved)
    loadMessages(saved)
  }, [])

  const loadMessages = async (lang) => {
    try {
      const msgs = await import(`../../../messages/${lang}.json`)
      setMessages(msgs.default)
    } catch (error) {
      console.error('Failed to load messages:', error)
      // Fallback to English
      const msgs = await import(`../../../messages/en.json`)
      setMessages(msgs.default)
    }
  }

  const changeLanguage = async (newLocale) => {
    localStorage.setItem('app_language', newLocale)
    setLocale(newLocale)
    await loadMessages(newLocale)
  }

  return (
    <LanguageContext.Provider value={{ locale, messages, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Helper hook for translations
export function useTranslations(namespace) {
  const { messages } = useLanguage()

  return (key) => {
    const keys = `${namespace}.${key}`.split('.')
    let value = messages

    for (const k of keys) {
      value = value?.[k]
    }

    return value || key
  }
}
