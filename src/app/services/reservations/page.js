'use client'

import ServicePageLayout from '@/components/ServicePageLayout'
import ServiceInnerPage from '@/components/ServiceInnerPage'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function ReservationsPage() {
  const seo = useSeoSettings('services_reservations', {
    title: 'Reservations System — Veno App',
    description: 'Accept online reservations 24/7. Automatic confirmations, table assignments, deposit collection, and a full bookings calendar for your team.',
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
          tag="08"
          category="Reservations"
          title="Never miss a booking."
          titleAccent="Ever."
          accent="#ec4899"
          subtitle="Online reservations 24/7 with automatic confirmations, table assignments, deposit collection, and a full calendar view for your staff — all without answering the phone."
          features={[
            'Public branded booking page, always on',
            'Automatic confirmation and reminder emails',
            'Floor plan and table assignment',
            'Advance booking window and shift controls',
            'No-show auto-cancellation',
            'Reservation fee collection via Stripe',
          ]}
          stats={[
            { value: '24/7', label: 'Bookings accepted automatically' },
            { value: '0', label: 'Phone calls needed' },
            { value: '100%', label: 'Confirmations sent automatically' },
          ]}
          benefits={[
            { title: 'Branded booking page', desc: 'Guests book directly on a page with your venue name and logo — no third-party branding.' },
            { title: 'Automatic emails', desc: 'Confirmations, reminders, and cancellations sent automatically. No manual follow-up.' },
            { title: 'Table assignment', desc: 'Assign tables from your floor plan when confirming. Staff see the full picture.' },
            { title: 'Deposit collection', desc: 'Require a reservation fee paid by card at booking time. Reduces no-shows significantly.' },
            { title: 'No-show protection', desc: 'Set automatic cancellation rules for guests who don\'t confirm or show up.' },
            { title: 'Shift-based hours', desc: 'Control exactly which time slots are available for each service period.' },
          ]}
          howItWorks={[
            { step: '01', title: 'Configure your shifts and tables', desc: 'Set your service hours, party sizes, and table layout in the dashboard.' },
            { step: '02', title: 'Share your booking link', desc: 'Put it on your website, Instagram, Google listing — anywhere guests find you.' },
            { step: '03', title: 'Guests book and pay', desc: 'They choose a time, enter details, and optionally pay a deposit. Confirmation email fires instantly.' },
            { step: '04', title: 'Staff manage from the calendar', desc: 'All bookings are visible in one calendar view with table assignments and guest notes.' },
          ]}
        />
      </ServicePageLayout>
    </>
  )
}
