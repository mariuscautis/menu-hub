# Brevo Email & SMS Setup Guide

## ✅ Completed Steps

1. **Brevo Account Created**
2. **API Key Generated**
3. **SMTP Credentials Obtained**
4. **Brevo SDK Installed** (`@getbrevo/brevo`)
5. **Environment Variables Configured**
6. **Email Service Created** (`src/lib/services/email.js`)
7. **SMS Service Created** (`src/lib/services/sms.js`)

---

## 📧 Configure Supabase to Use Brevo SMTP

### Step 1: Log into Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `Menu Hub`

### Step 2: Navigate to Auth Settings

1. Click **Authentication** in the left sidebar
2. Click **Settings** (or **Providers** → **Email**)
3. Scroll down to **SMTP Settings**

### Step 3: Enable Custom SMTP

1. Toggle **"Enable Custom SMTP"** to ON
2. Fill in the following details:

```
Sender email:       noreply@venoapp.com
Sender name:        Menu Hub

Host:               smtp-relay.brevo.com
Port number:        587
Username:           [your_brevo_smtp_user]
Password:           [your_brevo_smtp_password]
```

3. Click **Save**

### Step 4: Test Email Sending

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Try to invite a new user or trigger a password reset
3. Check if the email is received

---

## 🌐 Add DNS Records in Cloudflare (Important!)

Without these DNS records, your emails will go to spam. Follow these steps:

### Step 1: Get SPF, DKIM, and DMARC Records from Brevo

1. Log into Brevo: https://app.brevo.com
2. Go to **Settings** (top right) → **Senders & IP**
3. Click **Domains**
4. Click **Add a Domain**
5. Enter: `venoapp.com`
6. Brevo will show you 3 types of records to add

### Step 2: Add Records to Cloudflare DNS

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
2. Select domain: `venoapp.com`
3. Click **DNS** in the left sidebar
4. Click **Add record** for each of the following:

#### SPF Record
```
Type:     TXT
Name:     @
Content:  v=spf1 include:spf.brevo.com ~all
TTL:      Auto
```

#### DKIM Records (Brevo will provide these - usually 2 records)
```
Type:     TXT
Name:     mail._domainkey (or as shown in Brevo)
Content:  [Copy from Brevo]
TTL:      Auto
```

#### DMARC Record
```
Type:     TXT
Name:     _dmarc
Content:  v=DMARC1; p=quarantine; rua=mailto:dmarc@venoapp.com
TTL:      Auto
```

### Step 3: Verify Domain in Brevo

1. After adding DNS records, wait 10-15 minutes
2. Go back to Brevo → **Domains**
3. Click **Verify** next to `venoapp.com`
4. Status should show **Verified** ✅

---

## 📱 SMS Setup (Optional)

### Prerequisites for SMS

1. **Add Credits to Brevo Account**
   - Go to https://app.brevo.com/settings/billing
   - Add credits for SMS (pay-as-you-go)
   - Pricing varies by country

2. **Verify Your Phone Numbers (for testing)**
   - Go to https://app.brevo.com/sms/overview
   - Add test phone numbers

3. **Sender Name**
   - By default, "MenuHub" is used
   - Some countries require pre-registered sender IDs

### SMS Usage in Code

```javascript
import { sendSMS, sendOrderReadySMS } from '@/lib/services/sms'

// Send custom SMS
await sendSMS({
  to: '+1234567890',  // E.164 format
  message: 'Your order is ready!'
})

// Send order ready notification
await sendOrderReadySMS('+1234567890', 'ORD-123')
```

---

## 🧪 Testing Email Functionality

### Option 1: Create a Test API Route

Create a file: `src/app/api/test-email/route.js`

```javascript
import { sendEmail, sendWelcomeEmail } from '@/lib/services/email'

export async function GET(request) {
  try {
    // Test basic email
    const result = await sendEmail({
      to: 'your-email@example.com',  // Replace with your email
      subject: 'Test Email from Menu Hub',
      htmlContent: '<h1>Hello!</h1><p>This is a test email from Menu Hub.</p>',
      textContent: 'Hello! This is a test email from Menu Hub.'
    })

    if (result.success) {
      return Response.json({
        success: true,
        message: 'Email sent successfully!',
        messageId: result.messageId
      })
    } else {
      return Response.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
```

