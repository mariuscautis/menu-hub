/**
 * Local Hub configuration helpers.
 *
 * The hub architecture allows one device to act as a local WiFi hub:
 * - Hub device: receives orders from spoke devices via local HTTP, holds the
 *   IndexedDB queue, and syncs to Supabase when internet returns.
 * - Spoke devices: when offline, POST orders to the hub's local IP instead of
 *   writing directly to their own IndexedDB.
 *
 * Configuration is stored in localStorage so it survives page refreshes but is
 * device-local (intentionally — each device has its own role).
 */

const HUB_MODE_KEY = 'menuhub_hub_mode'   // 'true' = this device IS the hub
const HUB_IP_KEY = 'menuhub_hub_ip'       // IP/hostname of the hub (set on spoke devices)

/**
 * Returns true if this device is configured as the hub.
 */
export function isHubDevice() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(HUB_MODE_KEY) === 'true'
}

/**
 * Returns the hub IP/hostname configured on this spoke device, or null.
 */
export function getHubIp() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(HUB_IP_KEY) || null
}

/**
 * Enable or disable hub mode on this device.
 * When enabling hub mode, clear any hub IP (you can't be both hub and spoke).
 */
export function setHubMode(enabled) {
  if (typeof window === 'undefined') return
  if (enabled) {
    localStorage.setItem(HUB_MODE_KEY, 'true')
    localStorage.removeItem(HUB_IP_KEY)
  } else {
    localStorage.removeItem(HUB_MODE_KEY)
  }
}

/**
 * Set the hub IP/hostname on this spoke device.
 * Clears hub mode — a device with a hub IP configured is a spoke, not a hub.
 */
export function setHubIp(ip) {
  if (typeof window === 'undefined') return
  if (ip && ip.trim()) {
    localStorage.setItem(HUB_IP_KEY, ip.trim())
    localStorage.removeItem(HUB_MODE_KEY)
  } else {
    localStorage.removeItem(HUB_IP_KEY)
  }
}

/**
 * Returns the full URL for posting an order to the hub, or null if not configured.
 * Format: http://<hubIp>/offline-hub/order
 */
export function getHubOrderUrl() {
  const ip = getHubIp()
  if (!ip) return null
  // Support bare IP (192.168.1.5), IP:port (192.168.1.5:3000), or hostname
  return `http://${ip}/offline-hub/order`
}

/**
 * Returns true if this is a spoke device with a hub IP configured.
 * (i.e. hub routing is active on this device)
 */
export function isHubConfigured() {
  return !isHubDevice() && !!getHubIp()
}

/**
 * Ping the hub to check if it's reachable.
 * Resolves to true/false — never throws.
 */
export async function pingHub() {
  const ip = getHubIp()
  if (!ip) return false
  try {
    const url = `http://${ip}/offline-hub/ping`
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}
