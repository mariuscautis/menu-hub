# ✅ Brevo Integration Complete!

Your Menu Hub app is now configured to send emails and SMS using Brevo.

---

## 🎯 What's Been Set Up

### 1. **Brevo SDK Installed**
   - Package: `@getbrevo/brevo`
   - Location: `node_modules/@getbrevo/brevo`

### 2. **Environment Variables Configured**
   - File: `.env.local`
   - Variables:
     ```
     BREVO_API_KEY=your_brevo_api_key_here
     EMAIL_FROM=noreply@venoapp.com
     EMAIL_FROM_NAME=Menu Hub
     BREVO_SMTP_HOST=smtp-relay.brevo.com
     BREVO_SMTP_PORT=587
     BREVO_SMTP_USER=your_smtp_user_here
     BREVO_SMTP_PASS=your_smtp_password_here
     ```

### 3. **Email Service Created**
   - Location: [src/lib/services/email.js](src/lib/services/email.js)
   - Functions available:
     - `sendEmail()` - Send any email
     - `sendPasswordResetEmail()` - Password reset emails
     - `sendWelcomeEmail()` - Welcome new users
     - `sendOrderNotification()` - Order confirmations

### 4. **SMS Service Created**
   - Location: [src/lib/services/sms.js](src/lib/services/sms.js)
   - Functions available:
     - `sendSMS()` - Send any SMS
     - `sendOrderReadySMS()` - Order ready notifications
     - `sendTableReadySMS()` - Table ready notifications
     - `sendReservationConfirmationSMS()` - Reservation confirmations
     - `sendReservationReminderSMS()` - Reservation reminders
     - `sendShiftReminderSMS()` - Staff shift reminders

### 5. **Test API Route Created**
   - Location: [src/app/api/test-email/route.js](src/app/api/test-email/route.js)
   - Test URLs:
     - `http://localhost:3000/api/test-email`
     - `http://localhost:3000/api/test-email?email=your@email.com`
     - `http://localhost:3000/api/test-email?email=your@email.com&type=welcome`

---

## 📋 Next Steps (Manual Configuration Required)

### ⚠️ IMPORTANT: Complete These Steps to Avoid Spam Issues

### Step 1: Configure Supabase SMTP (5 minutes)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Authentication** → **Settings**
4. Scroll to **SMTP Settings**
5. Toggle **"Enable Custom SMTP"** to ON
6. Fill in:
   ```
   Sender email:       noreply@venoapp.com
   Sender name:        Menu Hub
   Host:               smtp-relay.brevo.com
   Port number:        587
   Username:           [your_brevo_smtp_user]
   Password:           [your_brevo_smtp_password]
   ```
7. Click **Save**

**Why?** This ensures password reset emails, email confirmations, etc. from Supabase Auth use your Brevo account.

---

### Step 2: Add Domain to Brevo (10 minutes)

1. Go to https://app.brevo.com
2. Click **Settings** (top right) → **Senders & IP**
3. Click **Domains** tab
4. Click **Add a Domain**
5. Enter: `venoapp.com`
6. Brevo will show DNS records to add (keep this page open)

---

### Step 3: Add DNS Records in Cloudflare (10 minutes)

**Why?** Without these records, your emails WILL go to spam folders.

#### Go to Cloudflare DNS:
1. https://dash.cloudflare.com
2. Select `venoapp.com`
3. Click **DNS** → **Records**

#### Add SPF Record:
```
Type:     TXT
Name:     @
Content:  v=spf1 include:spf.brevo.com ~all
TTL:      Auto
Proxy:    DNS only (gray cloud)
```

#### Add DKIM Records (Brevo provides these):
Brevo will show you 1-3 DKIM records that look like:
```
Type:     TXT
Name:     mail._domainkey
Content:  [Copy exact value from Brevo]
TTL:      Auto
Proxy:    DNS only (gray cloud)
```

**IMPORTANT:** Copy the exact records from Brevo dashboard

#### Add DMARC Record:
```
Type:     TXT
Name:     _dmarc
Content:  v=DMARC1; p=quarantine; rua=mailto:dmarc@venoapp.com
TTL:      Auto
Proxy:    DNS only (gray cloud)
```

#### After Adding Records:
- Wait 10-15 minutes for DNS propagation
- Go back to Brevo → Domains → Click **Verify**
- Status should show **Verified** ✅

---

### Step 4: Test Email Sending (2 minutes)

#### Option A: Using the Test API Route

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Visit in browser:
   ```
   http://localhost:3000/api/test-email?email=YOUR_EMAIL@example.com
   ```

3. Check your inbox (and spam folder)

#### Option B: Using Code

Add this to any server component or API route:

```javascript
import { sendEmail } from '@/lib/services/email'

const result = await sendEmail({
  to: 'your@email.com',
  subject: 'Test from Menu Hub',
  htmlContent: '<h1>It works!</h1>',
  textContent: 'It works!'
})

console.log(result)  // { success: true, messageId: '...' }
```

