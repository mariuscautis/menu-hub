# Automatic No-Show Cancellation Setup Guide

This system automatically marks overdue reservations as "No Show" when the reservation time has passed and no action has been taken by staff.

## How It Works

### Current Setup (Development)
- The reservations dashboard checks for overdue reservations **every time the page loads**
- Any reservation that is still "pending" or "confirmed" past its reservation time is automatically marked as "No Show"
- Status changes trigger real-time updates across all connected dashboards

### What Gets Marked as No Show
A reservation is marked as "No Show" if:
1. Status is "pending" or "confirmed" (not already completed, denied, or cancelled)
2. The reservation date is in the past, OR
3. The reservation date is today and the reservation time has passed

### Status Updates
- **Status**: Changed from `pending/confirmed` to `no_show`
- **Cancellation Reason**: "Automatic cancellation - No show"
- **Cancelled At**: Current timestamp
- **Badge Color**: Purple badge in the UI

---

## Production Setup (Recommended)

For production environments, you should set up a scheduled task (cron job) that runs every 15-30 minutes to check for overdue reservations automatically, rather than relying on someone visiting the page.

### Option 1: Vercel Cron Jobs (Easiest if deployed on Vercel)

1. Create a file `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/reservations/auto-cancel-no-shows",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

This runs every 15 minutes.

2. Add a `CRON_SECRET` environment variable in Vercel:
   - Go to your Vercel project settings
   - Navigate to Environment Variables
   - Add: `CRON_SECRET=your-random-secret-key-here` (generate a strong random string)

3. Deploy your app - Vercel will automatically set up the cron job

### Option 2: External Cron Service (Works with any hosting)

Use a service like **cron-job.org**, **EasyCron**, or **Uptime Robot**:

1. Sign up for a cron service
2. Add your environment variable `CRON_SECRET` to your hosting platform
3. Set up a GET request to:
   ```
   https://your-domain.com/api/reservations/auto-cancel-no-shows
   ```
4. Add authorization header:
   ```
   Authorization: Bearer your-cron-secret-here
   ```
5. Schedule to run every 15-30 minutes

### Option 3: Server-Side Cron (Self-Hosted)

If you're running on your own server:

1. Add to your crontab:
```bash
# Run every 15 minutes
*/15 * * * * curl -X GET \
  -H "Authorization: Bearer your-cron-secret" \
  https://your-domain.com/api/reservations/auto-cancel-no-shows
```

---

## Environment Variables

Add this to your `.env.local` (development) and production environment:

```bash
# Cron job secret for auto-cancel endpoint
CRON_SECRET=your-random-secret-key-here
```

**Generate a strong secret:**
```bash
# On Mac/Linux:
openssl rand -base64 32

# Or use an online generator
```

---

## Testing

### Test Manually
You can trigger the auto-cancel check manually:

```bash
# Using POST (no auth required in dev)
curl -X POST http://localhost:3000/api/reservations/auto-cancel-no-shows

# Using GET (requires auth)
curl -X GET \
  -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/reservations/auto-cancel-no-shows
```

### Check Logs
Monitor your server logs to see:
- How many reservations were checked
- How many were marked as no-show
- Any errors

Example log output:
```
Auto-cancel check started at: 2025-01-15T14:30:00.000Z
Current date: 2025-01-15 Current time: 14:30
Found 12 pending/confirmed reservations to check
Found 3 overdue reservations
Successfully marked 3 reservations as no-show
```

---

## Frequency Recommendations

- **Every 15 minutes**: Good balance for most restaurants
- **Every 30 minutes**: Sufficient for less busy restaurants
- **Every 5-10 minutes**: High-volume restaurants with tight scheduling

The check is fast and doesn't consume many resources, so running every 15 minutes is recommended.

---

## Manual Override

Staff can always manually mark a reservation as:
- **Completed**: Guest arrived
- **No Show**: Manually mark as no-show
- **Cancelled**: Cancel with a reason

The auto-cancel system only affects reservations that are still pending or confirmed after their time has passed.

---

## Monitoring

To monitor the system:
1. Check the Reservations dashboard for purple "No Show" badges
2. Filter by "No Show" status to see all automatically cancelled reservations
3. Review server logs for auto-cancel runs
4. Set up alerts if no auto-cancels run for extended periods (indicates cron job failure)

---

## Troubleshooting

### Cron Job Not Running
- Verify `CRON_SECRET` is set correctly
- Check authorization header format: `Bearer <secret>`
- Review hosting platform's cron job logs

### Reservations Not Being Marked
- Check server logs for errors
- Verify reservation times are being compared correctly
- Ensure reservations table has correct datetime values

### Too Many No-Shows
- Review your reservation confirmation workflow
- Consider sending reminder emails before reservation time
- Check if customers understand they need to show up or cancel

---

## Future Enhancements

Possible improvements:
1. Send email notification to customer when marked as no-show
2. Track no-show patterns by customer email (for repeat offenders)
3. Add grace period (e.g., mark as no-show 15 minutes after reservation time)
4. Dashboard analytics showing no-show rates
5. Automatic blacklist for customers with multiple no-shows
