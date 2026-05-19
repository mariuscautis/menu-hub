'use client'

import { createContext, useContext, useState, useCallback } from 'react'

const PageTourContext = createContext({ steps: [], setSteps: () => {}, startTour: () => {} })

export function PageTourProvider({ children }) {
  const [steps, setSteps] = useState([])

  const startTour = useCallback(async () => {
    if (!steps || steps.length === 0) return

    const { driver } = await import('driver.js')
    await import('driver.js/dist/driver.css')

    const visibleSteps = steps.filter(step => {
      const el = document.querySelector(step.element)
      return el && el.offsetParent !== null
    })

    if (visibleSteps.length === 0) return

    const d = driver({
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayOpacity: 0.6,
      stagePadding: 6,
      stageRadius: 0,
      popoverClass: 'menuhub-tour-popover',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done',
      onDestroyStarted: () => d.destroy(),
      steps: visibleSteps,
    })

    d.drive()
  }, [steps])

  return (
    <PageTourContext.Provider value={{ steps, setSteps, startTour }}>
      {children}
    </PageTourContext.Provider>
  )
}

export function usePageTour() {
  return useContext(PageTourContext)
}
