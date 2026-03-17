import ServicePageLayout from '@/components/ServicePageLayout'

export const metadata = {
  title: 'Cookie Policy — Veno App',
  description: 'How Veno App uses cookies and similar technologies.',
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

function CookieTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800 text-left">
            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Cookie</th>
            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Purpose</th>
            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Duration</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ name, purpose, duration }, i) => (
            <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
              <td className="px-4 py-3 font-mono text-xs text-[#6262bd]">{name}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{purpose}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-500 whitespace-nowrap">{duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CookiePolicy() {
  return (
    <ServicePageLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">

        <div className="mb-12">
          <span className="inline-block bg-[#6262bd]/10 text-[#6262bd] text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">Legal</span>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">Cookie Policy</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="1. What Are Cookies?">
          <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences, keep you logged in, and understand how visitors use the site. Similar technologies such as local storage and session tokens serve comparable functions.</p>
        </Section>

        <Section title="2. How We Use Cookies">
          <p>Veno App uses cookies in two ways:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong className="text-slate-700 dark:text-slate-300">Essential cookies</strong> — required for the Service to function. These cannot be disabled.</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Analytics cookies</strong> — optional. Used to understand how visitors use the site so we can improve it. Only set with your consent.</li>
          </ul>
        </Section>

        <Section title="3. Cookies We Set">
          <p><strong className="text-slate-700 dark:text-slate-300">Essential (always active)</strong></p>
          <CookieTable rows={[
            { name: 'sb-*-auth-token', purpose: 'Keeps you signed in to your Veno App account (Supabase session)', duration: 'Session / 1 week' },
            { name: 'sb-*-auth-token-code-verifier', purpose: 'PKCE flow security token for OAuth sign-in', duration: 'Session' },
            { name: '__cf_bm', purpose: 'Cloudflare bot management — protects the site from automated abuse', duration: '30 minutes' },
          ]}/>

          <p className="mt-6"><strong className="text-slate-700 dark:text-slate-300">Analytics (optional, requires consent)</strong></p>
          <CookieTable rows={[
            { name: '_ga', purpose: 'Google Analytics — distinguishes unique visitors', duration: '2 years' },
            { name: '_ga_*', purpose: 'Google Analytics — stores session state', duration: '2 years' },
          ]}/>
        </Section>

        <Section title="4. Third-Party Cookies">
          <p>Some third-party services we use may set their own cookies:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong className="text-slate-700 dark:text-slate-300">Cloudflare Turnstile</strong> — used on our contact form to prevent spam. Sets a short-lived verification token.</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Google OAuth</strong> — if you choose "Sign in with Google", Google may set cookies as part of their authentication flow.</li>
          </ul>
          <p>We do not control third-party cookies. Please refer to the respective providers' privacy policies for details.</p>
        </Section>

        <Section title="5. Managing Cookies">
          <p>You can control cookies through your browser settings. Most browsers allow you to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>View and delete existing cookies</li>
            <li>Block cookies from specific sites</li>
            <li>Block all third-party cookies</li>
          </ul>
          <p>Please note that disabling essential cookies will prevent Veno App from functioning correctly — you will not be able to sign in.</p>
          <p>Browser-specific guides: <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[#6262bd] hover:underline">Chrome</a>, <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-[#6262bd] hover:underline">Firefox</a>, <a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[#6262bd] hover:underline">Safari</a>.</p>
        </Section>

        <Section title="6. Changes to This Policy">
          <p>We may update this Cookie Policy when we add or change the technologies we use. The "Last updated" date at the top of this page will reflect any changes.</p>
        </Section>

        <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">Questions about our use of cookies? Contact us at <a href="mailto:hello@venoapp.com" className="text-[#6262bd] hover:underline font-medium">hello@venoapp.com</a></p>
        </div>

      </div>
    </ServicePageLayout>
  )
}
