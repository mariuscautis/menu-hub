# Cloudflare Pages Secrets Configuration Guide

## Overview

This project uses `wrangler.toml` for environment variable configuration. Because of this:
- **Non-sensitive variables** (like EMAIL_FROM, BASE_URL) are stored in `wrangler.toml`
- **Sensitive variables** (like API keys) MUST be added as **Secrets** via the Cloudflare dashboard

## Required Secrets to Add

You need to add the following secrets to your Cloudflare Pages project:

### 1. BREVO_API_KEY
- **Value**: `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`
- **Purpose**: Brevo API key for sending emails and SMS
- **Required for**: Production and Preview environments

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Value**: Your Supabase anonymous key
- **Purpose**: Public key for Supabase client connections
- **Required for**: Production and Preview environments

### 3. SUPABASE_SERVICE_ROLE_KEY
- **Value**: Your Supabase service role key
- **Purpose**: Server-side access to Supabase with elevated permissions
- **Required for**: Production and Preview environments

## How to Add Secrets in Cloudflare Dashboard

### Step 1: Go to Cloudflare Pages Dashboard
1. Navigate to https://dash.cloudflare.com
2. Select **Workers & Pages** from the left sidebar
3. Click on your project: **venoapp** (or whatever your project is named)

### Step 2: Navigate to Settings
1. Click the **Settings** tab at the top
2. Scroll down to **Environment variables**

### Step 3: Add Each Secret

For **EACH** secret listed above:

1. Click **Add variable** button
2. In the **Variable name** field, enter the exact name (e.g., `BREVO_API_KEY`)
3. Select the **Type**: Choose **Secret** (this encrypts the value)
4. In the **Value** field, paste the secret value
5. Choose which environments to apply to:
   - ✅ Check **Production** (for your live site)
   - ✅ Check **Preview** (for preview deployments)
6. Click **Save**

### Step 4: Verify Secrets Are Added

After adding all secrets, you should see them listed under Environment variables with:
- A lock icon 🔒 indicating they're encrypted
- The type showing as "Secret"
- Applied to both Production and Preview environments

## Important Notes

- **Secrets vs Plaintext**:
  - Secrets are encrypted and never exposed in logs or the dashboard
  - They are only available at runtime to your application
  - You cannot edit a secret's value - you must delete and recreate it

- **Existing Secrets**:
  - If you already added BREVO_API_KEY as a secret, that's perfect!
  - Just verify it has the correct value and is applied to both environments

- **After Adding Secrets**:
  - Cloudflare automatically redeploys when you add/modify secrets
  - Wait for the deployment to complete before testing
  - Check the deployment logs to ensure no errors

## Testing After Configuration

Once all secrets are added:

1. Wait for the automatic redeployment to complete
2. Test the email API endpoint:
   ```
   https://www.venoapp.com/api/test-email?email=your-email@example.com
   ```

3. Check the debug endpoint to verify environment variables are loaded:
   ```
   https://www.venoapp.com/api/debug-brevo
   ```

   You should see:
   ```json
   {
     "apiKeyPresent": true,
     "apiKeyLength": 96,
     "apiKeyPrefix": "xkeysib-0b36da3",
     "emailFrom": "noreply@venoapp.com",
     "emailFromName": "Menu Hub",
     "nodeEnv": "production"
   }
   ```

## Troubleshooting

### "Key not found" error
- Verify the secret name is exactly `BREVO_API_KEY` (case-sensitive)
- Ensure it's applied to both Production and Preview environments
- Wait for the deployment to complete after adding the secret

### Secret not working after adding
- Check deployment logs for any errors
- Try deleting and recreating the secret
- Ensure you selected "Secret" type, not "Plaintext"

### Need to update a secret value
- You cannot edit existing secrets
- Delete the old secret
- Add a new one with the updated value

## Security Best Practices

✅ **DO:**
- Use Secrets for all API keys and sensitive data
- Apply secrets to all environments that need them
- Keep your API keys secure and don't share them

❌ **DON'T:**
- Commit secrets to Git (GitHub will block this)
- Use Plaintext variables for sensitive data
- Share secrets in public channels or documentation

## What's Already Configured

The following non-sensitive variables are already configured in `wrangler.toml`:
- EMAIL_FROM
- EMAIL_FROM_NAME
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_BASE_URL

You do NOT need to add these as secrets in the dashboard.
