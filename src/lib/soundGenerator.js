// Sound generator utility using Web Audio API
// Used as a fallback when MP3 files are not available

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

  // Generate different notification sounds
  const sounds = {
    bell: (volume = 0.7) => {
      const ctx = getContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5
      oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.1) // E6
      oscillator.frequency.setValueAtTime(1760, ctx.currentTime + 0.2) // A6
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(volume * 0.5, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
    },

    chime: (volume = 0.7) => {
      const ctx = getContext()
      const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5 chord

      frequencies.forEach((freq, i) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)

        oscillator.frequency.setValueAtTime(freq, ctx.currentTime)
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime + i * 0.05)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6 + i * 0.05)

        oscillator.start(ctx.currentTime + i * 0.05)
        oscillator.stop(ctx.currentTime + 0.6 + i * 0.05)
      })
    },

    ding: (volume = 0.7) => {
      const ctx = getContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.setValueAtTime(1000, ctx.currentTime)
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(volume * 0.6, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
    },

    notification: (volume = 0.7) => {
      const ctx = getContext()
      const frequencies = [800, 1000, 800]

      frequencies.forEach((freq, i) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)

        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15)
        oscillator.type = 'triangle'

        gainNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime + i * 0.15)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15 + i * 0.15)

        oscillator.start(ctx.currentTime + i * 0.15)
        oscillator.stop(ctx.currentTime + 0.15 + i * 0.15)
      })
    },

    alert: (volume = 0.7) => {
      const ctx = getContext()
      const oscillator = ctx.createOscillator()
      const oscillator2 = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      oscillator2.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.setValueAtTime(600, ctx.currentTime)
      oscillator2.frequency.setValueAtTime(900, ctx.currentTime)
      oscillator.type = 'square'
      oscillator2.type = 'square'

      gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime)
      gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.1)
      gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime + 0.2)
      gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.3)
      gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime + 0.4)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

      oscillator.start(ctx.currentTime)
      oscillator2.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
      oscillator2.stop(ctx.currentTime + 0.5)
    }
  }

  return {
    play: (soundName, volume = 0.7) => {
      if (sounds[soundName]) {
        sounds[soundName](volume)
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
