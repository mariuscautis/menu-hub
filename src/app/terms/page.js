import ServicePageLayout from '@/components/ServicePageLayout'

export const metadata = {
  title: 'Terms of Service — Veno App',
  description: 'The terms and conditions governing your use of Veno App.',
}

const LAST_UPDATED = '17 March 2026'

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{title}</h2>
      <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  )
}

export default function TermsOfService() {
  return (
    <ServicePageLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">

        <div className="mb-12">
          <span className="inline-block bg-[#6262bd]/10 text-[#6262bd] text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">Legal</span>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">Terms of Service</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>By creating an account or using Veno App ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users, including venue operators, staff members, and end customers.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>Veno App provides a venue management platform including digital menus, QR code ordering, reservation management, staff scheduling, analytics, and related tools. The specific features available to you depend on the modules your venue has subscribed to.</p>
        </Section>

        <Section title="3. Account Registration">
          <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. Notify us immediately at <a href="mailto:hello@venoapp.com" className="text-[#6262bd] hover:underline">hello@venoapp.com</a> if you suspect unauthorised access.</p>
          <p>You must be at least 18 years old and authorised to act on behalf of the business you register.</p>
        </Section>

        <Section title="4. Free Trial">
          <p>New accounts receive a 14-day free trial. No payment details are required to start the trial. At the end of the trial period, you must subscribe to a paid plan to continue using the Service. Unused trial features do not carry over.</p>
        </Section>

        <Section title="5. Subscriptions and Billing">
          <p>Veno App is billed on a per-module basis. You may subscribe to one or more modules individually or in combination. Billing is handled through our payment processor and is subject to the pricing displayed at the time of subscription.</p>
          <p>Module changes (adding or removing) take effect immediately. Cancellations take effect at the end of the current billing period. We do not offer refunds for partial billing periods unless required by law.</p>
        </Section>

        <Section title="6. Acceptable Use">
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Use the Service for any unlawful purpose or in violation of any applicable regulations</li>
            <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure</li>
            <li>Upload content that is defamatory, obscene, or infringes third-party intellectual property rights</li>
            <li>Resell, sublicense, or otherwise commercialise the Service without written permission</li>
            <li>Interfere with the availability or performance of the Service for other users</li>
          </ul>
        </Section>

        <Section title="7. Your Content">
          <p>You retain ownership of all content you upload (menus, images, descriptions, etc.). By uploading content, you grant Veno App a non-exclusive, worldwide licence to display and use that content solely for the purpose of delivering the Service to you.</p>
          <p>You are responsible for ensuring your content complies with applicable laws, including food labelling and allergen regulations.</p>
        </Section>

        <Section title="8. Intellectual Property">
          <p>All software, designs, and materials comprising the Veno App platform are the intellectual property of Veno App. Nothing in these terms transfers any ownership rights to you. You may not copy, reverse-engineer, or create derivative works from the Service.</p>
        </Section>

        <Section title="9. Uptime and Service Availability">
          <p>We aim to provide a reliable service but do not guarantee uninterrupted availability. We will endeavour to notify users in advance of scheduled maintenance. We are not liable for losses arising from downtime outside of our reasonable control.</p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>To the maximum extent permitted by law, Veno App shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of the Service. Our total liability to you shall not exceed the amounts paid by you in the 12 months preceding the claim.</p>
        </Section>

        <Section title="11. Termination">
          <p>You may cancel your account at any time from your dashboard. We may suspend or terminate accounts that violate these terms, with or without notice depending on the severity of the breach.</p>
          <p>Upon termination, your data will be retained for 90 days before deletion, giving you time to export anything you need.</p>
        </Section>

        <Section title="12. Changes to These Terms">
          <p>We may update these terms from time to time. We will notify registered users of material changes via email at least 14 days before they take effect. Continued use of the Service after that date constitutes acceptance of the updated terms.</p>
        </Section>

        <Section title="13. Governing Law">
          <p>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
        </Section>

        <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">Questions about these terms? Reach us at <a href="mailto:hello@venoapp.com" className="text-[#6262bd] hover:underline font-medium">hello@venoapp.com</a></p>
        </div>

      </div>
    </ServicePageLayout>
  )
}
