import ServicePageLayout from '@/components/ServicePageLayout'

export const metadata = {
  title: 'Privacy Policy — Veno App',
  description: 'How Veno App collects, uses, and protects your personal data.',
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

export default function PrivacyPolicy() {
  return (
    <ServicePageLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">

        <div className="mb-12">
          <span className="inline-block bg-[#6262bd]/10 text-[#6262bd] text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">Legal</span>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">Privacy Policy</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="1. Who We Are">
          <p>Veno App ("we", "us", "our") is a venue management platform that provides digital menus, ordering, reservations, and related services to venue operators and their customers. This Privacy Policy explains how we collect, use, store, and protect personal data when you use our website or services.</p>
          <p>If you have any questions, contact us at <a href="mailto:hello@venoapp.com" className="text-[#6262bd] hover:underline">hello@venoapp.com</a>.</p>
        </Section>

        <Section title="2. What Data We Collect">
          <p><strong className="text-slate-700 dark:text-slate-300">Venue operators:</strong> When you register or use Veno App, we collect your name, email address, phone number, business name, and business type. We also collect usage data about how you interact with the dashboard.</p>
          <p><strong className="text-slate-700 dark:text-slate-300">Customers of venues:</strong> When a customer places an order or makes a reservation through a Veno-powered venue, we collect only the information necessary to fulfil that action (e.g. name, contact details, dietary notes). We do not build customer profiles or sell this data.</p>
          <p><strong className="text-slate-700 dark:text-slate-300">Website visitors:</strong> We collect standard server logs and, where consented to, analytics data such as pages visited and time on site.</p>
        </Section>

        <Section title="3. How We Use Your Data">
          <p>We use personal data to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Provide, operate, and improve the Veno App platform</li>
            <li>Send transactional emails (account confirmations, order notifications, reservation updates)</li>
            <li>Respond to enquiries and provide support</li>
            <li>Send product updates and relevant communications (you can unsubscribe at any time)</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>
        </Section>

        <Section title="4. Legal Basis for Processing">
          <p>Where applicable under GDPR, we process personal data on the following legal bases:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong className="text-slate-700 dark:text-slate-300">Contract:</strong> to deliver the services you have signed up for</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Legitimate interests:</strong> to improve the platform and communicate relevant updates</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Consent:</strong> for marketing communications and optional cookies</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Legal obligation:</strong> where required by law</li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <p>We retain personal data for as long as your account is active or as needed to provide services. If you close your account, we retain data for up to 90 days before permanent deletion, unless legal obligations require a longer period.</p>
        </Section>

        <Section title="6. Sharing Data with Third Parties">
          <p>We work with a small number of trusted service providers to operate Veno App, including:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong className="text-slate-700 dark:text-slate-300">Supabase</strong> — database and authentication</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Brevo</strong> — transactional email delivery</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Cloudflare</strong> — hosting, CDN, and security</li>
          </ul>
          <p>All third-party providers are contractually bound to handle data securely and only for the purposes we specify.</p>
        </Section>

        <Section title="7. Your Rights">
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data ("right to be forgotten")</li>
            <li>Object to or restrict certain processing</li>
            <li>Receive your data in a portable format</li>
          </ul>
          <p>To exercise any of these rights, email us at <a href="mailto:hello@venoapp.com" className="text-[#6262bd] hover:underline">hello@venoapp.com</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="8. Cookies">
          <p>We use essential cookies to keep you signed in and maintain session state. We may also use analytics cookies where you have given consent. See our <a href="/cookies" className="text-[#6262bd] hover:underline">Cookie Policy</a> for full details.</p>
        </Section>

        <Section title="9. Security">
          <p>We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, loss, or misuse. All data is encrypted in transit (TLS) and at rest.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>We may update this policy from time to time. We will notify registered users of material changes via email. Continued use of the service after changes constitutes acceptance.</p>
        </Section>

        <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">Questions about this policy? Reach us at <a href="mailto:hello@venoapp.com" className="text-[#6262bd] hover:underline font-medium">hello@venoapp.com</a></p>
        </div>

      </div>
    </ServicePageLayout>
  )
}
