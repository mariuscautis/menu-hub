// Client-side translation loader for public pages
// Loads translations based on restaurant's email_language setting

import enTranslations from '../../messages/en.json'
import roTranslations from '../../messages/ro.json'
import esTranslations from '../../messages/es.json'
import frTranslations from '../../messages/fr.json'
import itTranslations from '../../messages/it.json'

const translations = {
  en: enTranslations,
  ro: roTranslations,
  es: esTranslations,
  fr: frTranslations,
  it: itTranslations
}

/**
 * Load translations for a specific locale and namespace
 * @param {string} locale - Language code (en, ro, es, fr, it)
 * @param {string} namespace - Translation namespace (e.g., 'takeaway', 'booking')
 * @returns {object} Translation object for the namespace
 */
export function loadTranslations(locale = 'en', namespace) {
  const supportedLocales = ['en', 'ro', 'es', 'fr', 'it']
  const validLocale = supportedLocales.includes(locale) ? locale : 'en'

  try {
    const translation = translations[validLocale]

    if (namespace) {
      return translation[namespace] || translations.en[namespace] || {}
    }

    return translation || translations.en
  } catch (error) {
    console.error('Translation loading error:', error)
    // Fallback to English
    if (namespace) {
      return translations.en[namespace] || {}
    }
    return translations.en
  }
}

/**
 * Create a translation function with placeholder replacement
 * @param {object} translations - Translation object
 * @returns {function} Translation function
 */
export function createTranslator(translations) {
  return function t(key, replacements = {}) {
    if (!translations) return key
    let text = translations[key] || key

    // Replace placeholders like {name}, {count}, etc.
    Object.entries(replacements).forEach(([placeholder, value]) => {
      text = text.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value)
    })

    return text
  }
}
