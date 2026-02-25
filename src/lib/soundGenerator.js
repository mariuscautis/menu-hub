// Sound generator utility using Web Audio API
// Premium notification sounds with rich harmonics and smooth envelopes

export function createSoundGenerator() {
  if (typeof window === 'undefined' || !window.AudioContext) {
    return null
  }

  let audioContext = null

  const getContext = () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioContext
  }

  // Helper to create a smoother, more premium sound with harmonics
  const createTone = (ctx, frequency, type, startTime, duration, volume, harmonics = []) => {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.setValueAtTime(frequency, startTime)
    oscillator.type = type

    // Smooth attack and release for premium feel
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)

    // Add harmonics for richer sound
    harmonics.forEach(({ ratio, vol }) => {
      const harmOsc = ctx.createOscillator()
      const harmGain = ctx.createGain()

      harmOsc.connect(harmGain)
      harmGain.connect(ctx.destination)

      harmOsc.frequency.setValueAtTime(frequency * ratio, startTime)
      harmOsc.type = 'sine'

      harmGain.gain.setValueAtTime(0, startTime)
      harmGain.gain.linearRampToValueAtTime(volume * vol, startTime + 0.02)
      harmGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.8)

      harmOsc.start(startTime)
      harmOsc.stop(startTime + duration)
    })
  }

  // Generate different notification sounds
  const sounds = {
    // Original sounds (kept for compatibility)
    bell: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      // Rising arpeggio with harmonics
      const notes = [880, 1108.73, 1318.51] // A5, C#6, E6 (A major)
      notes.forEach((freq, i) => {
        createTone(ctx, freq, 'sine', now + i * 0.08, 0.4 - i * 0.05, volume * 0.35, [
          { ratio: 2, vol: 0.15 },
          { ratio: 3, vol: 0.08 }
        ])
      })
    },

    chime: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime
      const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5 chord

      frequencies.forEach((freq, i) => {
        createTone(ctx, freq, 'sine', now + i * 0.05, 0.6, volume * 0.25, [
          { ratio: 2, vol: 0.12 },
          { ratio: 4, vol: 0.05 }
        ])
      })
    },

    ding: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      createTone(ctx, 1046.5, 'sine', now, 0.4, volume * 0.5, [
        { ratio: 2.5, vol: 0.2 },
        { ratio: 4, vol: 0.1 }
      ])
    },

    notification: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime
      const frequencies = [784, 988, 784] // G5, B5, G5

      frequencies.forEach((freq, i) => {
        createTone(ctx, freq, 'triangle', now + i * 0.12, 0.2, volume * 0.35, [
          { ratio: 2, vol: 0.1 }
        ])
      })
    },

    alert: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      // Two-tone alert
      createTone(ctx, 880, 'sine', now, 0.15, volume * 0.4, [])
      createTone(ctx, 698.46, 'sine', now + 0.18, 0.15, volume * 0.4, [])
      createTone(ctx, 880, 'sine', now + 0.36, 0.2, volume * 0.35, [])
    },

    // NEW PREMIUM SOUNDS

    // Elegant two-tone doorbell sound
    doorbell: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      // Classic ding-dong with rich harmonics
      createTone(ctx, 659.25, 'sine', now, 0.5, volume * 0.4, [
        { ratio: 2, vol: 0.25 },
        { ratio: 3, vol: 0.15 },
        { ratio: 4, vol: 0.08 }
      ])
      createTone(ctx, 523.25, 'sine', now + 0.4, 0.6, volume * 0.35, [
        { ratio: 2, vol: 0.25 },
        { ratio: 3, vol: 0.15 },
        { ratio: 4, vol: 0.08 }
      ])
    },

    // Soft marimba-like tone
    marimba: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      // Warm wooden tone with quick decay
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        createTone(ctx, freq, 'sine', now + i * 0.06, 0.25, volume * 0.3, [
          { ratio: 4, vol: 0.3 },  // Strong 4th harmonic for marimba character
          { ratio: 10, vol: 0.05 }
        ])
      })
    },

    // Gentle harp glissando
    harp: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      // Ascending scale with shimmer
      const notes = [392, 440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99] // G4 to G5
      notes.forEach((freq, i) => {
        createTone(ctx, freq, 'sine', now + i * 0.04, 0.5 - i * 0.03, volume * 0.2, [
          { ratio: 2, vol: 0.15 },
          { ratio: 3, vol: 0.08 }
        ])
      })
    },

    // Soft crystal/glass sound
    crystal: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      // High, pure tones with shimmer
      const notes = [1318.51, 1567.98, 1975.53] // E6, G6, B6
      notes.forEach((freq, i) => {
        createTone(ctx, freq, 'sine', now + i * 0.1, 0.7, volume * 0.2, [
          { ratio: 2, vol: 0.3 },
          { ratio: 3, vol: 0.15 }
        ])
      })
    },

    // Modern tech notification
    modern: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      // Clean, modern two-note
      createTone(ctx, 880, 'sine', now, 0.15, volume * 0.4, [
        { ratio: 2, vol: 0.2 }
      ])
      createTone(ctx, 1174.66, 'sine', now + 0.12, 0.25, volume * 0.35, [
        { ratio: 2, vol: 0.2 }
      ])
    },

    // Soft success/positive sound
    success: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      // Ascending major third - positive feel
      createTone(ctx, 523.25, 'sine', now, 0.2, volume * 0.35, [
        { ratio: 2, vol: 0.15 }
      ])
      createTone(ctx, 659.25, 'sine', now + 0.1, 0.2, volume * 0.35, [
        { ratio: 2, vol: 0.15 }
      ])
      createTone(ctx, 783.99, 'sine', now + 0.2, 0.35, volume * 0.4, [
        { ratio: 2, vol: 0.2 },
        { ratio: 3, vol: 0.1 }
      ])
    },

    // Gentle wind chime
    windchime: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      // Random-ish high notes like wind chimes
      const notes = [1396.91, 1567.98, 1760, 1975.53, 2093] // F6, G6, A6, B6, C7
      notes.forEach((freq, i) => {
        const delay = i * 0.07 + Math.random() * 0.03
        createTone(ctx, freq, 'sine', now + delay, 0.6, volume * 0.15, [
          { ratio: 2.5, vol: 0.2 }
        ])
      })
    },

    // Soft piano chord
    piano: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      // Rich chord with piano-like harmonics
      const notes = [261.63, 329.63, 392, 523.25] // C4, E4, G4, C5
      notes.forEach((freq, i) => {
        createTone(ctx, freq, 'sine', now + i * 0.02, 0.8, volume * 0.25, [
          { ratio: 2, vol: 0.25 },
          { ratio: 3, vol: 0.12 },
          { ratio: 4, vol: 0.08 },
          { ratio: 5, vol: 0.04 }
        ])
      })
    },

    // Soft zen/meditation bell
    zen: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime

      // Single resonant tone with long decay
      createTone(ctx, 528, 'sine', now, 1.5, volume * 0.35, [
        { ratio: 2, vol: 0.2 },
        { ratio: 2.76, vol: 0.15 }, // Slightly detuned for warmth
        { ratio: 5.4, vol: 0.08 }
      ])
    },

    // Quick pop/bubble sound
    pop: (volume = 0.7) => {
      const ctx = getContext()
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      // Frequency sweep for pop effect
      osc.frequency.setValueAtTime(400, now)
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1)
      osc.type = 'sine'

      gain.gain.setValueAtTime(volume * 0.5, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

      osc.start(now)
      osc.stop(now + 0.15)
    }
  }

  return {
    play: (soundName, volume = 0.7) => {
      if (sounds[soundName]) {
        sounds[soundName](volume)
      } else {
        console.warn(`Sound "${soundName}" not found`)
      }
    },
    resume: () => {
      const ctx = getContext()
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
    }
  }
}

// Singleton instance
let generatorInstance = null

export function getSoundGenerator() {
  if (typeof window === 'undefined') return null
  if (!generatorInstance) {
    generatorInstance = createSoundGenerator()
  }
  return generatorInstance
}
