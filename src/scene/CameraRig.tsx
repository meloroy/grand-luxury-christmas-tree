import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getPhotoTexture, runtime } from '../session/store'
import { getReveal } from './sim'
import { FOCUS_PHOTO_SCALE, photoAspect, polaroidLayout } from '../photos/polaroid'

const LOOK = new THREE.Vector3(0, 4.8, 0)
const FOCUS_AT = new THREE.Vector3(0, 2, 35)
const spherical = new THREE.Spherical(37, 1.25, 0)
const offset = new THREE.Vector3()
const destination = new THREE.Vector3()

export function CameraRig() {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)
  const orbit = useRef({ theta: 0, phi: 1.25, zoom: 1 })
  const look = useRef(LOOK.clone())

  useEffect(() => {
    const element = gl.domElement
    const points = new Map<number, { x: number; y: number }>()
    let pinch: number | null = null
    let midX = 0
    let midY = 0

    const onContext = (event: Event) => event.preventDefault()
    const onDown = (event: PointerEvent) => {
      if (event.target !== element || event.defaultPrevented) return
      if (event.pointerType !== 'touch' && event.button !== 0 && event.button !== 2) return
      points.set(event.pointerId, { x: event.clientX, y: event.clientY })
      element.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const previous = points.get(event.pointerId)
      if (!previous) return
      points.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (runtime.mode === 'FOCUS') return
      if (points.size >= 2) {
        const pair = [...points.values()]
        const dist = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y)
        const nextMidX = (pair[0].x + pair[1].x) / 2
        const nextMidY = (pair[0].y + pair[1].y) / 2
        if (pinch !== null) {
          orbit.current.zoom = THREE.MathUtils.clamp(orbit.current.zoom + (pinch - dist) * 0.0032, 0.72, 1.7)
          orbit.current.theta -= (nextMidX - midX) * 0.005
          orbit.current.phi = THREE.MathUtils.clamp(orbit.current.phi + (nextMidY - midY) * 0.003, 0.82, 1.72)
        }
        pinch = dist
        midX = nextMidX
        midY = nextMidY
        return
      }
      pinch = null
      orbit.current.theta -= (event.clientX - previous.x) * 0.005
      orbit.current.phi = THREE.MathUtils.clamp(orbit.current.phi + (event.clientY - previous.y) * 0.003, 0.82, 1.72)
    }
    const onUp = (event: PointerEvent) => {
      points.delete(event.pointerId)
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
      if (points.size < 2) pinch = null
    }
    const onBlur = () => {
      const activePointers = [...points.keys()]
      points.clear()
      pinch = null
      for (const id of activePointers) {
        if (element.hasPointerCapture(id)) element.releasePointerCapture(id)
      }
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      orbit.current.zoom = THREE.MathUtils.clamp(orbit.current.zoom + event.deltaY * 0.001, 0.72, 1.7)
    }

    element.addEventListener('contextmenu', onContext)
    // Run after scene controls so pulling the lamp can claim the pointer.
    window.addEventListener('pointerdown', onDown)
    element.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    element.addEventListener('lostpointercapture', onUp)
    window.addEventListener('blur', onBlur)
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      element.removeEventListener('contextmenu', onContext)
      onBlur()
      window.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      element.removeEventListener('lostpointercapture', onUp)
      window.removeEventListener('blur', onBlur)
      element.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  useFrame((_, dt) => {
    const persp = camera as THREE.PerspectiveCamera
    if (persp.isPerspectiveCamera && persp.fov !== 34) {
      persp.fov = 34
      persp.updateProjectionMatrix()
    }
    const aspect = size.width / Math.max(1, size.height)
    const focus = runtime.phase === 'play' && runtime.mode === 'FOCUS'
    if (focus) {
      const layout = polaroidLayout(photoAspect(getPhotoTexture(runtime.focusIndex)?.image))
      const frameWidth = layout.frameWidth * FOCUS_PHOTO_SCALE
      const frameHeight = (layout.frameHeight + layout.clipOverhang) * FOCUS_PHOTO_SCALE
      const margin = 1.22
      const tan = Math.tan((34 * Math.PI) / 360)
      const distForHeight = (frameHeight * margin) / (2 * tan)
      const distForWidth = (frameWidth * margin) / (2 * tan * Math.max(aspect, 0.3))
      const distance = Math.max(distForHeight, distForWidth) * orbit.current.zoom
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 2.6, dt)
      camera.position.y = THREE.MathUtils.damp(camera.position.y, FOCUS_AT.y + 0.35, 2.6, dt)
      camera.position.z = THREE.MathUtils.damp(camera.position.z, FOCUS_AT.z + distance, 2.6, dt)
      look.current.x = THREE.MathUtils.damp(look.current.x, FOCUS_AT.x, 2.6, dt)
      look.current.y = THREE.MathUtils.damp(look.current.y, FOCUS_AT.y, 2.6, dt)
      look.current.z = THREE.MathUtils.damp(look.current.z, FOCUS_AT.z, 2.6, dt)
      camera.lookAt(look.current)
      return
    }
    const defaultBase = aspect < 0.85 ? 43 : 37
    const textDistance = 22 / (2 * Math.tan((34 * Math.PI) / 360) * Math.max(aspect, 0.2))
    const treeDistance = Math.max(42, 12 / (2 * Math.tan((34 * Math.PI) / 360) * Math.max(aspect, 0.2)))
    const base = runtime.mode === 'TEXT' ? Math.max(defaultBase, textDistance)
      : runtime.mode === 'TREE' ? Math.max(defaultBase, treeDistance) : defaultBase
    const reveal = runtime.phase === 'reveal' ? getReveal() : 1
    const ease = 1 - (1 - reveal) ** 3
    const radius = base * orbit.current.zoom * (runtime.phase === 'reveal' ? THREE.MathUtils.lerp(1.28, 1, ease) : 1)
    spherical.radius = radius
    spherical.phi = orbit.current.phi
    spherical.theta = orbit.current.theta
    offset.setFromSpherical(spherical)
    destination.copy(LOOK).add(offset)
    camera.position.x = THREE.MathUtils.damp(camera.position.x, destination.x, 3.2, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, destination.y, 3.2, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, destination.z, 3.2, dt)
    look.current.x = THREE.MathUtils.damp(look.current.x, LOOK.x, 3.2, dt)
    look.current.y = THREE.MathUtils.damp(look.current.y, LOOK.y, 3.2, dt)
    look.current.z = THREE.MathUtils.damp(look.current.z, LOOK.z, 3.2, dt)
    camera.lookAt(look.current)
  })

  return null
}
