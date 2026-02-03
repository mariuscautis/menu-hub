'use client'

/**
 * Local Hub Client - Connects to Menu Hub Station for offline sync
 *
 * Features:
 * - Auto-discovery of local hub via mDNS (fallback to manual IP)
 * - WebSocket connection with auto-reconnect
 * - Order placement through local hub
 * - Real-time order updates from hub
 */

const HUB_DISCOVERY_TIMEOUT = 5000 // 5 seconds
const RECONNECT_INTERVAL = 5000 // 5 seconds
const PING_INTERVAL = 30000 // 30 seconds

class LocalHubClient {
  constructor() {
    this.ws = null
    this.hubUrl = null
    this.isConnected = false
    this.isDiscovering = false
    this.reconnectTimer = null
    this.pingTimer = null
    this.listeners = new Map()
    this.deviceId = null
    this.deviceInfo = null
  }

  /**
   * Get or create a unique device ID
   */
  getOrCreateDeviceId() {
    // Lazy initialization
    if (this.deviceId) return this.deviceId

    if (typeof window === 'undefined') {
      // SSR context - return temporary ID
      this.deviceId = `device_ssr_${Date.now()}`
      return this.deviceId
    }

    let deviceId = localStorage.getItem('menuhub_device_id')
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('menuhub_device_id', deviceId)
    }
    this.deviceId = deviceId
    return deviceId
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    // Lazy initialization
    if (this.deviceInfo) return this.deviceInfo

    if (typeof window === 'undefined') {
      // SSR context - return defaults
      this.deviceInfo = {
        deviceName: 'Server Device',
        deviceRole: 'staff',
        restaurantId: null
      }
      return this.deviceInfo
    }

    this.deviceInfo = {
      deviceName: localStorage.getItem('menuhub_device_name') || (navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Device'),
      deviceRole: localStorage.getItem('menuhub_device_role') || 'staff',
      restaurantId: null // Will be set when connecting
    }
    return this.deviceInfo
  }

  /**
   * Set device information (call this after user logs in)
   */
  setDeviceInfo(info) {
    // Initialize deviceInfo if not already done
    if (!this.deviceInfo) {
      this.getDeviceInfo()
    }

    if (typeof window === 'undefined') {
      // SSR context - just update in-memory values
      if (info.deviceName) this.deviceInfo.deviceName = info.deviceName
      if (info.deviceRole) this.deviceInfo.deviceRole = info.deviceRole
      if (info.restaurantId) this.deviceInfo.restaurantId = info.restaurantId
      return
    }

    if (info.deviceName) {
      this.deviceInfo.deviceName = info.deviceName
      localStorage.setItem('menuhub_device_name', info.deviceName)
    }
    if (info.deviceRole) {
      this.deviceInfo.deviceRole = info.deviceRole
      localStorage.setItem('menuhub_device_role', info.deviceRole)
    }
    if (info.restaurantId) {
      this.deviceInfo.restaurantId = info.restaurantId
    }
  }

  /**
   * Discover Menu Hub Station on local network
   */
  async discover() {
    if (this.isDiscovering) return this.hubUrl

    this.isDiscovering = true
    this.emit('discovering')

    try {
      // Method 1: Check localStorage for cached hub URL
      if (typeof window !== 'undefined') {
        const cachedUrl = localStorage.getItem('menuhub_station_url')
        if (cachedUrl) {
          console.log('[LocalHub] Trying cached URL:', cachedUrl)
          if (await this.testConnection(cachedUrl)) {
            this.hubUrl = cachedUrl
            this.isDiscovering = false
            return cachedUrl
          }
        }
      }

      // Method 2: Try common local IPs (for most home/business networks)
      const commonIPs = this.getCommonLocalIPs()
      console.log('[LocalHub] Scanning common IPs:', commonIPs)

      for (const ip of commonIPs) {
        const url = `ws://${ip}:3001`
        if (await this.testConnection(url)) {
          this.hubUrl = url
          if (typeof window !== 'undefined') {
            localStorage.setItem('menuhub_station_url', url)
          }
          this.isDiscovering = false
          this.emit('discovered', { url })
          return url
        }
      }

      // Method 3: mDNS discovery (browser support limited)
      // Note: True mDNS requires native app or browser extension
      // For now, we rely on IP scanning

      console.log('[LocalHub] No hub discovered')
      this.isDiscovering = false
      this.emit('discovery-failed')
      return null

    } catch (error) {
      console.error('[LocalHub] Discovery error:', error)
      this.isDiscovering = false
      this.emit('discovery-error', { error })
      return null
    }
  }

  /**
   * Get common local IP ranges to scan
   */
  getCommonLocalIPs() {
    // Try to get the device's own IP to narrow down the scan
    const ips = []

    // Most common router IPs
    ips.push('192.168.1.1', '192.168.0.1', '10.0.0.1')

    // Scan common ranges (limited to avoid too many requests)
    for (let i = 1; i <= 10; i++) {
      ips.push(`192.168.1.${i}`)
      ips.push(`192.168.0.${i}`)
      ips.push(`10.0.0.${i}`)
    }

    return ips
  }

  /**
   * Test if a WebSocket URL is reachable
   */
  async testConnection(url) {
    return new Promise((resolve) => {
      const ws = new WebSocket(url)
      const timeout = setTimeout(() => {
        ws.close()
        resolve(false)
      }, 2000)

      ws.onopen = () => {
        clearTimeout(timeout)
        ws.close()
        resolve(true)
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }
    })
  }

