const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initializeDatabase } = require('./database');
const { startWebSocketServer } = require('./websocket-server');
const { startDiscoveryService } = require('./discovery');
const { syncWithSupabase } = require('./sync-manager');

let mainWindow = null;
let serverState = {
  wsServer: null,
  discoveryService: null,
  db: null,
  connectedDevices: [],
  isOnline: true,
  lastSync: null
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Menu Hub Station',
    backgroundColor: '#1a1a1a'
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

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

    // Send initial state to renderer
    sendStateUpdate();

    return true;
  } catch (error) {
    console.error('[Station] Failed to initialize:', error);
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
  setInterval(() => {
    const wasOnline = serverState.isOnline;
    serverState.isOnline = require('net').isIPv4('8.8.8.8');

    if (wasOnline !== serverState.isOnline) {
      console.log(`[Station] Connection status changed: ${serverState.isOnline ? 'Online' : 'Offline'}`);
      sendStateUpdate();

      // Trigger immediate sync when coming online
      if (serverState.isOnline) {
        syncWithSupabase(serverState).catch(console.error);
      }
    }
  }, 10000);
}

function sendStateUpdate() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state-update', {
      isOnline: serverState.isOnline,
      connectedDevices: serverState.connectedDevices,
      lastSync: serverState.lastSync,
      serverRunning: serverState.wsServer !== null
    });
  }
}

// IPC handlers
ipcMain.handle('get-server-state', () => {
  return {
    isOnline: serverState.isOnline,
    connectedDevices: serverState.connectedDevices,
    lastSync: serverState.lastSync,
    serverRunning: serverState.wsServer !== null
  };
});

ipcMain.handle('get-orders', async () => {
  if (!serverState.db) return [];
  return serverState.db.getOrders();
});

ipcMain.handle('force-sync', async () => {
  if (serverState.isOnline) {
    await syncWithSupabase(serverState);
    serverState.lastSync = new Date().toISOString();
    sendStateUpdate();
    return { success: true };
  }
  return { success: false, error: 'Offline' };
});

// App lifecycle
app.whenReady().then(async () => {
  createWindow();
  await initializeStation();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Cleanup
  if (serverState.wsServer) {
    serverState.wsServer.close();
  }
  if (serverState.discoveryService) {
    serverState.discoveryService.destroy();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Export for other modules
module.exports = {
  getServerState: () => serverState,
  sendStateUpdate
};
