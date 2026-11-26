import { runtime, setTrack } from './store'

let audio: HTMLAudioElement | null = null
let track: 1 | 2 = 1
let started = false
let fade = 0

function url(next: 1 | 2) {
  return `${import.meta.env.BASE_URL}${next}.mp3`
}

function element() {
  if (!audio) {
    audio = new Audio(url(1))
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0
  }
  return audio
}

export function startMusic() {
  const node = element()
  node.loop = true
  if (started && !node.paused) return
  void node
    .play()
    .then(() => {
      started = true
      if (fade) return
      fade = window.setInterval(() => {
        if (!audio) return
        audio.volume = Math.min(0.58, audio.volume + 0.045)
        if (audio.volume >= 0.58 && fade) {
          window.clearInterval(fade)
          fade = 0
        }
      }, 90)
    })
    .catch(() => {
      started = false
    })
}

export function pauseMusic() {
  if (fade) window.clearInterval(fade)
  fade = 0
  audio?.pause()
  started = false
}

export function toggleMusic() {
  track = track === 1 ? 2 : 1
  const node = element()
  node.src = url(track)
  node.loop = true
  node.volume = 0.58
  started = true
  void node.play().catch(() => {
    started = false
  })
  setTrack(track)
}

export function installMusicUnlock() {
  window.addEventListener(
    'pointerdown',
    () => {
      if (runtime.phase === 'reveal' || runtime.phase === 'play') startMusic()
    },
    { capture: true },
  )
}

export function musicStarted() {
  return started
}
