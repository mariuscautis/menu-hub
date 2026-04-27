'use client'

import ServicePageLayout from '@/components/ServicePageLayout'
import ServiceInnerPage from '@/components/ServiceInnerPage'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function InventoryPage() {
  const seo = useSeoSettings('services_inventory', {
    title: 'Inventory Management — Veno App',
    description: 'Track stock levels, record supplier invoices, monitor waste, and get low-stock alerts. Know exactly where your money is going.',
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
          tag="09"
          category="Inventory"
          title="Know what you have."
          titleAccent="Know what it costs."
          accent="#64748b"
          subtitle="Real-time stock tracking, low-stock alerts, supplier invoice recording, and waste logging — so you always know exactly where your money is going."
          features={[
            'Real-time stock level tracking',
            'Low-stock and out-of-stock alerts',
            'Supplier invoice recording',
            'Waste and loss logging',
            'Stock movement history',
            'Cost-of-goods tracking per item',
          ]}
          stats={[
            { value: 'Live', label: 'Stock levels updated in real time' },
            { value: 'Auto', label: 'Low-stock alerts' },
            { value: '100%', label: 'Supplier invoices recorded' },
          ]}
          benefits={[
            { title: 'Live stock levels', desc: 'See exactly what you have at any moment. Updated as items are used or received.' },
            { title: 'Low-stock alerts', desc: 'Get notified before you run out. Never 86 a dish mid-service again.' },
            { title: 'Supplier invoices', desc: 'Record deliveries and costs as they arrive. Full invoice history in one place.' },
            { title: 'Waste logging', desc: 'Track spoilage and loss. Understand where stock is disappearing and act on it.' },
            { title: 'Cost visibility', desc: 'Know the cost-of-goods for every item on your menu. Make pricing decisions with data.' },
            { title: 'Movement history', desc: 'Full audit trail of every stock change — who recorded it, when, and why.' },
          ]}
          howItWorks={[
            { step: '01', title: 'Add your inventory items', desc: 'List your ingredients, supplies, and stock items with starting quantities and reorder thresholds.' },
            { step: '02', title: 'Record deliveries', desc: 'When stock arrives, record the delivery against a supplier invoice. Levels update automatically.' },
            { step: '03', title: 'Alerts fire automatically', desc: 'When an item drops below threshold, you get an alert before it runs out.' },
            { step: '04', title: 'Review and act', desc: 'Open the inventory report to see movement history, waste patterns, and costs at a glance.' },
          ]}
        />
      </ServicePageLayout>
    </>
  )
}
