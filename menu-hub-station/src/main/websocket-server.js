const WebSocket = require('ws');
const { machineIdSync } = require('node-machine-id');

let wss = null;
let clients = new Map(); // deviceId -> {ws, metadata}
let serverState = null;

function startWebSocketServer(state) {
  serverState = state;

  return new Promise((resolve, reject) => {
    try {
      wss = new WebSocket.Server({ port: 3001 });

      wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress;
        console.log(`[WebSocket] New connection from ${clientIp}`);

        let deviceId = null;
        let deviceMetadata = {};

        ws.on('message', async (message) => {
          try {
            const data = JSON.parse(message.toString());
            await handleMessage(ws, data, deviceId);
          } catch (error) {
            console.error('[WebSocket] Error handling message:', error);
            ws.send(JSON.stringify({
              type: 'error',
              error: error.message
            }));
          }
        });

        ws.on('close', () => {
          if (deviceId) {
            clients.delete(deviceId);
            updateConnectedDevices();
            console.log(`[WebSocket] Device disconnected: ${deviceId}`);
          }
        });

        ws.on('error', (error) => {
          console.error('[WebSocket] Connection error:', error);
        });

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connected',
          stationId: machineIdSync(),
          timestamp: new Date().toISOString()
        }));
      });

      wss.on('error', (error) => {
        console.error('[WebSocket] Server error:', error);
        reject(error);
      });

      console.log('[WebSocket] Server listening on port 3001');
      resolve(wss);

    } catch (error) {
      reject(error);
    }
  });
}

async function handleMessage(ws, data, currentDeviceId) {
  const { type, payload } = data;

  switch (type) {
    case 'register':
      await handleRegister(ws, payload);
      break;

    case 'new_order':
      await handleNewOrder(payload);
      break;

    case 'order_update':
      await handleOrderUpdate(payload);
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;

    default:
      console.warn('[WebSocket] Unknown message type:', type);
  }
}

async function handleRegister(ws, payload) {
  const { deviceId, deviceName, deviceRole, restaurantId } = payload;

  // Register the device
  clients.set(deviceId, {
    ws,
    metadata: {
      deviceId,
      deviceName: deviceName || 'Unknown Device',
      deviceRole: deviceRole || 'staff',
      restaurantId,
      connectedAt: new Date().toISOString()
    }
  });

  updateConnectedDevices();

  console.log(`[WebSocket] Device registered: ${deviceId} (${deviceName})`);

  // Send registration confirmation
  ws.send(JSON.stringify({
    type: 'registered',
    deviceId,
    stationId: machineIdSync()
  }));

  // Send any pending orders for this restaurant
  const pendingOrders = serverState.db.getOrders({
    restaurant_id: restaurantId,
    synced: false
  });

  if (pendingOrders.length > 0) {
    ws.send(JSON.stringify({
      type: 'pending_orders',
      orders: pendingOrders.map(order => ({
        ...order,
        items: serverState.db.getOrderItems(order.client_id)
      }))
    }));
  }
}

async function handleNewOrder(payload) {
  const { order, items } = payload;

  console.log('[WebSocket] New order received:', order.client_id);

  // Check if order already exists (deduplication)
  const existing = serverState.db.getOrder(order.client_id);
  if (existing) {
    console.log('[WebSocket] Order already exists, skipping:', order.client_id);
    return;
  }

  // Store in local database
  serverState.db.insertOrder(order);
  serverState.db.insertOrderItems(items);

  // Broadcast to all connected devices in the same restaurant
  broadcastToRestaurant(order.restaurant_id, {
    type: 'new_order',
    order: {
      ...order,
      items
    }
  });

  // Notify renderer process
  notifyRenderer('new-order', { ...order, items });

  // Trigger sync if online
  if (serverState.isOnline) {
    // Sync will happen in the background via sync manager
    console.log('[WebSocket] Order queued for sync with Supabase');
  }
}

async function handleOrderUpdate(payload) {
  const { clientId, updates } = payload;

  console.log('[WebSocket] Order update received:', clientId);

  // Update in local database
  serverState.db.updateOrder(clientId, updates);

  // Get the order for broadcasting
  const order = serverState.db.getOrder(clientId);
  if (!order) {
    console.error('[WebSocket] Order not found for update:', clientId);
    return;
  }

  // Broadcast to all connected devices in the same restaurant
  broadcastToRestaurant(order.restaurant_id, {
    type: 'order_update',
    clientId,
    updates
  });

  // Notify renderer process
  notifyRenderer('order-update', { clientId, updates });

  // Mark for sync
  if (serverState.isOnline) {
    console.log('[WebSocket] Order update queued for sync');
  }
}

function broadcastToRestaurant(restaurantId, message) {
  let sentCount = 0;

  clients.forEach((client) => {
    if (client.metadata.restaurantId === restaurantId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
      sentCount++;
    }
  });

  console.log(`[WebSocket] Broadcast to ${sentCount} devices in restaurant ${restaurantId}`);
}

function broadcastToAll(message) {
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

function updateConnectedDevices() {
  const devices = Array.from(clients.values()).map(client => client.metadata);
  serverState.connectedDevices = devices;

  // Notify renderer process
  const { sendStateUpdate } = require('./index');
  sendStateUpdate();
}

function notifyRenderer(channel, data) {
  try {
    const { BrowserWindow } = require('electron');
    const mainWindow = BrowserWindow.getAllWindows()[0];

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  } catch (error) {
    console.error('[WebSocket] Error notifying renderer:', error);
  }
}

module.exports = {
  startWebSocketServer,
  broadcastToRestaurant,
  broadcastToAll
};
