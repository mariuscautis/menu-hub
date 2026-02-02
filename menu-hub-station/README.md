# Menu Hub Station

Local network coordinator for Menu Hub - enables offline order synchronization between staff devices on the same WiFi network.

## Overview

Menu Hub Station acts as a local hub that allows staff devices to sync orders in real-time, even when internet connectivity is unavailable. When internet returns, the Station automatically syncs all orders with Supabase.

### Features

- ✅ **Real-time local sync** via WebSocket
- ✅ **Auto-discovery** using mDNS (Bonjour)
- ✅ **Offline capable** with SQLite local database
- ✅ **Automatic cloud sync** when online
- ✅ **Live dashboard** showing connected devices and order flow
- ✅ **Cross-platform** (Windows, macOS, Linux)

## How It Works

```
┌─────────────┐         Local WiFi         ┌─────────────┐
│   Waiter    │◄──────WebSocket/mDNS──────►│   Kitchen   │
│   Device    │                             │   Device    │
└─────────────┘                             └─────────────┘
      │                                            │
      └──────────► Menu Hub Station ◄─────────────┘
                         │
                    [Internet UP]
                         ↓
                    Supabase Cloud
```

## Installation

### Prerequisites

- Node.js 18+ and npm
- A device to run the Station (computer, tablet, or Raspberry Pi)
- Same WiFi network as your staff devices

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run in development:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   # Windows
   npm run build:win

   # macOS
   npm run build:mac

   # Linux
   npm run build:linux
   ```

## Usage

### Starting the Station

1. Launch the Menu Hub Station app
2. The dashboard will show:
   - Connection status (Online/Offline)
   - Connected devices
   - Recent orders
   - Activity feed

3. Staff devices will automatically discover and connect when they open the Menu Hub app

### Dashboard Overview

- **Connected Devices**: Shows all staff devices currently connected
- **Orders Overview**: Displays pending and synced orders
- **Activity Feed**: Real-time log of orders and sync events
- **System Info**: Server status and sync information

### Sync Behavior

**When Online:**
- Orders sync locally (instant) AND to Supabase (backup)
- Dashboard shows green "Online" status

**When Offline:**
- Orders sync locally between devices (instant)
- Queued for Supabase sync when internet returns
- Dashboard shows red "Offline" status

**Manual Sync:**
- Click "Force Sync" button to immediately sync pending orders

## Network Configuration

### Ports Used

- **3001**: WebSocket server for device connections
- **5173**: Development server (dev mode only)

### Firewall Rules

Ensure these ports are open on your local network:
- Allow incoming connections on port 3001
- Allow mDNS/Bonjour traffic (UDP 5353)

### Router Compatibility

Most home and business WiFi routers support mDNS by default. If devices can't discover the Station:

1. Check that "AP Isolation" or "Client Isolation" is disabled
2. Verify all devices are on the same WiFi network (not guest network)
3. Manually configure the Station IP in device settings (fallback)

## Troubleshooting

### Devices Can't Connect

- **Check WiFi**: Ensure all devices are on the same network
- **Check firewall**: Port 3001 must be open
- **Check AP isolation**: Must be disabled on router
- **Restart Station**: Close and reopen the app

### Orders Not Syncing

- **Check connection**: Green = online, Red = offline
- **Manual sync**: Click "Force Sync" button
- **Check credentials**: Verify Supabase URL and key in `.env`
- **Check logs**: View activity feed for errors

### High Memory Usage

- Station cleans up old synced orders automatically
- Restart the app if memory usage is high
- Check SQLite database size: `ls -lh ~/Library/Application\ Support/Menu\ Hub\ Station/`

## Architecture

### Tech Stack

- **Electron**: Cross-platform desktop app framework
- **React**: Dashboard UI
- **Node.js**: Backend server
- **WebSocket (ws)**: Real-time communication
- **SQLite**: Local database
- **mDNS (bonjour-service)**: Auto-discovery
- **Supabase**: Cloud sync

### File Structure

```
menu-hub-station/
├── src/
│   ├── main/               # Electron main process
│   │   ├── index.js        # App initialization
│   │   ├── database.js     # SQLite operations
│   │   ├── websocket-server.js  # WebSocket server
│   │   ├── discovery.js    # mDNS service
│   │   ├── sync-manager.js # Supabase sync
│   │   └── preload.js      # IPC bridge
│   ├── renderer/           # React frontend
│   │   ├── App.jsx         # Main dashboard
│   │   ├── main.jsx        # React entry
│   │   └── styles.css      # Styling
│   └── shared/             # Shared types/utils
├── package.json
└── vite.config.js
```

## Development

### Running in Dev Mode

```bash
npm run dev
```

This starts:
1. Vite dev server on port 5173
2. Electron app with hot reload
3. DevTools enabled

### Building Installers

```bash
# All platforms
npm run build

# Specific platform
npm run build:win   # Windows (NSIS + Portable)
npm run build:mac   # macOS (DMG + ZIP)
npm run build:linux # Linux (AppImage + DEB)
```

Output: `release/` directory

## Deployment

### For Customers

Provide them with:
1. The installer for their platform (`Menu-Hub-Station-Setup-1.0.0.exe`, etc.)
2. Setup instructions (copy from this README)
3. Supabase credentials (or have them configure)

### Recommended Setup

**Best**: Dedicated device (old laptop, tablet, Raspberry Pi)
- Install Station app
- Configure to run on startup
- Keep device plugged in and connected to WiFi
- Place near router for best signal

**Alternative**: Any staff device (kitchen tablet)
- Install Station app
- Keep app open during business hours
- Other devices will fallback to cloud if closed

## Support

For issues or questions:
- Check troubleshooting section above
- View logs in the Activity Feed
- Contact Menu Hub support

## License

Proprietary - Menu Hub
