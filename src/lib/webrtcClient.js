'use client'

/**
 * WebRTC Client - Connects staff devices to local hub
 *
 * This client runs on staff devices (waiter, kitchen, bar) and establishes
 * a peer-to-peer connection with the hub device for real-time order sync.
 *
 * Features:
 * - QR code scanning for hub discovery
 * - WebRTC peer connection to hub
 * - Data channel for order messages
 * - Auto-reconnect on disconnect
 * - Fallback to cloud sync if hub unavailable
 */

// STUN servers for NAT traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
]

const RECONNECT_INTERVAL = 5000 // 5 seconds
const PING_INTERVAL = 30000 // 30 seconds

class WebRTCClient {
  constructor() {
    this.connection = null
    this.channel = null
    this.hubInfo = null
    this.isConnected = false
    this.listeners = new Map()
    this.deviceId = null
    this.deviceInfo = null
    this.reconnectTimer = null
    this.pingTimer = null
  }

  /**
   * Get or create device ID
   */
  getOrCreateDeviceId() {
    if (this.deviceId) return this.deviceId

    if (typeof window === 'undefined') {
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
   * Set device information
   */
  setDeviceInfo(info) {
    if (!this.deviceInfo) {
      this.deviceInfo = {}
    }

    if (typeof window === 'undefined') {
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
   * Parse QR code data
   */
  parseQRCode(qrData) {
    try {
      let base64

      if (qrData.includes('/hub-connect?data=')) {
        // New HTTPS format: https://domain/r/slug/hub-connect?data=base64
        const url = new URL(qrData)
        base64 = url.searchParams.get('data')
        if (!base64) throw new Error('Missing data param in hub-connect URL')
      } else if (qrData.startsWith('menuhub://connect?data=')) {
        // Legacy custom scheme format
        base64 = qrData.replace('menuhub://connect?data=', '')
      } else if (!qrData.includes('?') && qrData.length > 20) {
        // Bare base64 pasted directly (manual input fallback)
        base64 = qrData.trim()
      } else {
        throw new Error('Invalid QR code format')
      }

      const jsonStr = atob(base64)
      const data = JSON.parse(jsonStr)

      if (data.type !== 'hub_offer') {
        throw new Error('Invalid offer type')
      }

      return data
    } catch (error) {
      console.error('[WebRTCClient] Failed to parse QR code:', error)
      throw error
    }
  }

  /**
   * Connect to hub using QR code data
   */
  async connectToHub(qrData) {
    if (this.isConnected) {
      console.log('[WebRTCClient] Already connected to hub')
      return true
    }

    try {
      // Parse QR code
      const hubOffer = this.parseQRCode(qrData)
      this.hubInfo = hubOffer

      console.log('[WebRTCClient] Connecting to hub:', hubOffer.hubId)

      // Initialize device info if needed
      if (!this.deviceId) {
        this.getOrCreateDeviceId()
      }
      if (!this.deviceInfo) {
        this.deviceInfo = {
          deviceName: 'Staff Device',
          deviceRole: 'staff',
          restaurantId: hubOffer.restaurantId
        }
      }

      // Verify restaurant match
      if (this.deviceInfo.restaurantId !== hubOffer.restaurantId) {
        throw new Error('Restaurant ID mismatch')
      }

      // Create peer connection
      this.connection = new RTCPeerConnection({
        iceServers: ICE_SERVERS
      })

      // Set up connection handlers
      this.connection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTCClient] New ICE candidate')
        }
      }

      this.connection.onconnectionstatechange = () => {
        console.log('[WebRTCClient] Connection state:', this.connection.connectionState)

        if (this.connection.connectionState === 'connected') {
          this.isConnected = true
          this.emit('connected', { hubId: this.hubInfo.hubId })
          this.startPing()
        } else if (
          this.connection.connectionState === 'disconnected' ||
          this.connection.connectionState === 'failed'
        ) {
          this.handleDisconnect()
        }
      }

      this.connection.oniceconnectionstatechange = () => {
        console.log('[WebRTCClient] ICE state:', this.connection.iceConnectionState)
      }

      // Listen for data channel from hub
      this.connection.ondatachannel = (event) => {
        console.log('[WebRTCClient] Received data channel')
        this.channel = event.channel
        this.setupDataChannel()
      }

      // Create offer
      const offer = await this.connection.createOffer()
      await this.connection.setLocalDescription(offer)

      console.log('[WebRTCClient] Created offer, waiting for answer from hub')

      // In a real implementation, we would send this offer to the hub
      // and receive an answer. For now, we'll emit an event that the UI
      // can use to facilitate the connection
      this.emit('offer_created', {
        offer: this.connection.localDescription,
        hubOffer
      })

      return true
    } catch (error) {
      console.error('[WebRTCClient] Connection error:', error)
      this.emit('error', { error })
      return false
    }
  }

  /**
   * Handle answer from hub
   * This is called after the hub processes our offer
   */
  async handleHubAnswer(answer) {
    if (!this.connection) {
      throw new Error('No peer connection')
    }

    try {
      await this.connection.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('[WebRTCClient] Set remote description from hub')
    } catch (error) {
      console.error('[WebRTCClient] Failed to set remote description:', error)
      throw error
    }
  }

  /**
   * Set up data channel event handlers
   */
  setupDataChannel() {
    if (!this.channel) return

    this.channel.onopen = () => {
      console.log('[WebRTCClient] Data channel opened')

      // Register with hub
      this.send({
        type: 'register',
        payload: {
          deviceId: this.deviceId,
          deviceName: this.deviceInfo.deviceName,
          deviceRole: this.deviceInfo.deviceRole,
          restaurantId: this.deviceInfo.restaurantId
        }
      })
    }

    this.channel.onclose = () => {
      console.log('[WebRTCClient] Data channel closed')
      this.handleDisconnect()
    }

    this.channel.onerror = (error) => {
      console.error('[WebRTCClient] Data channel error:', error)
    }

    this.channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('[WebRTCClient] Failed to parse message:', error)
      }
    }
  }

  /**
   * Handle incoming messages from hub
   */
  handleMessage(message) {
    const { type, ...data } = message

    switch (type) {
      case 'pong':
        // Ping response, connection is alive
        break

      case 'new_order':
        console.log('[WebRTCClient] New order received:', data.order?.client_id)
        this.emit('new_order', data)
        break

      case 'order_update':
        console.log('[WebRTCClient] Order update received:', data.clientId)
        this.emit('order_update', data)
        break

      case 'sync_response':
        console.log('[WebRTCClient] Sync response received')
        this.emit('sync_response', data)
        break

      case 'error':
        console.error('[WebRTCClient] Hub error:', data.error)
        this.emit('error', data)
        break

      default:
        console.warn('[WebRTCClient] Unknown message type:', type)
    }
  }

  /**
   * Send message to hub
   */
  send(message) {
    if (!this.isConnected || !this.channel || this.channel.readyState !== 'open') {
      console.warn('[WebRTCClient] Cannot send, not connected')
      return false
    }

    try {
      this.channel.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('[WebRTCClient] Failed to send message:', error)
      return false
    }
  }

  /**
   * Place an order through the hub
   */
  async placeOrder(order, items) {
    if (!this.isConnected) {
      throw new Error('Not connected to hub')
    }

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
      return { success: true, clientId: order.client_id }
    } else {
      throw new Error('Failed to send order to hub')
    }
  }

  /**
   * Update an order through the hub
   */
  async updateOrder(clientId, updates) {
    if (!this.isConnected) {
      throw new Error('Not connected to hub')
    }

    const success = this.send({
      type: 'order_update',
      payload: { clientId, updates }
    })

    if (success) {
      return { success: true }
    } else {
      throw new Error('Failed to send update to hub')
    }
  }

  /**
   * Request sync of pending orders
   */
  async requestSync() {
    if (!this.isConnected) {
      throw new Error('Not connected to hub')
    }

    this.send({
      type: 'sync_request',
      payload: {
        deviceId: this.deviceId,
        timestamp: Date.now()
      }
    })
  }

  /**
   * Handle disconnection
   */
  handleDisconnect() {
    this.isConnected = false
    this.stopPing()
    this.emit('disconnected')

    // Schedule reconnect
    this.scheduleReconnect()
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.isConnected && this.hubInfo) {
        console.log('[WebRTCClient] Attempting to reconnect...')
        // Recreate QR data and reconnect
        const qrData = this.createQRData(this.hubInfo)
        this.connectToHub(qrData)
      }
    }, RECONNECT_INTERVAL)
  }

  /**
   * Create QR data from hub info
   */
  createQRData(hubInfo) {
    const jsonStr = JSON.stringify(hubInfo)
    const base64 = btoa(jsonStr)
    return `menuhub://connect?data=${base64}`
  }

  /**
   * Start ping interval
   */
  startPing() {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping', timestamp: Date.now() })
      }
    }, PING_INTERVAL)
  }

  /**
   * Stop ping interval
   */
  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
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

    this.stopPing()

    if (this.channel) {
      this.channel.close()
      this.channel = null
    }

    if (this.connection) {
      this.connection.close()
      this.connection = null
    }

    this.isConnected = false
    this.hubInfo = null
  }

  /**
   * Get connection status
   */
  getStatus() {
    if (!this.deviceId) {
      this.getOrCreateDeviceId()
    }
    if (!this.deviceInfo) {
      this.deviceInfo = {
        deviceName: 'Staff Device',
        deviceRole: 'staff',
        restaurantId: null
      }
    }

    return {
      isConnected: this.isConnected,
      hubId: this.hubInfo?.hubId,
      deviceId: this.deviceId,
      deviceInfo: this.deviceInfo,
      connectionState: this.connection?.connectionState,
      channelState: this.channel?.readyState
    }
  }

  /**
   * Event system
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)

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
          console.error('[WebRTCClient] Event callback error:', error)
        }
      })
    }
  }
}

// Create singleton instance
const webrtcClient = new WebRTCClient()

export default webrtcClient
