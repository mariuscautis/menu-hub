import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/services/email-edge'
import emailTranslations from '@/lib/email-translations'

export const runtime = 'edge'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateLocale(iso, lang) {
  if (!iso) return ''
  const localeMap = { en: 'en-GB', ro: 'ro-RO', fr: 'fr-FR', it: 'it-IT', es: 'es-ES' }
  const locale = localeMap[lang] || 'en-GB'
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function POST(request) {
  try {
    const { restaurantName, email, phone, trialEndsAt } = await request.json()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.venoapp.com'
    const adminEmail = process.env.SUPER_ADMIN_EMAIL

    // ── Admin notification ────────────────────────────────────────────────────
    if (adminEmail) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #6262bd; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
              .field { margin-bottom: 12px; }
              .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
              .value { font-size: 15px; font-weight: 600; color: #333; }
              .button { display: inline-block; padding: 12px 24px; background-color: #6262bd; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #888; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header"><h2 style="margin:0">🎉 New Restaurant Registered</h2></div>
              <div class="content">
                <p>A new restaurant has just signed up on Veno App.</p>
                <div class="field"><div class="label">Restaurant Name</div><div class="value">${restaurantName}</div></div>
                <div class="field"><div class="label">Email</div><div class="value">${email}</div></div>
                ${phone ? `<div class="field"><div class="label">Phone</div><div class="value">${phone}</div></div>` : ''}
                ${trialEndsAt ? `<div class="field"><div class="label">Trial ends</div><div class="value">${formatDate(trialEndsAt)}</div></div>` : ''}
                <p style="text-align:center">
                  <a href="${appUrl}/admin/restaurants" class="button">View in Admin Panel</a>
                </p>
                <div class="footer">Veno App — automated notification</div>
              </div>
            </div>
          </body>
        </html>
      `
      await sendEmail({
        to: adminEmail,
        subject: `New registration: ${restaurantName}`,
        htmlContent,
      }).catch(err => console.error('Admin registration notification failed:', err))
    }

    // ── Welcome email to the new restaurant owner ─────────────────────────────
    // New registrations default to 'en'; they can change it in settings later
    const lang = 'en'
    const t = emailTranslations[lang] || emailTranslations.en

    const trialStart = new Date().toISOString()
    const trialStartFmt = formatDateLocale(trialStart, lang)
    const trialEndFmt = trialEndsAt ? formatDateLocale(trialEndsAt, lang) : ''

    const greeting = t.welcomeGreeting.replace('{restaurantName}', restaurantName)
    const intro = t.welcomeIntro
      .replace('{trialEnd}', trialEndFmt)
    const trialDates = t.welcomeTrialDates
      .replace('{trialStart}', trialStartFmt)
      .replace('{trialEnd}', trialEndFmt)

    const welcomeHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f8; }
            .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
            .header { background-color: #6262bd; color: white; padding: 36px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 26px; }
            .header p { margin: 8px 0 0; opacity: 0.85; font-size: 15px; }
            .content { padding: 32px 30px; }
            .trial-box { background: #f0f0fa; border: 2px solid #6262bd; border-radius: 10px; padding: 20px 24px; margin: 24px 0; }
            .trial-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #6262bd; font-weight: 700; margin-bottom: 6px; }
            .trial-box .dates { font-size: 18px; font-weight: 700; color: #333; }
            .trial-box .note { font-size: 13px; color: #666; margin-top: 8px; }
            .button { display: block; width: fit-content; margin: 28px auto; padding: 14px 32px; background-color: #6262bd; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; }
            .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
            .help { text-align: center; font-size: 13px; color: #888; }
            .help a { color: #6262bd; text-decoration: none; font-weight: 600; }
            .footer { background: #f9f9fb; padding: 18px 30px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${t.welcomeTitle}</h1>
              <p>${greeting}</p>
            </div>
            <div class="content">
              <p>${intro}</p>
              ${trialEndsAt ? `
              <div class="trial-box">
                <div class="label">${t.welcomeTrialLabel}</div>
                <div class="dates">${trialDates}</div>
                <div class="note">${t.welcomeTrialNote}</div>
              </div>` : ''}
              <a href="${appUrl}/dashboard" class="button">${t.welcomeCta}</a>
              <hr class="divider" />
              <p class="help">
                ${t.welcomeHelp}<br/>
                <a href="mailto:support@venoapp.com">${t.welcomeContact}</a>
              </p>
            </div>
            <div class="footer">${t.welcomeFooter}</div>
          </div>
        </body>
      </html>
    `

    await sendEmail({
      to: email,
      subject: t.welcomeSubject,
      htmlContent: welcomeHtml,
    }).catch(err => console.error('Welcome email failed:', err))

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('restaurant-registered notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
