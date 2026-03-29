/**
 * Menu Hub - Local Hub Server
 *
 * A lightweight WebSocket server that runs on the "hub device" (typically the
 * lobby/bar tablet). All restaurant devices on the same WiFi connect to it,
 * enabling real-time order sync even when there is no internet connection.
 *
 * Features:
 * - Device registration (waiters, kitchen, bar, etc.)
 * - Broadcasts new orders to all connected devices
 * - Broadcasts order updates to all connected devices
 * - Stores a rolling in-memory queue of recent orders (last 500)
 * - Sends pending orders to newly connected devices so they are not missed
 * - mDNS advertisement as "menuhub-hub.local" for auto-discovery
 * - Ping/pong keep-alive to detect stale connections
 *
 * Usage:
 *   node hub-server/index.js
 *
 * The server listens on port 3001 (configurable via HUB_PORT env var).
 */

'use strict'

const { WebSocketServer, WebSocket } = require('ws')
const http = require('http')
const os = require('os')

// ─── Config ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.HUB_PORT || '3001', 10)
const PING_INTERVAL_MS = 30_000   // how often to ping clients
const PING_TIMEOUT_MS  = 10_000   // how long to wait for pong before closing
const MAX_PENDING_ORDERS = 500    // rolling in-memory order buffer

