# Menu Hub Station - Implementation Guide

## Overview

Menu Hub Station has been successfully implemented! This document explains how the system works and how to use it.

## What Was Built

### 1. Menu Hub Station (Standalone Coordinator App)

**Location:** `/menu-hub-station/`

A cross-platform Electron application that acts as a local network hub for offline order synchronization.

**Features:**
- ✅ WebSocket server for real-time device connections
- ✅ mDNS auto-discovery (devices find it automatically on WiFi)
- ✅ SQLite database for local order storage
- ✅ Automatic sync with Supabase when online
- ✅ Beautiful dashboard showing connected devices and order flow
- ✅ Cross-platform (Windows, Mac, Linux)

**Key Files:**
- [src/main/index.js](menu-hub-station/src/main/index.js) - Main Electron process
- [src/main/websocket-server.js](menu-hub-station/src/main/websocket-server.js) - WebSocket server
- [src/main/database.js](menu-hub-station/src/main/database.js) - SQLite operations
- [src/main/discovery.js](menu-hub-station/src/main/discovery.js) - mDNS service
- [src/main/sync-manager.js](menu-hub-station/src/main/sync-manager.js) - Supabase sync
- [src/renderer/App.jsx](menu-hub-station/src/renderer/App.jsx) - Dashboard UI

### 2. Main App Integration

**Location:** `/menu-hub/src/lib/` and `/menu-hub/src/hooks/`

The main Menu Hub app has been updated to detect and use the Station when available.

**New Files:**
- [menu-hub/src/lib/localHubClient.js](menu-hub/src/lib/localHubClient.js) - WebSocket client for connecting to Station
- [menu-hub/src/components/HubConnectionStatus.jsx](menu-hub/src/components/HubConnectionStatus.jsx) - UI component showing connection status

**Modified Files:**
- [menu-hub/src/hooks/useOfflineOrder.js](menu-hub/src/hooks/useOfflineOrder.js) - Updated to use local hub

## How It Works

### Connection Priority

When a staff member places an order, the system tries in this order:

1. **Local Hub** (if connected) → Instant local sync
2. **Supabase** (if online but no hub) → Cloud sync
3. **IndexedDB** (if offline) → Queue for later

### Architecture

```
┌─────────────┐         Local WiFi         ┌─────────────┐
│   Waiter    │◄────WebSocket (ws://)─────►│   Kitchen   │
│   Device    │                             │   Device    │
└─────────────┘                             └─────────────┘
      │                                            │
      │              ┌──────────────┐              │
      └─────────────►│ Menu Hub     │◄─────────────┘
                     │ Station      │
                     │(Port 3001)   │
                     └───────┬──────┘
                             │
                        [Internet]
                             ↓
                      ┌──────────────┐
                      │   Supabase   │
                      └──────────────┘
```

### Auto-Discovery

- Station broadcasts on local network via mDNS
- Staff devices automatically find it on WiFi
- No manual IP configuration needed
- Falls back to IP scanning if mDNS unavailable

### Order Flow

1. **Waiter places order** on phone/tablet
2. **Order sent to Station** via WebSocket (instant)
3. **Station broadcasts** to kitchen/bar devices
4. **Kitchen receives** order in real-time
5. **Station syncs** with Supabase in background
6. **All changes propagate** to all devices

## Getting Started

### Setup Station

1. **Configure Supabase credentials:**
   ```bash
   cd menu-hub-station
   cp .env.example .env
   # Edit .env with your Supabase URL and key
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   # For your platform
   npm run build:mac    # macOS
   npm run build:win    # Windows
   npm run build:linux  # Linux
   ```

### Use in Main App

The main app will automatically discover and connect to the Station. No code changes needed!

**To show connection status in your UI:**

```jsx
import HubConnectionStatus from '@/components/HubConnectionStatus'

function MyComponent() {
  return (
    <div>
      <HubConnectionStatus />
    </div>
  )
}
```

**Or use the compact badge:**

