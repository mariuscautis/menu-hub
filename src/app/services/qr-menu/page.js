'use client'

import ServicePageLayout from '@/components/ServicePageLayout'
import ServiceInnerPage from '@/components/ServiceInnerPage'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function QRMenuPage() {
  const seo = useSeoSettings('services_qr_menu', {
    title: 'QR Code Menus — Veno App',
    description: 'Create stunning digital QR menus your customers can access instantly on any smartphone. No app download needed. Always up to date.',
  })
  return (
    <>
      {seo.title && <title>{seo.title}</title>}
      {seo.description && <meta name="description" content={seo.description} />}
      {seo.title && <meta property="og:title" content={seo.title} />}
      {seo.description && <meta property="og:description" content={seo.description} />}
      <meta property="og:type" content="website" />
      {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
      <meta name="twitter:card" content={seo.ogImage ? 'summary_large_image' : 'summary'} />
      {seo.title && <meta name="twitter:title" content={seo.title} />}
      {seo.description && <meta name="twitter:description" content={seo.description} />}
      {seo.ogImage && <meta name="twitter:image" content={seo.ogImage} />}
      <ServicePageLayout>
        <ServiceInnerPage
          tag="01"
          category="Digital Menu"
          title="Menus your guests"
          titleAccent="actually want to use."
          accent="#6262bd"
          subtitle="Replace paper menus with a beautiful, always-up-to-date digital experience. Customers scan, browse, and order — no app download, no friction."
          features={[
            'No app download required — works in any browser',
            'Update prices and items in real time',
            'Multi-language support (EN, ES, FR, IT, RO)',
            'Allergen and dietary information per item',
            'High-quality food photography per dish',
            'Generates a printable QR code in seconds',
          ]}
          stats={[
            { value: '0s', label: 'Setup after account creation' },
            { value: '100%', label: 'Works on any device' },
            { value: '6', label: 'Languages supported' },
          ]}
          benefits={[
            { title: 'No app store needed', desc: 'Customers open the menu straight in their browser. Instant. Nothing to install.' },
            { title: 'Update once, live everywhere', desc: 'Change a price or mark an item sold out — the change is live for every table immediately.' },
            { title: 'Beautiful food photography', desc: 'Each dish can have its own image. Guests see exactly what they\'re ordering.' },
            { title: 'Multi-language in one QR', desc: 'The same QR code serves your menu in any of the supported languages.' },
            { title: 'Allergen information', desc: 'Display clear allergen and dietary labels. Keeps guests safe and reduces server questions.' },
            { title: 'Works offline too', desc: 'Once loaded, the menu stays readable even if Wi-Fi drops at the table.' },
          ]}
          howItWorks={[
            { step: '01', title: 'Add your menu', desc: 'Create categories and items in the dashboard. Upload photos, set prices, add allergens.' },
            { step: '02', title: 'Generate your QR code', desc: 'One click creates a QR code for each table, area, or your entire venue.' },
            { step: '03', title: 'Print and place', desc: 'Print the QR code and put it on tables. Guests scan and browse immediately.' },
            { step: '04', title: 'Update anytime', desc: 'Change the menu from your phone or laptop — no reprinting, ever.' },
          ]}
        />
      </ServicePageLayout>
    </>
  )
}
