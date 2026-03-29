const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const { initializeDatabase } = require('./database');
const { startWebSocketServer } = require('./websocket-server');
const { startDiscoveryService, getLocalAddresses } = require('./discovery');
const { syncWithSupabase, setSupabaseCredentials } = require('./sync-manager');

let mainWindow = null;
let tray = null;
let isQuitting = false;

let serverState = {
  wsServer: null,
  discoveryService: null,
  db: null,
  connectedDevices: [],
  isOnline: true,
  lastSync: null
};

// ─── Tray icon (16×16 purple square with "H" — no external file needed) ──────
function createTrayIcon() {
  // 16×16 PNG encoded as base64 — a simple solid #6262bd square
  // Generated with: canvas 16×16, fill #6262bd, export PNG → base64
  const iconBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVQ4jWNg' +
    'YGD4z0ABYBo1gHoAABBAAUBdkMiCAAAAAElFTkSuQmCC'
  return nativeImage.createFromDataURL(`data:image/png;base64,${iconBase64}`)
}

// ─── Window ────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Menu Hub Station',
    backgroundColor: '#1a1a1a',
    show: false, // Show after ready-to-show to avoid flash
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    // Only show the window on manual open, not on auto-start
    if (!app.getLoginItemSettings().openedAtLogin) {
      mainWindow.show();
    }
  });

  // Minimise to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      // Show balloon hint the first time only
      if (process.platform === 'win32' && tray) {
        tray.displayBalloon({
          iconType: 'info',
          title: 'Menu Hub Station',
          content: 'Still running in the background. Right-click the tray icon to quit.',
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── System tray ───────────────────────────────────────────────────────────
function createTray() {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Menu Hub Station — Hub running');

  function buildMenu() {
    const devices = serverState.connectedDevices || [];
    const deviceItems = devices.length > 0
      ? devices.map(d => ({ label: `  ${d.deviceName} (${d.deviceRole})`, enabled: false }))
      : [{ label: '  No devices connected', enabled: false }];

    const autoStart = app.getLoginItemSettings().openAtLogin;

    return Menu.buildFromTemplate([
      { label: 'Menu Hub Station', enabled: false },
      { type: 'separator' },
      {
        label: serverState.wsServer ? '🟢 Hub server running' : '🔴 Hub server stopped',
        enabled: false,
      },
      {
        label: serverState.isOnline ? '🌐 Internet: Online' : '📵 Internet: Offline',
        enabled: false,
      },
      { type: 'separator' },
      { label: `Connected devices (${devices.length}):`, enabled: false },
      ...deviceItems,
      { type: 'separator' },
      {
        label: 'Start with computer',
        type: 'checkbox',
        checked: autoStart,
        click: () => toggleAutoStart(!autoStart),
      },
      { type: 'separator' },
      {
        label: 'Open dashboard',
        click: () => {
          if (!mainWindow) createWindow();
          mainWindow.show();
          mainWindow.focus();
        },
      },
      {
        label: 'Force sync now',
        enabled: serverState.isOnline,
        click: async () => {
          try {
            await syncWithSupabase(serverState);
            serverState.lastSync = new Date().toISOString();
            tray.setToolTip(`Menu Hub Station — Last sync: just now`);
          } catch (e) {
            dialog.showErrorBox('Sync failed', e.message);
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Menu Hub Station',
        click: () => {
          isQuitting = true;
          cleanup();
          app.quit();
        },
      },
    ]);
  }

  tray.setContextMenu(buildMenu());

  // Rebuild menu whenever state changes
  tray.on('double-click', () => {
    if (!mainWindow) createWindow();
    mainWindow.show();
    mainWindow.focus();
  });

  // Export so sendStateUpdate can refresh the tray menu
  tray._buildMenu = buildMenu;
}

// ─── Auto-start with OS ─────────────────────────────────────────────────────
function setupAutoStart() {
  // Enable auto-start by default on first run
  const settings = app.getLoginItemSettings();
  if (!settings.openAtLogin) {
    toggleAutoStart(true);
    console.log('[Station] Auto-start enabled on first run');
  }
}

function toggleAutoStart(enable) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    // On Windows, pass --hidden so it starts minimised to tray, not as a visible window
    args: enable ? ['--hidden'] : [],
    name: 'Menu Hub Station',
  });
  console.log(`[Station] Auto-start ${enable ? 'enabled' : 'disabled'}`);
  // Refresh tray menu to reflect new state
  if (tray && tray._buildMenu) {
    tray.setContextMenu(tray._buildMenu());
  }
}

// ─── Station initialisation ─────────────────────────────────────────────────
async function initializeStation() {
  try {
    console.log('[Station] Initializing Menu Hub Station...');

    // Initialize database
    serverState.db = await initializeDatabase();
    console.log('[Station] Database initialized');

    // Start WebSocket server
    serverState.wsServer = await startWebSocketServer(serverState);
    console.log('[Station] WebSocket server started on port 3001');

    // Start mDNS discovery service
    serverState.discoveryService = await startDiscoveryService();
    console.log('[Station] Discovery service started');

    // Start sync manager
    startSyncLoop();
    console.log('[Station] Sync manager started');

    // Refresh tray with running state
    if (tray && tray._buildMenu) {
      tray.setContextMenu(tray._buildMenu());
      const ips = getLocalAddresses();
      tray.setToolTip(`Menu Hub Station — ws://${ips[0] || 'localhost'}:3001`);
    }

    // Send initial state to renderer if open
    sendStateUpdate();

    return true;
  } catch (error) {
    console.error('[Station] Failed to initialize:', error);
    if (tray) {
      tray.setToolTip('Menu Hub Station — ERROR: ' + error.message);
    }
    return false;
  }
}

function startSyncLoop() {
  // Sync with Supabase every 30 seconds when online
  setInterval(async () => {
    if (serverState.isOnline) {
      try {
        await syncWithSupabase(serverState);
        serverState.lastSync = new Date().toISOString();
        sendStateUpdate();
      } catch (error) {
        console.error('[Station] Sync failed:', error);
      }
    }
  }, 30000);

  // Check online status every 10 seconds
  setInterval(async () => {
    const wasOnline = serverState.isOnline;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);
      serverState.isOnline = true;
    } catch {
      serverState.isOnline = false;
    }

    if (wasOnline !== serverState.isOnline) {
      console.log(`[Station] Connection: ${serverState.isOnline ? 'Online' : 'Offline'}`);
      sendStateUpdate();
      if (tray && tray._buildMenu) {
        tray.setContextMenu(tray._buildMenu());
      }
      if (serverState.isOnline) {
        syncWithSupabase(serverState).catch(console.error);
      }
    }
  }, 10000);
}