```jsx
import { HubConnectionBadge } from '@/components/HubConnectionStatus'

function Header() {
  return (
    <div className="flex items-center gap-4">
      <h1>Restaurant Dashboard</h1>
      <HubConnectionBadge />
    </div>
  )
}
```

## Testing

### Test Locally (Same Computer)

1. Start Station:
   ```bash
   cd menu-hub-station
   npm run dev
   ```

2. Start main app:
   ```bash
   cd menu-hub
   npm run dev
   ```

3. Open main app in browser
4. Check browser console - should see: `[LocalHub] Connected to: ws://...`
5. Place a test order
6. Watch it appear in Station dashboard

### Test on Network (Multiple Devices)

1. Install Station on one device (computer/tablet)
2. Note the IP address shown in Station dashboard
3. Open main app on phones/tablets on same WiFi
4. Devices should auto-connect to Station
5. Place orders and watch them sync in real-time

## Production Deployment

### For Customers

**Option 1: Dedicated Device (Recommended)**
- Provide installer for their platform
- They install on old laptop, tablet, or Raspberry Pi
- Configure Supabase credentials
- Keep device powered on during business hours

**Option 2: Kitchen Tablet**
- Install Station on kitchen tablet
- Keep app open while restaurant is open
- If closed, orders fall back to cloud sync

### Distribution

Build installers:
```bash
cd menu-hub-station
npm run build
```

Installers will be in `release/` directory:
- Windows: `.exe` (NSIS installer) and portable
- macOS: `.dmg` and `.zip`
- Linux: `.AppImage` and `.deb`

### Configuration

Create `.env` file with customer's Supabase credentials:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

## Troubleshooting

### Devices Can't Connect

**Check:**
- ✅ All devices on same WiFi network
- ✅ Station app is running
- ✅ Port 3001 is not blocked by firewall
- ✅ Router has "AP Isolation" disabled

**Debug:**
- Open browser console on staff device
- Look for `[LocalHub]` messages
- Check Station dashboard for connected devices

### Orders Not Syncing

**Check:**
- ✅ Station shows "Online" (green) status
- ✅ Supabase credentials are correct
- ✅ Internet connection is working

**Manual Sync:**
- Click "Force Sync" button in Station dashboard
- Check Activity Feed for errors

### Performance Issues

**Optimize:**
- Restart Station app
- Clear old orders (Station auto-cleans)
- Check SQLite database size
- Reduce number of connected devices

## Security Considerations

- WebSocket runs on local network only (not exposed to internet)
- Station uses same Supabase credentials as main app
- No authentication between devices (trust local network)
- For production: Consider adding device authentication

## Future Enhancements

Potential features to add:

1. **Device Authentication**
   - PIN code or token to connect to Station
   - Prevent unauthorized devices

2. **Manual IP Configuration**
   - Settings page to manually specify Station IP
   - Useful if auto-discovery fails

3. **Better Conflict Resolution**
   - Operational transforms for concurrent edits
   - More sophisticated merge logic

4. **Station-to-Station Sync**
   - Multiple Stations in same restaurant
   - Useful for large venues

5. **Mobile Station App**
   - iOS/Android version of Station
   - Use any tablet as coordinator

## Support

For issues:
1. Check troubleshooting section above
2. View logs in Station Activity Feed
3. Check browser console for device-side issues
4. Review [Menu Hub Station README](menu-hub-station/README.md)

## Summary

You now have:
- ✅ Menu Hub Station app (standalone coordinator)
- ✅ Main app integration (automatic discovery)
- ✅ Real-time local sync between devices
- ✅ Graceful fallback to cloud sync
- ✅ Beautiful dashboard with monitoring
- ✅ Cross-platform installers
- ✅ Ready for production deployment

The system is **plug-and-play** for customers who just need to:
1. Install Station on one device
2. Configure Supabase credentials
3. Keep it running during business hours

All staff devices will automatically discover and connect! 🎉
