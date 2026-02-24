'use client'

/**
 * WebRTC Signaling via Supabase Realtime
 *
 * Handles the exchange of SDP offers/answers and ICE candidates
 * between hub and client devices using Supabase Realtime channels.
 *
 * NOTE: This is NOT a singleton - each call creates a new instance
 * to avoid conflicts between hub and client on the same device.
 */

import { supabase } from '@/lib/supabase'

export class WebRTCSignaling {
  constructor() {
    this.channel = null
    this.hubId = null
    this.deviceId = null
    this.listeners = new Map()
    this.isHub = false
    this.isReady = false
    this.readyPromise = null
    this.readyResolve = null
  }

  /**
   * Join a signaling channel as the hub (host)
   */
  async joinAsHub(hubId, restaurantId) {
    // Leave any existing channel first
    await this.leave()

    this.hubId = hubId
    this.isHub = true
    this.isReady = false

    // Create a promise that resolves when subscribed
    this.readyPromise = new Promise(resolve => {
      this.readyResolve = resolve
    })

    const channelName = `hub-signaling-${restaurantId}-${hubId}`
    console.log('[Signaling] Hub joining channel:', channelName)

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }
      }
    })

    // Listen for client offers
    this.channel.on('broadcast', { event: 'client-offer' }, (payload) => {
      console.log('[Signaling] Received client offer from:', payload.payload?.deviceId)
      this.emit('client-offer', payload.payload)
    })

    // Listen for ICE candidates from clients
    this.channel.on('broadcast', { event: 'client-ice-candidate' }, (payload) => {
      console.log('[Signaling] Received ICE candidate from client:', payload.payload?.deviceId)
      this.emit('client-ice-candidate', payload.payload)
    })

    await this.channel.subscribe((status) => {
      console.log('[Signaling] Hub channel status:', status)
      if (status === 'SUBSCRIBED') {
        this.isReady = true
        this.emit('ready')
        if (this.readyResolve) {
          this.readyResolve()
          this.readyResolve = null
        }
      }
    })

    // Wait for subscription to be ready
    await this.readyPromise

    return this.channel
  }

  /**
   * Join a signaling channel as a client
   */
  async joinAsClient(hubId, restaurantId, deviceId) {
    // Leave any existing channel first
    await this.leave()

    this.hubId = hubId
    this.deviceId = deviceId
    this.isHub = false
    this.isReady = false

    // Create a promise that resolves when subscribed
    this.readyPromise = new Promise(resolve => {
      this.readyResolve = resolve
    })

    const channelName = `hub-signaling-${restaurantId}-${hubId}`
    console.log('[Signaling] Client joining channel:', channelName, 'as device:', deviceId)

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }
      }
    })

    // Listen for hub answer
    this.channel.on('broadcast', { event: 'hub-answer' }, (payload) => {
      console.log('[Signaling] Received hub answer for device:', payload.payload?.targetDeviceId)
      // Only process answers meant for this device
      if (payload.payload?.targetDeviceId === this.deviceId) {
        console.log('[Signaling] Answer is for us, processing...')
        this.emit('hub-answer', payload.payload)
      }
    })

    // Listen for ICE candidates from hub
    this.channel.on('broadcast', { event: 'hub-ice-candidate' }, (payload) => {
      if (payload.payload?.targetDeviceId === this.deviceId) {
        console.log('[Signaling] Received ICE candidate from hub')
        this.emit('hub-ice-candidate', payload.payload)
      }
    })

    await this.channel.subscribe((status) => {
      console.log('[Signaling] Client channel status:', status)
      if (status === 'SUBSCRIBED') {
        this.isReady = true
        this.emit('ready')
        if (this.readyResolve) {
          this.readyResolve()
          this.readyResolve = null
        }
      }
    })

    // Wait for subscription to be ready
    await this.readyPromise

    return this.channel
  }

  /**
   * Send offer from client to hub
   */
  async sendOffer(offer, deviceId, deviceInfo) {
    if (!this.channel) throw new Error('Not connected to signaling channel')
    if (!this.isReady) {
      console.log('[Signaling] Waiting for channel to be ready before sending offer...')
      await this.readyPromise
    }

    console.log('[Signaling] Sending offer from device:', deviceId)
    const result = await this.channel.send({
      type: 'broadcast',
      event: 'client-offer',
      payload: {
        offer,
        deviceId,
        deviceInfo,
        timestamp: Date.now()
      }
    })
    console.log('[Signaling] Offer send result:', result)
    return result
  }

  /**
   * Send answer from hub to client
   */
  async sendAnswer(answer, targetDeviceId) {
    if (!this.channel) throw new Error('Not connected to signaling channel')
    if (!this.isReady) {
      await this.readyPromise
    }

    console.log('[Signaling] Sending answer to device:', targetDeviceId)
    const result = await this.channel.send({
      type: 'broadcast',
      event: 'hub-answer',
      payload: {
        answer,
        targetDeviceId,
        hubId: this.hubId,
        timestamp: Date.now()
      }
    })
    console.log('[Signaling] Answer send result:', result)
    return result
  }

  /**
   * Send ICE candidate
   */
  async sendIceCandidate(candidate, targetDeviceId = null) {
    if (!this.channel) throw new Error('Not connected to signaling channel')
    if (!this.isReady) {
      await this.readyPromise
    }

    const event = this.isHub ? 'hub-ice-candidate' : 'client-ice-candidate'

    await this.channel.send({
      type: 'broadcast',
      event,
      payload: {
        candidate,
        targetDeviceId,
        deviceId: this.deviceId,
        hubId: this.hubId,
        timestamp: Date.now()
      }
    })
  }

  /**
   * Leave the signaling channel
   */
  async leave() {
    if (this.channel) {
      try {
        await supabase.removeChannel(this.channel)
      } catch (e) {
        console.warn('[Signaling] Error leaving channel:', e)
      }
      this.channel = null
    }
    this.hubId = null
    this.deviceId = null
    this.isReady = false
    this.listeners.clear()
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
          console.error('[Signaling] Event callback error:', error)
        }
      })
    }
  }
}

// Create factory function instead of singleton
// This allows hub and client to have separate instances
export function createSignaling() {
  return new WebRTCSignaling()
}

// Keep a default export for backwards compatibility
// but this should be replaced with createSignaling() in each module
const webrtcSignaling = new WebRTCSignaling()
export default webrtcSignaling