// ─── State ─────────────────────────────────────────────────────────────────
const stationId = `hub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
/** @type {Map<string, { ws: WebSocket, deviceId: string, deviceName: string, deviceRole: string, restaurantId: string, isAlive: boolean, connectedAt: Date }>} */
const connectedDevices = new Map()
/** @type {Array<{ order: object, items: object[], receivedAt: string }>} */
const pendingOrders = []
/** @type {Map<string, object>} Maps clientId → latest order state for dedup */
const orderState = new Map()

// ─── HTTP health-check server ───────────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      stationId,
      connectedDevices: connectedDevices.size,
      pendingOrders: pendingOrders.length,
      uptime: process.uptime(),
    }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

// ─── WebSocket server ───────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress
  const tempId = `unknown_${Date.now()}`
  console.log(`[Hub] New connection from ${clientIp}`)

  // Mark alive for ping/pong
  ws.isAlive = true
  ws.on('pong', () => { ws.isAlive = true })

  // Send welcome message
  sendTo(ws, {
    type: 'connected',
    stationId,
    serverTime: new Date().toISOString(),
  })

  ws.on('message', (data) => {
    let message
    try {
      message = JSON.parse(data)
    } catch {
      console.warn('[Hub] Invalid JSON from client')
      return
    }

    const { type, payload } = message

    switch (type) {
      case 'register':
        handleRegister(ws, payload)
        break

      case 'new_order':
        handleNewOrder(ws, payload)
        break

      case 'order_update':
        handleOrderUpdate(ws, payload)
        break

      case 'ping':
        sendTo(ws, { type: 'pong' })
        break

      case 'request_pending_orders':
        handleRequestPendingOrders(ws, payload)
        break

      default:
        console.warn('[Hub] Unknown message type:', type)
    }
  })

  ws.on('close', () => {
    // Find and remove the device
    for (const [id, device] of connectedDevices.entries()) {
      if (device.ws === ws) {
        console.log(`[Hub] Device disconnected: ${device.deviceName} (${device.deviceRole})`)
        connectedDevices.delete(id)
        broadcastDeviceList()
        break
      }
    }
  })

  ws.on('error', (err) => {
    console.error('[Hub] WebSocket error:', err.message)
  })
})

// ─── Message handlers ───────────────────────────────────────────────────────

function handleRegister(ws, payload) {
  const { deviceId, deviceName, deviceRole, restaurantId } = payload || {}

  if (!deviceId) {
    sendTo(ws, { type: 'error', error: 'deviceId is required' })
    return
  }

  // If this device was already connected (reconnect), remove old entry
  if (connectedDevices.has(deviceId)) {
    connectedDevices.delete(deviceId)
  }

  connectedDevices.set(deviceId, {
    ws,
    deviceId,
    deviceName: deviceName || 'Unknown Device',
    deviceRole: deviceRole || 'staff',
    restaurantId: restaurantId || null,
    isAlive: true,
    connectedAt: new Date(),
  })

  console.log(`[Hub] Registered: ${deviceName} (${deviceRole}) — total devices: ${connectedDevices.size}`)

  // Confirm registration
  sendTo(ws, {
    type: 'registered',
    deviceId,
    deviceCount: connectedDevices.size,
    serverTime: new Date().toISOString(),
  })

  // Send any pending orders the device may have missed
  const relevantOrders = restaurantId
    ? pendingOrders.filter(entry => !entry.order.restaurant_id || entry.order.restaurant_id === restaurantId)
    : pendingOrders

  if (relevantOrders.length > 0) {
    sendTo(ws, {
      type: 'pending_orders',
      orders: relevantOrders.map(e => ({ order: e.order, items: e.items })),
    })
  }

  // Broadcast updated device list to everyone
  broadcastDeviceList()
}

function handleNewOrder(ws, payload) {
  const { order, items } = payload || {}

  if (!order || !order.client_id) {
    sendTo(ws, { type: 'error', error: 'order with client_id is required' })
    return
  }

  // Deduplicate — if we have already received this order, ignore
  if (orderState.has(order.client_id)) {
    console.log(`[Hub] Duplicate order ignored: ${order.client_id}`)
    sendTo(ws, { type: 'order_received', clientId: order.client_id, duplicate: true })
    return
  }

  const entry = {
    order: { ...order, hub_received_at: new Date().toISOString() },
    items: items || [],
    receivedAt: new Date().toISOString(),
  }

  // Store in rolling buffer
  pendingOrders.push(entry)
  orderState.set(order.client_id, entry.order)

  // Trim buffer
  if (pendingOrders.length > MAX_PENDING_ORDERS) {
    const removed = pendingOrders.shift()
    // Keep orderState in sync (only remove if it still points to the same object)
    const existing = orderState.get(removed.order.client_id)
    if (existing === removed.order) {
      orderState.delete(removed.order.client_id)
    }
  }

  console.log(`[Hub] New order: ${order.client_id} — broadcasting to ${connectedDevices.size - 1} other device(s)`)

  // Confirm receipt to sender
  sendTo(ws, {
    type: 'order_received',
    clientId: order.client_id,
    hub_received_at: entry.order.hub_received_at,
  })

  // Broadcast to all OTHER connected devices
  broadcastExcept(ws, {
    type: 'new_order',
    order: entry.order,
    items: entry.items,
  })
}

function handleOrderUpdate(ws, payload) {
  const { clientId, updates } = payload || {}

  if (!clientId) {
    sendTo(ws, { type: 'error', error: 'clientId is required for order_update' })
    return
  }

  // Apply update to cached order state
  if (orderState.has(clientId)) {
    const existing = orderState.get(clientId)
    orderState.set(clientId, { ...existing, ...updates })

    // Also update in pendingOrders buffer
    const idx = pendingOrders.findIndex(e => e.order.client_id === clientId)
    if (idx !== -1) {
      pendingOrders[idx].order = { ...pendingOrders[idx].order, ...updates }
    }
  }

  console.log(`[Hub] Order update: ${clientId} — broadcasting`)

  // Broadcast to all OTHER devices
  broadcastExcept(ws, {
    type: 'order_update',
    clientId,
    updates,
    updatedAt: new Date().toISOString(),
  })
}

function handleRequestPendingOrders(ws, payload) {
  const { restaurantId, since } = payload || {}

  let relevant = restaurantId
    ? pendingOrders.filter(e => !e.order.restaurant_id || e.order.restaurant_id === restaurantId)
    : pendingOrders

  if (since) {
    relevant = relevant.filter(e => new Date(e.receivedAt) > new Date(since))
  }

  sendTo(ws, {
    type: 'pending_orders',
    orders: relevant.map(e => ({ order: e.order, items: e.items })),
    count: relevant.length,
  })
}

// ─── Broadcast helpers ──────────────────────────────────────────────────────

function sendTo(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(message))
    } catch (err) {
      console.error('[Hub] Failed to send message:', err.message)
    }
  }
}

function broadcastExcept(senderWs, message) {
  const json = JSON.stringify(message)
  for (const device of connectedDevices.values()) {
    if (device.ws !== senderWs && device.ws.readyState === WebSocket.OPEN) {
      try {
        device.ws.send(json)
      } catch (err) {
        console.error(`[Hub] Failed to broadcast to ${device.deviceName}:`, err.message)
      }
    }
  }
}

function broadcastToAll(message) {
  const json = JSON.stringify(message)
  for (const device of connectedDevices.values()) {
    if (device.ws.readyState === WebSocket.OPEN) {
      try {
        device.ws.send(json)
      } catch (err) {
        console.error(`[Hub] Failed to send to ${device.deviceName}:`, err.message)
      }
    }
  }
}

function broadcastDeviceList() {
  const devices = Array.from(connectedDevices.values()).map(d => ({
    deviceId: d.deviceId,
    deviceName: d.deviceName,
    deviceRole: d.deviceRole,
    connectedAt: d.connectedAt,
  }))

  broadcastToAll({
    type: 'device_list',
    devices,
    count: devices.length,
  })
}

// ─── Ping/pong keep-alive ───────────────────────────────────────────────────
const pingInterval = setInterval(() => {
  for (const [deviceId, device] of connectedDevices.entries()) {
    if (!device.ws.isAlive) {
      // No pong received — close stale connection
      console.log(`[Hub] Terminating stale connection: ${device.deviceName}`)
      device.ws.terminate()
      connectedDevices.delete(deviceId)
      continue
    }
    device.ws.isAlive = false
    device.ws.ping()
  }
}, PING_INTERVAL_MS)

wss.on('close', () => clearInterval(pingInterval))

// ─── mDNS advertisement ─────────────────────────────────────────────────────
function startMDNS() {
  // Try bonjour first, then mdns-js, then skip gracefully
  try {
    const bonjour = require('bonjour-service')
    const b = new bonjour.Bonjour()
    b.publish({ name: 'MenuHub Station', type: 'menuhub', port: PORT })
    console.log('[Hub] mDNS advertised as _menuhub._tcp.local')
  } catch {
    try {
      const mdns = require('mdns')
      const ad = mdns.createAdvertisement(mdns.tcp('menuhub'), PORT, {
        name: 'MenuHub Station',
      })
      ad.start()
      console.log('[Hub] mDNS advertised via mdns module')
    } catch {
      console.log('[Hub] mDNS not available — devices will discover by IP scan')
    }
  }
}

// ─── Local IP display ───────────────────────────────────────────────────────
function getLocalIPs() {
  const interfaces = os.networkInterfaces()
  const ips = []
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address)
      }
    }
  }
  return ips
}

// ─── Start ──────────────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs()
  console.log('')
  console.log('╔══════════════════════════════════════╗')
  console.log('║      Menu Hub - Local Hub Server     ║')
  console.log('╠══════════════════════════════════════╣')
  console.log(`║  Station ID: ${stationId.padEnd(24)}║`)
  console.log(`║  Port: ${String(PORT).padEnd(30)}║`)
  console.log('║  Listening on:                       ║')
  for (const ip of ips) {
    const line = `    ws://${ip}:${PORT}`
    console.log(`║  ${line.padEnd(36)}║`)
  }
  console.log('╚══════════════════════════════════════╝')
  console.log('')
  startMDNS()
})

// ─── Graceful shutdown ──────────────────────────────────────────────────────
function shutdown() {
  console.log('\n[Hub] Shutting down...')
  clearInterval(pingInterval)

  broadcastToAll({ type: 'server_shutdown', message: 'Hub server is shutting down' })

  wss.close(() => {
    httpServer.close(() => {
      console.log('[Hub] Server closed')
      process.exit(0)
    })
  })

  // Force close after 5s
  setTimeout(() => process.exit(0), 5000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

module.exports = { wss, httpServer, connectedDevices, pendingOrders }
