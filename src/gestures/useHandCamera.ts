import type { GestureRecognizer } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { treeState, type TreeMode } from '../scene/treeState'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'

const HOLD_MS = 480

function isPermissionError(error: unknown) {
  return error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError' || error.name === 'NotFoundError')
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

function modeFromGesture(name: string, score: number): TreeMode | null {
  if (score < 0.58) return null
  if (name === 'Open_Palm') return 'chaos'
  if (name === 'Closed_Fist') return 'formed'
  return null
}

export function useHandCamera(videoRef: RefObject<HTMLVideoElement | null>) {
  const stopRef = useRef<(() => void) | null>(null)
  const session = useRef(0)

  const stop = useCallback(() => {
    session.current += 1
    stopRef.current?.()
    stopRef.current = null
    treeState.hand.active = false
    treeState.hand.dx = 0
    treeState.hand.dy = 0
    treeState.setCamera({ on: false, busy: false })
  }, [])

  const start = useCallback(async () => {
    if (treeState.cameraOn || treeState.cameraBusy) return
    const video = videoRef.current
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      treeState.setCamera({ on: false, busy: false, error: true })
      window.setTimeout(() => treeState.setCamera({ error: false }), 1200)
      return
    }

    stopRef.current?.()
    stopRef.current = null
    const id = ++session.current
    treeState.setCamera({ busy: true, error: false })
    let stream: MediaStream | null = null
    let recognizer: GestureRecognizer | null = null
    let raf = 0
    let cleaned = false

    const release = () => {
      if (cleaned) return
      cleaned = true
      cancelAnimationFrame(raf)
      try {
        recognizer?.close()
      } catch {
        /* already closed */
      }
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
      if (video.srcObject) video.srcObject = null
      treeState.hand.active = false
      treeState.hand.dx = 0
      treeState.hand.dy = 0
    }

    const fail = () => {
      release()
      if (session.current !== id) return
      treeState.setCamera({ on: false, busy: false, error: true })
      window.setTimeout(() => treeState.setCamera({ error: false }), 1400)
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
          if (session.current === id) treeState.setCamera({ on: false, busy: false })
        })
      })
      treeState.setCamera({ on: true, busy: true, error: false })
      try {
        await video.play()
      } catch {
        /* iOS can reject play() until frames arrive; recognition still waits on readyState */
      }
      if (session.current !== id) return

      const { FilesetResolver, GestureRecognizer } = await import('@mediapipe/tasks-vision')
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
        recognizer = await GestureRecognizer.createFromOptions(wasm, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'GPU' },
        })
      } catch {
        if (session.current !== id) return
        recognizer = await GestureRecognizer.createFromOptions(wasm, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'CPU' },
        })
      }
      if (session.current !== id) {
        try {
          recognizer?.close()
        } catch {
          /* already closed */
        }
        recognizer = null
        return
      }

      let lastDetect = 0
      let smoothedX = 0.5
      let smoothedY = 0.5
      const hold = { mode: null as TreeMode | null, since: 0 }

      const tick = (now: number) => {
        if (cleaned || !recognizer) return
        raf = requestAnimationFrame(tick)
        if (document.hidden || now - lastDetect < 50 || video.readyState < 2) return
        lastDetect = now
        let result
        try {
          result = recognizer.recognizeForVideo(video, now)
        } catch {
          return
        }
        const landmarks = result.landmarks[0]
        if (!landmarks) {
          smoothedX += (0.5 - smoothedX) * 0.22
          smoothedY += (0.5 - smoothedY) * 0.22
          treeState.hand.active = false
          treeState.hand.dx = 0
          treeState.hand.dy = 0
          hold.mode = null
          return
        }
        const palm = landmarks[9] ?? landmarks[0]
        smoothedX += (1 - palm.x - smoothedX) * 0.35
        smoothedY += (palm.y - smoothedY) * 0.35
        treeState.hand.active = true
        treeState.hand.dx = smoothedX - 0.5
        treeState.hand.dy = smoothedY - 0.5

        const gesture = result.gestures[0]?.[0]
        const desired = modeFromGesture(gesture?.categoryName ?? '', gesture?.score ?? 0)
        if (!desired) {
          hold.mode = null
          return
        }
        if (hold.mode !== desired) {
          hold.mode = desired
          hold.since = now
          return
        }
        if (now - hold.since < HOLD_MS) return
        if (treeState.gestureLock) {
          if (desired === treeState.gestureLock) return
          treeState.gestureLock = null
          hold.since = now
          return
        }
        treeState.setMode(desired, 'gesture')
      }

      raf = requestAnimationFrame(tick)
      if (session.current === id) treeState.setCamera({ on: true, busy: false, error: false })
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