  /**
   * Connect to the hub
   */
  async connect(restaurantId) {
    if (this.isConnected) {
      console.log('[LocalHub] Already connected')
      return true
    }

    // Initialize device info if needed
    if (!this.deviceInfo) {
      this.getDeviceInfo()
    }
    if (!this.deviceId) {
      this.getOrCreateDeviceId()
    }

    // Set restaurant ID
    this.deviceInfo.restaurantId = restaurantId

    // Discover hub if not already known
    if (!this.hubUrl) {
      await this.discover()
    }

    if (!this.hubUrl) {
      console.log('[LocalHub] No hub available')
      return false
    }

    try {
      console.log('[LocalHub] Connecting to:', this.hubUrl)
      this.ws = new WebSocket(this.hubUrl)

      this.ws.onopen = () => {
        console.log('[LocalHub] Connected')
        this.isConnected = true
        this.emit('connected')

        // Register device
        this.send({
          type: 'register',
          payload: {
            deviceId: this.deviceId,
            deviceName: this.deviceInfo.deviceName,
            deviceRole: this.deviceInfo.deviceRole,
            restaurantId: this.deviceInfo.restaurantId
          }
        })

        // Start ping interval
        this.startPing()
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('[LocalHub] Failed to parse message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[LocalHub] WebSocket error:', error)
        this.emit('error', { error })
      }

      this.ws.onclose = () => {
        console.log('[LocalHub] Disconnected')
        this.isConnected = false
        this.stopPing()
        this.emit('disconnected')

        // Auto-reconnect
        this.scheduleReconnect()
      }

      return true
    } catch (error) {
      console.error('[LocalHub] Connection error:', error)
      this.emit('error', { error })
      return false
    }
  }

  /**
   * Disconnect from hub
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.isConnected && this.deviceInfo.restaurantId) {
        console.log('[LocalHub] Attempting to reconnect...')
        this.connect(this.deviceInfo.restaurantId)
      }
    }, RECONNECT_INTERVAL)
  }

  /**
   * Start sending periodic pings
   */
  startPing() {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' })
      }
    }, PING_INTERVAL)
  }

  /**
   * Stop ping timer
   */
  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  /**
   * Send a message to the hub
   */
  send(message) {
    if (!this.isConnected || !this.ws) {
      console.warn('[LocalHub] Cannot send, not connected')
      return false
    }

    try {
      this.ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('[LocalHub] Failed to send message:', error)
      return false
    }
  }

  /**
   * Handle incoming messages
   */
  handleMessage(message) {
    const { type, ...data } = message

    switch (type) {
      case 'connected':
        console.log('[LocalHub] Received welcome, station ID:', data.stationId)
        break

      case 'registered':
        console.log('[LocalHub] Device registered')
        this.emit('registered', data)
        break

      case 'new_order':
        console.log('[LocalHub] New order received:', data.order.client_id)
        this.emit('new_order', data)
        break

      case 'order_update':
        console.log('[LocalHub] Order update received:', data.clientId)
        this.emit('order_update', data)
        break

      case 'pending_orders':
        console.log('[LocalHub] Pending orders received:', data.orders.length)
        this.emit('pending_orders', data)
        break

      case 'pong':
        // Ping response, connection is alive
        break

      case 'error':
        console.error('[LocalHub] Server error:', data.error)
        this.emit('error', data)
        break

      default:
        console.warn('[LocalHub] Unknown message type:', type)
    }
  }

  /**
   * Place an order through the local hub
   */
  async placeOrder(order, items) {
    if (!this.isConnected) {
      throw new Error('Not connected to local hub')
    }

    return new Promise((resolve, reject) => {
      // Generate client ID if not present
      if (!order.client_id) {
        order.client_id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      const success = this.send({
        type: 'new_order',
        payload: {
          order: {
            ...order,
            created_at: order.created_at || new Date().toISOString()
          },
          items
        }
      })

      if (success) {
        resolve({ success: true, clientId: order.client_id })
      } else {
        reject(new Error('Failed to send order to hub'))
      }
    })
  }

  /**
   * Update an order through the local hub
   */
  async updateOrder(clientId, updates) {
    if (!this.isConnected) {
      throw new Error('Not connected to local hub')
    }

    return new Promise((resolve, reject) => {
      const success = this.send({
        type: 'order_update',
        payload: {
          clientId,
          updates
        }
      })

      if (success) {
        resolve({ success: true })
      } else {
        reject(new Error('Failed to send update to hub'))
      }
    })
  }

  /**
   * Event system
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('[LocalHub] Event callback error:', error)
        }
      })
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    // Initialize if needed
    if (!this.deviceId) {
      this.getOrCreateDeviceId()
    }
    if (!this.deviceInfo) {
      this.getDeviceInfo()
    }

    return {
      isConnected: this.isConnected,
      hubUrl: this.hubUrl,
      deviceId: this.deviceId,
      deviceInfo: this.deviceInfo
    }
  }
}

// Create singleton instance
const localHubClient = new LocalHubClient()

// Auto-discover on load (but don't block)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    localHubClient.discover().catch(console.error)
  }, 2000)
}

export default localHubClient
