# Menu Hub - Local Hub Server

A lightweight Node.js WebSocket server that runs on the **hub device** (typically the lobby/bar tablet). All restaurant devices on the same WiFi connect to it, enabling real-time order sync even when there is no internet connection.

## Setup

```bash
cd hub-server
npm install
npm start
```

The server starts on port **3001** by default. Set `HUB_PORT` environment variable to change it.

## How it works

1. The **manager** marks a device as the hub in Settings → Other Options → Hub Device.
2. The hub server runs as a background Node.js process on that device.
3. All other devices on the same WiFi automatically discover the hub (by cached IP or IP scan).
4. Orders placed on any device are sent to the hub, which broadcasts them to all connected devices (kitchen, bar, etc.) in real time — **even without internet**.
5. When internet returns, the sync manager uploads all queued orders to Supabase.

## Message protocol

| Type | Direction | Payload |
|------|-----------|---------|
| `register` | Client → Server | `{ deviceId, deviceName, deviceRole, restaurantId }` |
| `registered` | Server → Client | `{ deviceId, deviceCount }` |
| `new_order` | Client → Server | `{ order, items }` |
| `order_received` | Server → Client | `{ clientId, hub_received_at }` |
| `new_order` | Server → Other clients | `{ order, items }` |
| `order_update` | Client → Server | `{ clientId, updates }` |
| `order_update` | Server → Other clients | `{ clientId, updates, updatedAt }` |
| `pending_orders` | Server → Client | `{ orders: [{ order, items }] }` |
| `device_list` | Server → All | `{ devices, count }` |
| `ping` / `pong` | Both | — |
| `server_shutdown` | Server → All | — |

## Health check

```
GET http://<hub-ip>:3001/health
```

Returns JSON with station ID, connected device count, pending orders count, and uptime.