---

## 🚀 Using Email in Your App

### Example 1: Send Welcome Email After Registration

In [src/app/auth/register/page.js](src/app/auth/register/page.js), after successful signup:

```javascript
import { sendWelcomeEmail } from '@/lib/services/email'

// After user is created
if (user) {
  await sendWelcomeEmail(formData.email, formData.name)
}
```

### Example 2: Send Order Notification

```javascript
import { sendOrderNotification } from '@/lib/services/email'

await sendOrderNotification('manager@restaurant.com', {
  orderNumber: 'ORD-123',
  customerName: 'John Doe',
  items: [
    { name: 'Burger', quantity: 2, price: 12.99 },
    { name: 'Fries', quantity: 1, price: 4.99 }
  ],
  total: 30.97
})
```

### Example 3: Custom Email

```javascript
import { sendEmail } from '@/lib/services/email'

await sendEmail({
  to: 'customer@example.com',
  subject: 'Your Table is Ready',
  htmlContent: `
    <h1>Your table is ready!</h1>
    <p>Please proceed to the host stand.</p>
  `,
  textContent: 'Your table is ready! Please proceed to the host stand.',
  replyTo: 'support@venoapp.com'
})
```

---

## 📱 Using SMS (Optional - Requires Credits)

### Add Credits to Brevo:
1. Go to https://app.brevo.com/settings/billing
2. Add credits (pay-as-you-go)
3. Pricing varies by country

### Example SMS Usage:

```javascript
import { sendOrderReadySMS } from '@/lib/services/sms'

await sendOrderReadySMS('+1234567890', 'ORD-123')
```

**Important:** Phone numbers must be in E.164 format (+country code + number)

---

## 📊 Monitor Your Emails

### Brevo Dashboard
- **Email Stats**: https://app.brevo.com/statistics/email
- **SMS Stats**: https://app.brevo.com/sms/overview
- **Logs**: https://app.brevo.com/email/logs

### What to Monitor:
- ✅ **Delivery Rate**: Should be > 95%
- ✅ **Bounce Rate**: Should be < 2%
- ✅ **Spam Rate**: Should be < 0.1%
- ✅ **Open Rate**: Typically 15-25% for transactional emails

---

## 🔒 Production Deployment

When deploying to Cloudflare Pages, add these environment variables:

1. Go to Cloudflare Pages Dashboard
2. Select your project
3. **Settings** → **Environment variables**
4. Add for **Production**:

```
BREVO_API_KEY=[your_brevo_api_key_from_dashboard]
EMAIL_FROM=noreply@venoapp.com
EMAIL_FROM_NAME=Menu Hub
```

**Note:** You don't need SMTP variables in Cloudflare Pages (those are only for Supabase)

---

## ⚡ Free Tier Limits

### Brevo Free Tier:
- ✅ **300 emails per day** (9,000/month)
- ✅ Unlimited contacts
- ✅ Email templates
- ✅ Real-time statistics
- ❌ SMS requires pay-as-you-go credits

### When to Upgrade:
- If you need > 300 emails/day
- **Lite Plan**: $25/month for **unlimited emails**
- Very reasonable pricing!

---

## 🆘 Troubleshooting

### Emails Going to Spam
✅ **Solution**: Add DNS records (SPF, DKIM, DMARC) - see Step 3 above

### Emails Not Sending
1. Check `.env.local` has `BREVO_API_KEY`
2. Restart dev server: `npm run dev`
3. Check Brevo dashboard → Logs for errors
4. Verify you haven't exceeded 300 emails/day

### "Domain not verified" Error
1. Add DNS records in Cloudflare
2. Wait 10-15 minutes
3. Verify domain in Brevo dashboard

### SMS Not Working
1. Add credits to Brevo account
2. Phone number must be E.164 format (+1234567890)
3. Some countries require sender ID registration

---

## 📚 Documentation Links

- **Brevo Docs**: https://developers.brevo.com/
- **Brevo Node.js SDK**: https://github.com/getbrevo/brevo-node
- **Email Best Practices**: https://help.brevo.com/hc/en-us/categories/4410180102162
- **Brevo Support**: support@brevo.com

---

## ✅ Quick Checklist

Before going live, ensure:

- [ ] Supabase SMTP configured with Brevo
- [ ] Domain added and verified in Brevo
- [ ] SPF, DKIM, DMARC records added to Cloudflare DNS
- [ ] Test email sent successfully
- [ ] Email NOT landing in spam folder
- [ ] Production environment variables added to Cloudflare Pages
- [ ] Monitoring set up in Brevo dashboard

---

## 🎉 You're All Set!

Your Menu Hub app can now send professional emails and SMS notifications through Brevo!

For detailed setup instructions, see [BREVO_SETUP_GUIDE.md](BREVO_SETUP_GUIDE.md)
