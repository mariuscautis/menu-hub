# Email Service Setup Guide

This app supports both **Resend** (quick setup) and **AWS SES** (production-ready). You can easily switch between them.

---

## Option 1: Resend (Recommended for Testing)

### Quick Setup (5 minutes)

1. **Sign up:** [resend.com](https://resend.com)
2. **Get API key:** Dashboard → API Keys → Create API Key
3. **Add to `.env.local`:**

```bash
# Email Provider (defaults to 'resend')
EMAIL_PROVIDER=resend

# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Restart dev server:** `npm run dev`

### Testing with Resend

- Use `onboarding@resend.dev` as sender (no verification needed)
- 100 emails/day on free tier
- Works immediately on localhost
- View sent emails in Resend dashboard → Logs

### Using Your Own Domain with Resend

1. Add domain in Resend dashboard
2. Add DNS records they provide
3. Update `EMAIL_FROM=noreply@yourdomain.com`

---

## Option 2: AWS SES (Production Ready)

### Setup Steps (30-60 minutes)

#### 1. AWS Account Setup

- Create AWS account at [aws.amazon.com](https://aws.amazon.com)
- Go to AWS SES console
- Select your region (e.g., us-east-1)

#### 2. Verify Sender Email/Domain

**Option A: Verify Email Address (Quick)**
- SES Console → Verified Identities → Verify an Email Address
- Check your email and click verification link
- **Limitation:** Sandbox mode - can only send to verified addresses

**Option B: Verify Domain (Recommended)**
- SES Console → Verified Identities → Verify a Domain
- Add DNS records (DKIM, SPF, etc.) to your domain
- Wait for verification (a few minutes to a few hours)

#### 3. Request Production Access

**IMPORTANT:** New SES accounts start in sandbox mode

Sandbox limitations:
- Can only send to verified email addresses
- 200 emails/day limit
- No sending to unverified addresses

To request production access:
1. SES Console → Account Dashboard → Request Production Access
2. Fill out the form:
   - **Use case:** Transactional emails (restaurant reservations)
   - **Website URL:** Your domain
   - **Description:** Brief explanation of your use case
   - **Expected sending volume:** Estimate emails per day
3. Submit and wait 24-48 hours for approval

#### 4. Create IAM User with SES Permissions

1. Go to **IAM Console** → Users → Add User
2. User name: `menu-hub-ses-user`
3. Access type: **Programmatic access**
4. Permissions: Attach policy → **AmazonSESFullAccess**
5. Complete creation and **save credentials:**
   - Access Key ID: `AKIA...`
   - Secret Access Key: `wJalrXUtnF...` (save securely!)

#### 5. Add to `.env.local`

```bash
# Email Provider
EMAIL_PROVIDER=aws-ses

# AWS SES Configuration
AWS_SES_ACCESS_KEY_ID=AKIA_your_access_key_here
AWS_SES_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_SES_REGION=us-east-1
EMAIL_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

6. **Restart dev server:** `npm run dev`

### Testing AWS SES in Sandbox Mode

During testing (before production access):
- You can only send to verified email addresses
- Verify test emails in SES Console → Verified Identities
- Each test email needs to be verified individually

### AWS SES Pricing

- **Free Tier:** 62,000 emails/month (if sending from EC2)
- **Paid:** $0.10 per 1,000 emails
- Much cheaper than Resend at scale

---

## Switching Between Providers

Just change the `EMAIL_PROVIDER` variable:

```bash
# Use Resend
EMAIL_PROVIDER=resend

# Use AWS SES
EMAIL_PROVIDER=aws-ses
```

All other configuration stays the same!

---

## Troubleshooting

### Emails Not Sending

1. **Check terminal logs:**
   - "Email sent via Resend: [id]" ✅
   - "Email sent via AWS SES: [MessageId]" ✅
   - "Email service not configured" ❌ (missing env vars)

2. **Verify environment variables:**
   ```bash
   # Restart dev server after changing .env.local
   npm run dev
   ```

3. **Resend issues:**
   - Check API key is correct
   - Check sender email matches Resend domain
   - View Resend dashboard → Logs for errors

4. **AWS SES issues:**
   - Check IAM user has SES permissions
   - Verify sender email/domain in SES console
   - Check region matches in env vars
   - If in sandbox: verify recipient email addresses

### Common AWS SES Errors

**"Email address is not verified"**
- You're in sandbox mode
- Verify recipient email in SES console
- Or request production access

**"Access Denied"**
- IAM user doesn't have SES permissions
- Attach AmazonSESFullAccess policy

**"Invalid credentials"**
- Check access key ID and secret are correct
- Keys may have been deleted in AWS console

---

## Recommendations

### For Development/Testing
✅ **Use Resend**
- Quick setup
- Works immediately
- Free tier is sufficient
- Easy debugging with dashboard

### For Production
✅ **Use AWS SES** (if you prefer AWS ecosystem)
- More cost-effective at scale
- Better deliverability
- Integrated with AWS services

✅ **Or stick with Resend**
- Simple to manage
- Good deliverability
- Reasonable pricing for most use cases
- Less configuration overhead

---

## Security Notes

1. **Never commit `.env.local` to Git** (already in .gitignore)
2. **Use different credentials for production**
3. **Rotate AWS credentials periodically**
4. **Monitor email sending for abuse**
5. **Set up AWS CloudWatch alerts for SES (optional)**

---

## Testing Email Flow

After setup, test the complete flow:

1. **Customer books reservation**
   → Receives "Pending" email

2. **Staff confirms reservation**
   → Customer receives "Confirmation" email

3. **Customer cancels via email link**
   → Reservation cancelled in system

Check your email inbox and spam folder!
