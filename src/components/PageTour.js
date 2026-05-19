'use client'

import { useEffect } from 'react'
import { usePageTour } from '@/lib/PageTourContext'

export default function PageTour({ steps }) {
  const { setSteps } = usePageTour()

  useEffect(() => {
    setSteps(steps || [])
    return () => setSteps([])
  }, [JSON.stringify(steps)])

  return null
}
