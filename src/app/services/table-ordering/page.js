'use client'

import ServicePageLayout from '@/components/ServicePageLayout'
import ServiceInnerPage from '@/components/ServiceInnerPage'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function TableOrderingPage() {
  const seo = useSeoSettings('services_table_ordering', {
    title: 'Table Ordering System — Veno App',
    description: 'Let customers place orders directly from their table. Orders flow instantly to kitchen and bar, reducing wait times and freeing up staff.',
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
          tag="02"
          category="Table Ordering"
          title="Orders straight to"
          titleAccent="kitchen, instantly."
          accent="#0ea5e9"
          subtitle="Customers order from their own device at the table. The order appears in the kitchen and bar displays the moment they confirm — no runner, no delay."
          features={[
            'Customers order from their phone at the table',
            'Separate routing to kitchen and bar stations',
            'Real-time order status updates for guests',
            'Supports modifiers, notes, and special requests',
            'Reduces order errors by removing manual re-entry',
            'Works alongside or instead of waiter ordering',
          ]}
          stats={[
            { value: '90%', label: 'Reduction in order errors' },
            { value: '2×', label: 'Faster table turnover' },
            { value: '0', label: 'Extra hardware required' },
          ]}
          benefits={[
            { title: 'No hardware required', desc: 'Customers use their own phones. Kitchen staff use any screen you already own.' },
            { title: 'Instant kitchen routing', desc: 'Hot food to the kitchen display, drinks to the bar display — automatically split.' },
            { title: 'Order status for guests', desc: 'Customers see when their order is received, being prepared, and ready.' },
            { title: 'Modifiers and notes', desc: 'Extra sauce, no onions, dietary swaps — captured exactly, no miscommunication.' },
            { title: 'Works offline', desc: 'Table ordering keeps working on local sync even if the internet drops mid-service.' },
            { title: 'Staff still in control', desc: 'Managers can pause ordering, apply discounts, or override from the dashboard.' },
          ]}
          howItWorks={[
            { step: '01', title: 'Guest scans the table QR', desc: 'The table-specific QR loads the menu pre-linked to that table number.' },
            { step: '02', title: 'Guest browses and orders', desc: 'They add items, leave notes, and confirm — no account needed.' },
            { step: '03', title: 'Order routes to stations', desc: 'Kitchen and bar displays show the order with table number and timestamp.' },
            { step: '04', title: 'Staff mark and close', desc: 'Staff mark items ready, the guest sees the update. Payment via staff or integrated checkout.' },
          ]}
        />
      </ServicePageLayout>
    </>
  )
}
