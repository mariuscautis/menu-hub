'use client'

/**
 * WebRTC Hub - Manages peer-to-peer connections for local device sync
 *
 * This hub runs on the designated hub device and coordinates
 * direct peer connections with all staff devices on the local network.
 *
 * Features:
 * - Create WebRTC peer connections
 * - Generate QR codes for easy device pairing
 * - Supabase Realtime signaling for offer/answer exchange
 * - Handle ICE candidate exchange
 * - Manage data channels for order sync
 * - Broadcast orders to all connected peers
 */

import { createSignaling } from '@/lib/webrtcSignaling'

// STUN servers for NAT traversal (free public servers)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
]

class WebRTCHub {
  constructor() {
    this.peers = new Map() // deviceId -> { connection, channel, info }
    this.pendingOffers = new Map() // offerId -> offer data
    this.listeners = new Map()
    this.hubId = null
    this.restaurantId = null
    this.isActive = false
    this.signaling = null // Own signaling instance
  }

  /**
   * Initialize the hub
   */
  async initialize(restaurantId, hubId) {
    if (typeof window === 'undefined') {
      console.warn('[WebRTCHub] Cannot initialize in SSR context')
      return false
    }

    if (!('RTCPeerConnection' in window)) {
      console.error('[WebRTCHub] WebRTC not supported in this browser')
      this.emit('error', { error: 'WebRTC not supported' })
      return false
    }

    this.restaurantId = restaurantId
    this.hubId = hubId || `hub_${Date.now()}`
    this.isActive = true

    console.log('[WebRTCHub] Initialized:', this.hubId)

    // Create own signaling instance
    this.signaling = createSignaling()

    // Join signaling channel as hub
    try {
      await this.signaling.joinAsHub(this.hubId, restaurantId)

      // Listen for client offers
      this.signalingCleanupOffer = this.signaling.on('client-offer', async (data) => {
        console.log('[WebRTCHub] Received client offer via signaling')
        try {
          const result = await this.handleClientConnection(
            data.deviceId,
            data.deviceInfo,
            data.offer
          )

          // Send answer back to client
          await this.signaling.sendAnswer(result.answer, data.deviceId)
          console.log('[WebRTCHub] Sent answer to client:', data.deviceId)
        } catch (err) {
          console.error('[WebRTCHub] Failed to handle client offer:', err)
        }
      })

      // Listen for ICE candidates from clients
      this.signalingCleanupIce = this.signaling.on('client-ice-candidate', async (data) => {
        console.log('[WebRTCHub] Received ICE candidate from client:', data.deviceId)
        try {
          const peer = this.peers.get(data.deviceId)
          if (peer && peer.connection && data.candidate) {
            await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate))
          }
        } catch (err) {
          console.error('[WebRTCHub] Failed to add client ICE candidate:', err)
        }
      })

