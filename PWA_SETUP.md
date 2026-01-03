# Menu Hub PWA Setup

Menu Hub is now a **Progressive Web App (PWA)**! This means it can be installed on any device (phones, tablets, computers) and works offline.

## What's Been Implemented

### Core PWA Features
- ✅ **Installable**: Users can install Menu Hub like a native app
- ✅ **Offline Support**: Critical features work without internet
- ✅ **Fast Loading**: Assets cached for instant loading
- ✅ **Auto-Updates**: App updates automatically when you deploy
- ✅ **Install Prompts**: Beautiful UI to encourage installation
- ✅ **Offline Indicator**: Users see when they're offline

### Caching Strategy
The PWA uses intelligent caching:

1. **Supabase API** - NetworkFirst (24hr cache)
2. **Supabase Storage** - CacheFirst (30 days)
3. **Images** - CacheFirst (30 days)
4. **Static Resources** - StaleWhileRevalidate (24hrs)
5. **Other Requests** - NetworkFirst (24hrs)

## How to Install (For Restaurant Owners)

### On Mobile (iOS/Android)

#### **iPhone/iPad (Safari)**
1. Open Menu Hub in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. Menu Hub icon now appears on your home screen!

#### **Android (Chrome)**
1. Open Menu Hub in Chrome
2. Tap the three dots menu (⋮)
3. Tap "Install app" or "Add to Home screen"
4. Tap "Install"
5. Menu Hub icon now appears on your home screen!

### On Desktop

#### **Chrome/Edge**
1. Open Menu Hub
2. Look for the install icon (⊕) in the address bar
3. Click "Install"
4. Menu Hub opens in its own window!

#### **Safari (macOS)**
1. Open Menu Hub in Safari
2. File → Add to Dock
3. Menu Hub appears in your Dock!

## For Developers

### Build Commands

```bash
# Development (PWA disabled for hot reload)
npm run dev

# Production build (PWA enabled)
npm run build -- --webpack
npm start

# Preview production locally
npm run build -- --webpack && npm start
```

### File Structure

```
menu-hub/
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── icon-*.png             # App icons (various sizes)
│   ├── sw.js                  # Service worker (auto-generated)
│   └── workbox-*.js           # Workbox runtime (auto-generated)
├── src/
│   ├── components/
│   │   ├── PWAInstallPrompt.js   # Install prompt UI
│   │   └── OfflineIndicator.js   # Offline status indicator
│   └── app/
│       ├── layout.js             # PWA metadata
│       └── globals.css           # PWA animations
└── next.config.mjs            # PWA configuration
```

### Icons

Current icons are placeholders with "MH" text. To use your restaurant logo:

1. Create a square PNG/SVG of your logo (512x512px minimum)
2. Use an online tool: https://realfavicongenerator.net/
3. Replace files in `/public/icon-*.png`

### Testing PWA Locally

1. Build for production:
   ```bash
   npm run build -- --webpack
   npm start
   ```

2. Open `http://localhost:3000` in Chrome

3. Open DevTools → Application → Service Workers
   - Should see "Activated and is running"

4. Open DevTools → Application → Manifest
   - Should see app name, icons, etc.

5. Test offline:
   - DevTools → Network → Check "Offline"
   - Refresh page - should still work!

### Deployment

PWA works automatically on Vercel, Netlify, or any static host.

**Important**: Your production URL must use HTTPS (PWA requirement).

## Features That Work Offline

### ✅ Works Offline
- View cached orders
- View cached reservations
- View cached rota/schedule
- View cached menu
- View cached staff list

### ⚠️ Requires Internet
- Create new orders
- Create new reservations
- Update rota
- Send magic links
- Real-time updates

## Future Enhancements

### Phase 2 (Optional)
- Push notifications for new orders
- Background sync for offline actions
- Offline order queue
- Share target (share to Menu Hub from other apps)

### Phase 3 (Optional)
- Native iOS app (if needed)
- Native Android app (if needed)

## Troubleshooting

### PWA not installing?
- Ensure you're using HTTPS (required for PWA)
- Check DevTools → Console for errors
- Clear browser cache and reload

### Service worker not updating?
- Hard refresh (Ctrl/Cmd + Shift + R)
- Clear site data: DevTools → Application → Clear storage

### Offline mode not working?
- Check DevTools → Application → Service Workers
- Ensure "Update on reload" is checked during development
- Verify caching strategy in `next.config.mjs`

## Support

PWA works on:
- ✅ Chrome/Edge 67+
- ✅ Safari 11.1+ (iOS 11.3+)
- ✅ Firefox 79+
- ✅ Samsung Internet 8.0+

95%+ of users globally can install and use Menu Hub as a PWA.

---

**Note**: PWA is disabled in development mode for better developer experience. Build for production to test PWA features.
