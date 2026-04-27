'use client'

import ServicePageLayout from '@/components/ServicePageLayout'
import ServiceInnerPage from '@/components/ServiceInnerPage'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function StaffManagementPage() {
  const seo = useSeoSettings('services_staff_management', {
    title: 'Staff Management — Veno App',
    description: 'Manage your entire team from one place. Rotas, clock-ins, leave requests, and department assignments — all in one dashboard.',
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
          tag="05"
          category="Staff & Rotas"
          title="Your team. One"
          titleAccent="dashboard."
          accent="#ec4899"
          subtitle="Schedules, clock-ins, leave requests, and department assignments — managed from a single place. No spreadsheets, no group chats, no lost papers."
          features={[
            'Drag-and-drop rota scheduling',
            'Digital clock-in and clock-out',
            'Time-off requests with manager approval',
            'Department and role assignments',
            'Staff availability management',
            'Shift templates for recurring schedules',
          ]}
          stats={[
            { value: '80%', label: 'Less time on admin' },
            { value: '0', label: 'Spreadsheets needed' },
            { value: 'Real-time', label: 'Clock-in tracking' },
          ]}
          benefits={[
            { title: 'Visual rota builder', desc: 'Drag and drop shifts onto a weekly calendar. Publish to staff with one click.' },
            { title: 'Digital clock-in', desc: 'Staff clock in and out from their phone or a shared tablet. Times are recorded automatically.' },
            { title: 'Leave management', desc: 'Staff submit requests through the app. Managers approve or decline with a reason.' },
            { title: 'Shift templates', desc: 'Save your regular shift patterns and apply them week after week in seconds.' },
            { title: 'Department assignments', desc: 'Assign staff to kitchen, bar, floor, or custom departments. Control access accordingly.' },
            { title: 'Performance visibility', desc: 'See hours worked, punctuality, and attendance trends for each team member.' },
          ]}
          howItWorks={[
            { step: '01', title: 'Add your team', desc: 'Invite staff by email. They set up their profile and availability in minutes.' },
            { step: '02', title: 'Build the rota', desc: 'Drag shifts into the weekly calendar. Use templates for recurring patterns.' },
            { step: '03', title: 'Publish the schedule', desc: 'Staff receive their shifts instantly. They confirm or flag conflicts.' },
            { step: '04', title: 'Track time automatically', desc: 'Clock-in and clock-out data is recorded and available in your reports.' },
          ]}
        />
      </ServicePageLayout>
    </>
  )
}