      console.log('[WebRTCHub] Signaling channel ready')
    } catch (err) {
      console.error('[WebRTCHub] Failed to join signaling channel:', err)
    }

    this.emit('initialized', { hubId: this.hubId })

    // Start cleanup interval for stale connections
    this.startCleanup()

    return true
  }

  /**
   * Create a connection offer for a new device
   * Returns offer data that can be encoded in a QR code
   */
  async createOffer() {
    if (!this.isActive) {
      throw new Error('Hub not initialized')
    }

    const offerId = `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create offer data that will be displayed as QR code
    const offerData = {
      type: 'hub_offer',
      offerId,
      hubId: this.hubId,
      restaurantId: this.restaurantId,
      timestamp: Date.now()
    }

    // Store pending offer
    this.pendingOffers.set(offerId, {
      ...offerData,
      expiresAt: Date.now() + 300000 // 5 minutes
    })

    console.log('[WebRTCHub] Created offer:', offerId)

    return offerData
  }

  /**
   * Handle a connection request from a client device
   * This is called when a device scans the QR code and sends back its answer
   */
  async handleClientConnection(deviceId, deviceInfo, clientOffer) {
    console.log('[WebRTCHub] Handling connection from:', deviceId)

    // Create peer connection
    const connection = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    })

    // Store peer info (channel will be set when we receive it via ondatachannel)
    const peerInfo = {
      connection,
      channel: null,
      deviceId,
      deviceInfo,
      connectedAt: Date.now(),
      lastActivity: Date.now()
    }
    this.peers.set(deviceId, peerInfo)

    // Listen for data channel from client (client creates it as offerer)
    connection.ondatachannel = (event) => {
      console.log('[WebRTCHub] Received data channel from client:', deviceId)
      peerInfo.channel = event.channel
      this.setupDataChannel(event.channel, deviceId)
    }

    // Handle ICE candidates - send to client via signaling
    connection.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('[WebRTCHub] New ICE candidate for:', deviceId)
        try {
          await this.signaling.sendIceCandidate(event.candidate, deviceId)
        } catch (err) {
          console.error('[WebRTCHub] Failed to send ICE candidate:', err)
        }
      }
    }

    // Handle connection state changes
    connection.onconnectionstatechange = () => {
      console.log('[WebRTCHub] Connection state:', connection.connectionState, 'for:', deviceId)

      if (connection.connectionState === 'connected') {
        this.emit('device_connected', { deviceId, deviceInfo })
      } else if (connection.connectionState === 'disconnected' || connection.connectionState === 'failed') {
        this.removePeer(deviceId)
      }
    }

    // Handle ICE connection state
    connection.oniceconnectionstatechange = () => {
      console.log('[WebRTCHub] ICE state:', connection.iceConnectionState, 'for:', deviceId)
    }

    // Set remote description (client's offer)
    if (clientOffer) {
      await connection.setRemoteDescription(new RTCSessionDescription(clientOffer))
    }

    // Create and set local description (our answer)
    const answer = await connection.createAnswer()
    await connection.setLocalDescription(answer)

    console.log('[WebRTCHub] Created answer for:', deviceId)

    return {
      answer: connection.localDescription,
      hubId: this.hubId
    }
  }

  /**
   * Set up data channel event handlers
   */
  setupDataChannel(channel, deviceId) {
    channel.onopen = () => {
      console.log('[WebRTCHub] Data channel opened for:', deviceId)
      const peer = this.peers.get(deviceId)
      if (peer) {
        peer.lastActivity = Date.now()
      }
    }

    channel.onclose = () => {
      console.log('[WebRTCHub] Data channel closed for:', deviceId)
      this.removePeer(deviceId)
    }

    channel.onerror = (error) => {
      console.error('[WebRTCHub] Data channel error for:', deviceId, error)
    }

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(deviceId, message)
      } catch (error) {
        console.error('[WebRTCHub] Failed to parse message from:', deviceId, error)
      }
    }
  }

  /**
   * Handle incoming messages from peers
   */
  handleMessage(deviceId, message) {
    const peer = this.peers.get(deviceId)
    if (!peer) return

    // Update last activity
    peer.lastActivity = Date.now()

    const { type, ...data } = message

    console.log('[WebRTCHub] Message from', deviceId, ':', type)

    switch (type) {
      case 'ping':
        // Respond to ping
        this.sendToPeer(deviceId, { type: 'pong', timestamp: Date.now() })
        break

      case 'new_order':
        // Broadcast order to all other peers
        console.log('[WebRTCHub] Broadcasting order:', data.order?.client_id)
        this.broadcast(message, deviceId) // Exclude sender
        this.emit('new_order', { ...data, fromDevice: deviceId })
        break

      case 'order_update':
        // Broadcast update to all other peers
        console.log('[WebRTCHub] Broadcasting order update:', data.clientId)
        this.broadcast(message, deviceId)
        this.emit('order_update', { ...data, fromDevice: deviceId })
        break

      case 'sync_request':
        // Client requesting sync of pending orders
        this.emit('sync_request', { deviceId })
        break

      default:
        console.warn('[WebRTCHub] Unknown message type:', type)
    }
  }

  /**
   * Send message to a specific peer
   */
  sendToPeer(deviceId, message) {
    const peer = this.peers.get(deviceId)
    if (!peer || peer.channel.readyState !== 'open') {
      console.warn('[WebRTCHub] Cannot send to peer:', deviceId)
      return false
    }

    try {
      peer.channel.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('[WebRTCHub] Failed to send to peer:', deviceId, error)
      return false
    }
  }

  /**
   * Broadcast message to all peers (optionally exclude one)
   */
  broadcast(message, excludeDeviceId = null) {
    let sent = 0
    for (const [deviceId, peer] of this.peers.entries()) {
      if (deviceId !== excludeDeviceId && peer.channel.readyState === 'open') {
        if (this.sendToPeer(deviceId, message)) {
          sent++
        }
      }
    }
    console.log('[WebRTCHub] Broadcast sent to', sent, 'peers')
    return sent
  }

  /**
   * Remove a peer connection
   */
  removePeer(deviceId) {
    const peer = this.peers.get(deviceId)
    if (!peer) return

    try {
      if (peer.channel) peer.channel.close()
      if (peer.connection) peer.connection.close()
    } catch (error) {
      console.error('[WebRTCHub] Error closing peer:', error)
    }

    this.peers.delete(deviceId)
    this.emit('device_disconnected', { deviceId, deviceInfo: peer.deviceInfo })

    console.log('[WebRTCHub] Removed peer:', deviceId)
  }

  /**
   * Start cleanup interval for stale connections
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const staleTimeout = 60000 // 1 minute

      // Clean up stale peers
      for (const [deviceId, peer] of this.peers.entries()) {
        if (now - peer.lastActivity > staleTimeout) {
          console.log('[WebRTCHub] Removing stale peer:', deviceId)
          this.removePeer(deviceId)
        }
      }

      // Clean up expired offers
      for (const [offerId, offer] of this.pendingOffers.entries()) {
        if (now > offer.expiresAt) {
          this.pendingOffers.delete(offerId)
        }
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Get hub status and connected devices
   */
  getStatus() {
    const devices = []
    for (const [deviceId, peer] of this.peers.entries()) {
      devices.push({
        deviceId,
        deviceName: peer.deviceInfo?.deviceName || 'Unknown Device',
        deviceRole: peer.deviceInfo?.deviceRole || 'staff',
        connectedAt: peer.connectedAt,
        lastActivity: peer.lastActivity,
        connectionState: peer.connection?.connectionState,
        channelState: peer.channel?.readyState
      })
    }

    return {
      isActive: this.isActive,
      hubId: this.hubId,
      restaurantId: this.restaurantId,
      connectedDevices: devices,
      deviceCount: devices.length,
      pendingOffers: this.pendingOffers.size
    }
  }

  /**
   * Shutdown the hub
   */
  shutdown() {
    console.log('[WebRTCHub] Shutting down')

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    // Cleanup signaling listeners
    if (this.signalingCleanupOffer) {
      this.signalingCleanupOffer()
      this.signalingCleanupOffer = null
    }
    if (this.signalingCleanupIce) {
      this.signalingCleanupIce()
      this.signalingCleanupIce = null
    }

    // Leave signaling channel
    if (this.signaling) {
      this.signaling.leave().catch(() => {})
      this.signaling = null
    }

    // Close all peer connections
    for (const deviceId of this.peers.keys()) {
      this.removePeer(deviceId)
    }

    this.isActive = false
    this.emit('shutdown')
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
          console.error('[WebRTCHub] Event callback error:', error)
        }
      })
    }
  }
}

// Create singleton instance
const webrtcHub = new WebRTCHub()

export default webrtcHub
