'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const GuideContext = createContext({
  guideMode: false,
  toggleGuideMode: () => {},
})

export function GuideProvider({ children }) {
  const [guideMode, setGuideMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('guide_mode')
    if (saved === 'true') {
      setGuideMode(true)
    }
  }, [])

  const toggleGuideMode = () => {
    setGuideMode((prev) => {
      const next = !prev
      localStorage.setItem('guide_mode', String(next))
      return next
    })
  }

  return (
    <GuideContext.Provider value={{ guideMode, toggleGuideMode }}>
      {children}
    </GuideContext.Provider>
  )
}

export function useGuide() {
  const context = useContext(GuideContext)
  if (context === undefined) {
    throw new Error('useGuide must be used within a GuideProvider')
  }
  return context
}
