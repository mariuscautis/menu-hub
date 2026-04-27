'use client'

import ServicePageLayout from '@/components/ServicePageLayout'
import ServiceInnerPage from '@/components/ServiceInnerPage'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function StaffDashboardPage() {
  const seo = useSeoSettings('services_dashboard', {
    title: 'Kitchen & Staff Dashboard — Veno App',
    description: 'A live order board for your kitchen and bar. Role-based access, audio alerts, offline sync — everything staff need to stay in sync.',
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
          tag="06"
          category="Kitchen Dashboard"
          title="Live orders. Every"
          titleAccent="station in sync."
          accent="#6262bd"
          subtitle="Kitchen staff see their orders. Bar staff see theirs. Managers see everything. Audio alerts fire on new orders — all on hardware you already own."
          features={[
            'Station-specific displays (kitchen / bar / floor)',
            'Audio alert on every new order',
            'One-tap order status updates',
            'Manager overview of all stations',
            'Role-based access control',
            'Works offline with local network sync',
          ]}
          stats={[
            { value: '0s', label: 'Delay from order to display' },
            { value: '3', label: 'Station types supported' },
            { value: 'Any', label: 'Screen or device' },
          ]}
          benefits={[
            { title: 'Per-station views', desc: 'Kitchen sees food orders only. Bar sees drinks only. No noise, no confusion.' },
            { title: 'Audio notifications', desc: 'A sound fires on every new order so nothing is missed even in a busy kitchen.' },
            { title: 'One-tap status flow', desc: 'Staff move orders from New to Cooking to Ready with a single tap.' },
            { title: 'Manager overview', desc: 'See all stations simultaneously. Spot bottlenecks and intervene from any device.' },
            { title: 'Works without internet', desc: 'The dashboard syncs over the local network. Internet outages don\'t stop service.' },
            { title: 'No hardware costs', desc: 'Run it on a spare tablet, an old laptop, or a mounted display — anything with a browser.' },
          ]}
          howItWorks={[
            { step: '01', title: 'Set up your stations', desc: 'Define kitchen, bar, and any custom stations in the dashboard settings.' },
            { step: '02', title: 'Open on any screen', desc: 'Navigate to the station URL on any device and pin it to the home screen.' },
            { step: '03', title: 'Orders arrive in real time', desc: 'Every new order appears instantly with an audio alert and table number.' },
            { step: '04', title: 'Staff mark progress', desc: 'Tap to move orders through the workflow. The guest and manager see each update.' },
          ]}
        />
      </ServicePageLayout>
    </>
  )
}
