'use client'

/**
 * WebRTC Signaling via Supabase Realtime
 *
 * Handles the exchange of SDP offers/answers and ICE candidates
 * between hub and client devices using Supabase Realtime channels.
 */

import { supabase } from '@/lib/supabase'

class WebRTCSignaling {
  constructor() {
    this.channel = null
    this.hubId = null
    this.deviceId = null
    this.listeners = new Map()
    this.isHub = false
  }

  /**
   * Join a signaling channel as the hub (host)
   */
  async joinAsHub(hubId, restaurantId) {
    this.hubId = hubId
    this.isHub = true

    const channelName = `hub-signaling-${restaurantId}-${hubId}`

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }
      }
    })

    // Listen for client offers
    this.channel.on('broadcast', { event: 'client-offer' }, (payload) => {
      console.log('[Signaling] Received client offer from:', payload.payload.deviceId)
      this.emit('client-offer', payload.payload)
    })

    // Listen for ICE candidates from clients
    this.channel.on('broadcast', { event: 'client-ice-candidate' }, (payload) => {
      console.log('[Signaling] Received ICE candidate from client:', payload.payload.deviceId)
      this.emit('client-ice-candidate', payload.payload)
    })

    await this.channel.subscribe((status) => {
      console.log('[Signaling] Hub channel status:', status)
      if (status === 'SUBSCRIBED') {
        this.emit('ready')
      }
    })

    return this.channel
  }

  /**
   * Join a signaling channel as a client
   */
  async joinAsClient(hubId, restaurantId, deviceId) {
    this.hubId = hubId
    this.deviceId = deviceId
    this.isHub = false

    const channelName = `hub-signaling-${restaurantId}-${hubId}`

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }
      }
    })

    // Listen for hub answer
    this.channel.on('broadcast', { event: 'hub-answer' }, (payload) => {
      // Only process answers meant for this device
      if (payload.payload.targetDeviceId === this.deviceId) {
        console.log('[Signaling] Received hub answer')
        this.emit('hub-answer', payload.payload)
      }
    })

    // Listen for ICE candidates from hub
    this.channel.on('broadcast', { event: 'hub-ice-candidate' }, (payload) => {
      if (payload.payload.targetDeviceId === this.deviceId) {
        console.log('[Signaling] Received ICE candidate from hub')
        this.emit('hub-ice-candidate', payload.payload)
      }
    })

    await this.channel.subscribe((status) => {
      console.log('[Signaling] Client channel status:', status)
      if (status === 'SUBSCRIBED') {
        this.emit('ready')
      }
    })

    return this.channel
  }

  /**
   * Send offer from client to hub
   */
  async sendOffer(offer, deviceId, deviceInfo) {
    if (!this.channel) throw new Error('Not connected to signaling channel')

    await this.channel.send({
      type: 'broadcast',
      event: 'client-offer',
      payload: {
        offer,
        deviceId,
        deviceInfo,
        timestamp: Date.now()
      }
    })
  }

  /**
   * Send answer from hub to client
   */
  async sendAnswer(answer, targetDeviceId) {
    if (!this.channel) throw new Error('Not connected to signaling channel')

    await this.channel.send({
      type: 'broadcast',
      event: 'hub-answer',
      payload: {
        answer,
        targetDeviceId,
        hubId: this.hubId,
        timestamp: Date.now()
      }
    })
  }

  /**
   * Send ICE candidate
   */
  async sendIceCandidate(candidate, targetDeviceId = null) {
    if (!this.channel) throw new Error('Not connected to signaling channel')

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
      await supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.hubId = null
    this.deviceId = null
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

// Export singleton
const webrtcSignaling = new WebRTCSignaling()
export default webrtcSignaling