Then visit: `http://localhost:3000/api/test-email` in your browser

### Option 2: Test from Browser Console

1. Start your dev server: `npm run dev`
2. Open browser console on your app
3. Run this test:

```javascript
fetch('/api/test-email')
  .then(res => res.json())
  .then(data => console.log(data))
```

---

## 📊 Monitor Email Performance

### Brevo Dashboard

1. Go to https://app.brevo.com/statistics/email
2. View:
   - Emails sent
   - Open rates
   - Bounce rates
   - Spam reports

### Important Metrics to Watch

- **Bounce Rate**: Should be < 2%
- **Spam Rate**: Should be < 0.1%
- **Delivery Rate**: Should be > 95%

---

## 🚀 Using Email Service in Your App

### Send Password Reset Email

```javascript
import { sendPasswordResetEmail } from '@/lib/services/email'

// In your password reset handler
const resetLink = `https://venoapp.com/reset-password?token=${token}`
await sendPasswordResetEmail(userEmail, resetLink)
```

### Send Welcome Email

```javascript
import { sendWelcomeEmail } from '@/lib/services/email'

// After user registration
await sendWelcomeEmail(userEmail, userName)
```

### Send Custom Email

```javascript
import { sendEmail } from '@/lib/services/email'

await sendEmail({
  to: 'customer@example.com',
  subject: 'Order Confirmation',
  htmlContent: '<h1>Thank you for your order!</h1>',
  textContent: 'Thank you for your order!',
  replyTo: 'support@venoapp.com'
})
```

---

## 🔒 Security Best Practices

1. **Never expose API keys in frontend code**
   - Always use server-side API routes or server components
   - Environment variables are only available server-side in Next.js

2. **Validate email addresses**
   - Check format before sending
   - Implement rate limiting to prevent abuse

3. **Monitor for abuse**
   - Check Brevo dashboard regularly
   - Set up alerts for unusual activity

4. **Use different API keys for development and production**
   - Create separate API keys in Brevo
   - Use `.env.local` for development
   - Add production keys to Cloudflare Pages environment variables

---

## 📝 Adding to Cloudflare Pages Environment Variables

When you deploy to production:

1. Go to Cloudflare Pages Dashboard
2. Select your project
3. Go to **Settings** → **Environment variables**
4. Add these variables:

```
BREVO_API_KEY=[your_brevo_api_key_from_dashboard]
EMAIL_FROM=noreply@venoapp.com
EMAIL_FROM_NAME=Menu Hub
```

---

## 🆘 Troubleshooting

### Emails Going to Spam

- ✅ Verify DNS records (SPF, DKIM, DMARC) are added correctly
- ✅ Domain is verified in Brevo
- ✅ Send from verified domain (noreply@venoapp.com)
- ✅ Include both HTML and plain text versions
- ✅ Avoid spam trigger words (FREE, URGENT, CLICK HERE)

### Emails Not Sending

- ✅ Check API key is correct in `.env.local`
- ✅ Check Brevo dashboard for error logs
- ✅ Verify you haven't exceeded free tier limits (300/day)
- ✅ Check server logs for error messages

### SMS Not Working

- ✅ Phone number must be in E.164 format (+1234567890)
- ✅ Account must have SMS credits
- ✅ Some countries require sender ID registration
- ✅ Check Brevo SMS dashboard for delivery status

---

## 📞 Support

- **Brevo Documentation**: https://developers.brevo.com/
- **Brevo Support**: support@brevo.com
- **Brevo Status Page**: https://status.brevo.com/

---

## 🎉 Next Steps

1. ✅ Configure Supabase SMTP (see above)
2. ✅ Add DNS records to Cloudflare (see above)
3. ✅ Test email sending with test API route
4. ✅ Integrate email sending into your app flows
5. ✅ (Optional) Set up SMS functionality
6. ✅ Monitor email performance in Brevo dashboard
