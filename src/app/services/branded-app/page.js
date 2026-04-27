'use client'

import ServicePageLayout from '@/components/ServicePageLayout'
import ServiceInnerPage from '@/components/ServiceInnerPage'
import { useSeoSettings } from '@/lib/useSeoSettings'

export default function BrandedAppPage() {
  const seo = useSeoSettings('services_branded_app', {
    title: 'Your Branded App — Veno App',
    description: 'White-label PWA with your logo, colors, and name. Customers install it like a real app — no app store, no developer needed.',
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
          tag="04"
          category="Branded App"
          title="Your logo. Your colours."
          titleAccent="Your app."
          accent="#f59e0b"
          subtitle="Get a fully branded Progressive Web App — your logo, your name, your colour scheme. Customers install it on their home screen and it feels like an app you had custom built."
          features={[
            'Your branding: logo, name, and accent colour',
            'Customers install directly from their browser',
            'No App Store or Google Play required',
            'Works on iOS, Android, and desktop',
            'Powered by Veno — invisible to your guests',
            'Push notification ready',
          ]}
          stats={[
            { value: '£0', label: 'App store fees' },
            { value: '15 min', label: 'Average branding setup' },
            { value: '100%', label: 'White label — yours entirely' },
          ]}
          benefits={[
            { title: 'No development cost', desc: 'No agency, no developer, no app store fee. Your branded app is included in your Veno plan.' },
            { title: 'Install from browser', desc: 'Guests tap "Add to Home Screen" and it\'s done. Works on any modern phone.' },
            { title: 'Looks like a native app', desc: 'Full-screen, launch icon, splash screen — your guests won\'t know it\'s a PWA.' },
            { title: 'Always up to date', desc: 'The app updates silently in the background. No version prompts, no app store approval.' },
            { title: 'Cross-platform', desc: 'One branded app that works identically on iPhone, Android, and desktop browsers.' },
            { title: 'Offline capable', desc: 'The Offline Hub means your branded app keeps working even when the internet drops.' },
          ]}
          howItWorks={[
            { step: '01', title: 'Upload your branding', desc: 'Add your logo, choose your accent colour, and set your venue name in the dashboard.' },
            { step: '02', title: 'Preview your app', desc: 'See exactly how it will look on a phone before sharing with guests.' },
            { step: '03', title: 'Share the link', desc: 'Post your app link on tables, social media, or your website. Guests open and install.' },
            { step: '04', title: 'Done', desc: 'Guests see your brand everywhere. Veno operates silently in the background.' },
          ]}
        />
      </ServicePageLayout>
    </>
  )
}
