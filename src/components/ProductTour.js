'use client'

import { useEffect, useRef } from 'react'

const TOUR_STORAGE_KEY = 'product_tour_completed'

const STEPS = [
  {
    element: '[data-tour="nav-overview"]',
    popover: {
      title: 'Welcome to Menu Hub',
      description: 'This is your Overview — a live dashboard showing today\'s orders, revenue, and key metrics at a glance.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-orders"]',
    popover: {
      title: 'Orders',
      description: 'Incoming orders appear here in real time. Staff can mark items as being prepared and mark orders as complete.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-tables"]',
    popover: {
      title: 'Tables & QR Codes',
      description: 'Create and manage your tables, generate QR codes customers scan to order, and see live table status.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-menu"]',
    popover: {
      title: 'Menu Management',
      description: 'Build your menu: add categories, items, prices, and photos. Changes go live immediately for customers.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-reservations"]',
    popover: {
      title: 'Reservations',
      description: 'Accept and manage table bookings. Customers can book online and you\'ll get notified instantly.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-stock"]',
    popover: {
      title: 'Stock & Inventory',
      description: 'Track ingredient stock levels, log deliveries, and get alerts when items run low.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-staff"]',
    popover: {
      title: 'Staff & Rota',
      description: 'Add staff members, set departments and permissions, and build weekly rotas.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-analytics"]',
    popover: {
      title: 'Analytics',
      description: 'Explore revenue trends, top-selling products, peak hours, and department breakdowns to make data-driven decisions.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-settings"]',
    popover: {
      title: 'Settings',
      description: 'Configure your restaurant details, tax settings, payment methods, billing, and more.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-guide"]',
    popover: {
      title: 'You\'re all set!',
      description: 'This Guide page explains the key workflows in detail. You can restart this tour any time by clicking the Guide link.',
      side: 'right',
      align: 'start',
    },
  },
]

export default function ProductTour({ autoStart = false, onDone }) {
  const driverRef = useRef(null)

  const startTour = async () => {
    const { driver } = await import('driver.js')
    await import('driver.js/dist/driver.css')

    const visibleSteps = STEPS.filter(step => {
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
      onDestroyStarted: () => {
        d.destroy()
        localStorage.setItem(TOUR_STORAGE_KEY, '1')
        onDone?.()
      },
      steps: visibleSteps,
    })

    driverRef.current = d
    d.drive()
  }

  useEffect(() => {
    if (!autoStart) return
    const already = localStorage.getItem(TOUR_STORAGE_KEY)
    if (already) return
    // slight delay so nav items are painted
    const t = setTimeout(() => startTour(), 800)
    return () => clearTimeout(t)
  }, [autoStart])

  // Expose startTour globally so Guide page can trigger it
  useEffect(() => {
    window.__startProductTour = startTour
    return () => { delete window.__startProductTour }
  }, [])

  return null
}