function sendStateUpdate() {
  if (tray && tray._buildMenu) {
    tray.setContextMenu(tray._buildMenu());
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state-update', {
      isOnline: serverState.isOnline,
      connectedDevices: serverState.connectedDevices,
      lastSync: serverState.lastSync,
      serverRunning: serverState.wsServer !== null
    });
  }
}

function cleanup() {
  if (serverState.wsServer) {
    serverState.wsServer.close();
    serverState.wsServer = null;
  }
  if (serverState.discoveryService) {
    serverState.discoveryService.destroy();
    serverState.discoveryService = null;
  }
  if (serverState.db) {
    try { serverState.db.close(); } catch {}
  }
}

// ─── IPC handlers ───────────────────────────────────────────────────────────
ipcMain.handle('get-server-state', () => ({
  isOnline: serverState.isOnline,
  connectedDevices: serverState.connectedDevices,
  lastSync: serverState.lastSync,
  serverRunning: serverState.wsServer !== null,
  autoStart: app.getLoginItemSettings().openAtLogin,
}));

ipcMain.handle('get-orders', async () => {
  if (!serverState.db) return [];
  return serverState.db.getOrders();
});

ipcMain.handle('force-sync', async () => {
  if (!serverState.isOnline) return { success: false, error: 'Offline' };
  try {
    await syncWithSupabase(serverState);
    serverState.lastSync = new Date().toISOString();
    sendStateUpdate();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('set-auto-start', (_, enable) => {
  toggleAutoStart(enable);
  return { success: true, openAtLogin: app.getLoginItemSettings().openAtLogin };
});

// Receive Supabase credentials from the PWA (sent via deep link or manual entry)
ipcMain.handle('set-supabase-credentials', (_, { url, key }) => {
  setSupabaseCredentials(url, key);
  return { success: true };
});

ipcMain.handle('get-local-addresses', () => getLocalAddresses());

// ─── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // If launched with --hidden (auto-start at login), skip showing window
  const launchedHidden = process.argv.includes('--hidden');

  createTray();
  setupAutoStart();

  if (!launchedHidden) {
    createWindow();
  }

  await initializeStation();

  app.on('activate', () => {
    // macOS: re-open window when dock icon clicked
    if (!mainWindow) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// On macOS, keep the app running when all windows are closed (server stays alive)
app.on('window-all-closed', () => {
  // Do NOT quit — the server needs to keep running
  // User must explicitly choose "Quit" from the tray menu
});

app.on('before-quit', () => {
  isQuitting = true;
  cleanup();
});

module.exports = {
  getServerState: () => serverState,
  sendStateUpdate
};
