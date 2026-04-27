'use client'

import ServicePageLayout from '@/components/ServicePageLayout'
import ServiceInnerPage from '@/components/ServiceInnerPage'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function OfflineHubPage() {
  const seo = useSeoSettings('services_offline_hub', {
    title: 'Offline Hub — Veno App',
    description: 'Internet goes down? Veno keeps working. Orders still flow, kitchen displays stay live, and everything syncs the moment you\'re back online.',
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
          tag="03"
          category="Offline Hub"
          title="Internet goes down."
          titleAccent="Service stays up."
          accent="#10b981"
          subtitle="Veno's offline hub keeps your orders, kitchen displays, and menus working even with no internet. When you reconnect, everything syncs automatically — no data lost."
          features={[
            'Orders still flow with zero internet connection',
            'Kitchen and bar displays stay live locally',
            'Menu data cached on device for instant load',
            'Auto-sync the moment connection returns',
            'No data loss during an outage',
            'Works on Wi-Fi, mobile data, or fully offline',
          ]}
          stats={[
            { value: '100%', label: 'Orders captured offline' },
            { value: '0', label: 'Data lost during outage' },
            { value: 'Auto', label: 'Sync on reconnect' },
          ]}
          benefits={[
            { title: 'Local order queue', desc: 'Orders taken offline are stored on-device and pushed the moment connection returns.' },
            { title: 'Kitchen displays keep running', desc: 'The kitchen and bar dashboards continue showing orders over the local network.' },
            { title: 'Menu always loads', desc: 'Menu data is cached so guests can browse even without internet at the table.' },
            { title: 'No manual intervention', desc: 'Reconnection and sync happen automatically. No staff action required.' },
            { title: 'Works on any network', desc: 'Full Wi-Fi, shared mobile data, or completely offline — each scenario handled.' },
            { title: 'Audit trail preserved', desc: 'Every order, timestamp, and status is recorded even through an outage.' },
          ]}
          howItWorks={[
            { step: '01', title: 'Internet connection drops', desc: 'Veno detects the loss instantly and switches to local-first mode.' },
            { step: '02', title: 'Orders queue locally', desc: 'New orders are stored on the device. Kitchen and bar displays keep updating over the local network.' },
            { step: '03', title: 'Service continues normally', desc: 'Staff and guests see no interruption. Everything works as expected.' },
            { step: '04', title: 'Connection returns — sync fires', desc: 'The queue uploads automatically. All data is reconciled with no duplicates.' },
          ]}
        />
      </ServicePageLayout>
    </>
  )
}
