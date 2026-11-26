import type { HandLandmarker } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { runtime, setCamera, setMode, type Mode } from '../session/store'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const HOLD_MS = 420
const TIPS = [4, 8, 12, 16, 20]

function isPermissionError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError' || error.name === 'NotFoundError')
  )
}

async function openUserCamera() {
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } },
    { audio: false, video: { facingMode: 'user' } },
    { audio: false, video: true },
  ]
  let lastError: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      if (isPermissionError(error)) throw error
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Camera unavailable')
}

function prepareInlineVideo(video: HTMLVideoElement) {
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
}

function gestureFromLandmarks(landmarks: { x: number; y: number }[]): Mode | null {
  const wrist = landmarks[0]
  const thumb = landmarks[4]
  const index = landmarks[8]
  if (!wrist || !thumb || !index) return null
  const pinch = Math.hypot(thumb.x - index.x, thumb.y - index.y)
  if (pinch < 0.05) return 'FOCUS'
  let sum = 0
  for (const tip of TIPS) {
    const point = landmarks[tip]
    if (!point) return null
    sum += Math.hypot(point.x - wrist.x, point.y - wrist.y)
  }
  const average = sum / TIPS.length
  if (average < 0.25) return 'TREE'
  if (average > 0.4) return 'SCATTER'
  return null
}

export function useHandCamera(videoRef: RefObject<HTMLVideoElement | null>) {
  const stopRef = useRef<(() => void) | null>(null)
  const session = useRef(0)

  const stop = useCallback(() => {
    session.current += 1
    stopRef.current?.()
    stopRef.current = null
    runtime.handActive = false
    runtime.handX = 0
    runtime.handY = 0
    setCamera({ on: false, busy: false })
  }, [])

  const start = useCallback(async () => {
    if (runtime.cameraOn || runtime.cameraBusy) return
    const video = videoRef.current
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setCamera({ on: false, busy: false, error: true })
      window.setTimeout(() => setCamera({ error: false }), 1200)
      return
    }

    stopRef.current?.()
    stopRef.current = null
    const id = ++session.current
    setCamera({ busy: true, error: false })
    let stream: MediaStream | null = null
    let landmarker: HandLandmarker | null = null
    let raf = 0
    let cleaned = false

    const release = () => {
      if (cleaned) return
      cleaned = true
      cancelAnimationFrame(raf)
      try {
        landmarker?.close()
      } catch {
        /* already closed */
      }
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
      if (video.srcObject) video.srcObject = null
      runtime.handActive = false
      runtime.handX = 0
      runtime.handY = 0
    }

    const fail = () => {
      release()
      if (session.current !== id) return
      setCamera({ on: false, busy: false, error: true })
      window.setTimeout(() => setCamera({ error: false }), 1400)
    }

    try {
      stream = await openUserCamera()
      if (session.current !== id) {
        stream.getTracks().forEach((track) => track.stop())
        stream = null
        return
      }
      stopRef.current = release
      prepareInlineVideo(video)
      video.srcObject = stream
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          release()
          if (session.current === id) setCamera({ on: false, busy: false })
        })
      })
      setCamera({ on: true, busy: true, error: false })
      try {
        await video.play()
      } catch {
        /* iOS can reject play() until frames arrive */
      }
      if (session.current !== id) return

      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
      if (session.current !== id) return
      const wasm = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe/wasm`)
      if (session.current !== id) return
      const options = {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO' as const,
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      }
      try {
        landmarker = await HandLandmarker.createFromOptions(wasm, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'GPU' },
        })
      } catch {
        if (session.current !== id) return
        landmarker = await HandLandmarker.createFromOptions(wasm, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'CPU' },
        })
      }
      if (session.current !== id) {
        try {
          landmarker?.close()
        } catch {
          /* already closed */
        }
        landmarker = null
        return
      }

      let lastDetect = 0
      let lastStamp = -1
      let smoothX = 0.5
      let smoothY = 0.5
      const hold = { mode: null as Mode | null, since: 0, fired: false }

      const tick = (now: number) => {
        if (cleaned || !landmarker) return
        raf = requestAnimationFrame(tick)
        if (document.hidden || now - lastDetect < 50 || video.readyState < 2) return
        lastDetect = now
        const stamp = Math.max(lastStamp + 1, now)
        lastStamp = stamp
        let result
        try {
          result = landmarker.detectForVideo(video, stamp)
        } catch {
          return
        }
        const landmarks = result.landmarks[0]
        if (!landmarks) {
          smoothX += (0.5 - smoothX) * 0.22
          smoothY += (0.5 - smoothY) * 0.22
          runtime.handActive = false
          runtime.handX = 0
          runtime.handY = 0
          hold.mode = null
          hold.fired = false
          return
        }
        const palm = landmarks[9] ?? landmarks[0]
        smoothX += (1 - palm.x - smoothX) * 0.35
        smoothY += (palm.y - smoothY) * 0.35
        runtime.handActive = true
        runtime.handX = smoothX - 0.5
        runtime.handY = smoothY - 0.5

        const desired = gestureFromLandmarks(landmarks)
        if (!desired) {
          hold.mode = null
          hold.fired = false
          return
        }
        if (hold.mode !== desired) {
          hold.mode = desired
          hold.since = now
          hold.fired = false
          return
        }
        if (now - hold.since < HOLD_MS || hold.fired) return
        if (runtime.gestureLock) {
          if (desired === runtime.gestureLock) return
          runtime.gestureLock = null
          hold.since = now
          hold.fired = false
          return
        }
        setMode(desired, 'gesture')
        hold.fired = true
      }

      raf = requestAnimationFrame(tick)
      if (session.current === id) setCamera({ on: true, busy: false, error: false })
    } catch {
      fail()
    }
  }, [videoRef])

  useEffect(() => {
    return () => {
      session.current += 1
      stopRef.current?.()
      stopRef.current = null
    }
  }, [])

  return { start, stop }
}
