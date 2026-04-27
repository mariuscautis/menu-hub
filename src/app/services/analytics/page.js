'use client'

import ServicePageLayout from '@/components/ServicePageLayout'
import ServiceInnerPage from '@/components/ServiceInnerPage'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function AnalyticsPage() {
  const seo = useSeoSettings('services_analytics', {
    title: 'Business Analytics — Veno App',
    description: 'Sales trends, peak hours, best sellers, and staff performance. The numbers that actually affect your margin — readable at a glance.',
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
          tag="07"
          category="Analytics"
          title="Numbers that tell you"
          titleAccent="what to do next."
          accent="#f97316"
          subtitle="Stop guessing. Revenue trends, peak hours, best-selling dishes, staff performance, and tax breakdowns — all readable at a glance, updated in real time."
          features={[
            'Daily, weekly, and monthly revenue reports',
            'Peak hour and peak day analysis',
            'Best-selling and least-selling items',
            'Staff performance and order volume',
            'Sales by department (dine-in, takeaway, delivery)',
            'Exportable reports in CSV format',
          ]}
          stats={[
            { value: 'Live', label: 'Data updated in real time' },
            { value: '12+', label: 'Report types available' },
            { value: 'CSV', label: 'Export format' },
          ]}
          benefits={[
            { title: 'Revenue at a glance', desc: 'See today\'s takings, this week vs last week, and your best day of the month — front and centre.' },
            { title: 'Peak hour heatmap', desc: 'Know exactly when your venue is busiest so you can staff and stock accordingly.' },
            { title: 'Item-level profitability', desc: 'Identify your most and least ordered items. Cut the losers. Push the winners.' },
            { title: 'Staff performance', desc: 'Track order volume and revenue per staff member. Objective data, no guesswork.' },
            { title: 'Department breakdown', desc: 'See revenue split by dine-in, takeaway, and delivery separately.' },
            { title: 'Exportable reports', desc: 'Download any report as a CSV for your accountant, spreadsheet, or records.' },
          ]}
          howItWorks={[
            { step: '01', title: 'Orders are tracked automatically', desc: 'Every order, item, and payment is recorded as it happens. Nothing to set up.' },
            { step: '02', title: 'Open your reports dashboard', desc: 'Navigate to Analytics from your main dashboard — it\'s always up to date.' },
            { step: '03', title: 'Filter by date, department, or item', desc: 'Drill into exactly the data you need for any time period.' },
            { step: '04', title: 'Export or share', desc: 'Download reports as CSV or share a link with your accountant or business partner.' },
          ]}
        />
      </ServicePageLayout>
    </>
  )
}
