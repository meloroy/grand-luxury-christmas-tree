import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { runtime } from '../session/store'
import { getReveal } from './sim'

const LOOK = new THREE.Vector3(0, 5.7, 0)
const FOCUS_AT = new THREE.Vector3(0, 2, 35)
const spherical = new THREE.Spherical(34, 1.47, 0)
const offset = new THREE.Vector3()
const destination = new THREE.Vector3()

export function CameraRig() {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)
  const orbit = useRef({ theta: 0, phi: 1.47, zoom: 1 })
  const look = useRef(LOOK.clone())

  useEffect(() => {
    const element = gl.domElement
    let right = false
    let lastX = 0
    let lastY = 0
    const points = new Map<number, { x: number; y: number }>()
    let pinch: number | null = null
    let midX = 0
    let midY = 0

    const onContext = (event: Event) => event.preventDefault()
    const onDown = (event: PointerEvent) => {
      points.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (event.button === 2) {
        right = true
        lastX = event.clientX
        lastY = event.clientY
      }
    }
    const onMove = (event: PointerEvent) => {
      if (!points.has(event.pointerId)) return
      points.set(event.pointerId, { x: event.clientX, y: event.clientY })
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
      if (!right) return
      orbit.current.theta -= (event.clientX - lastX) * 0.005
      orbit.current.phi = THREE.MathUtils.clamp(orbit.current.phi + (event.clientY - lastY) * 0.003, 0.82, 1.72)
      lastX = event.clientX
      lastY = event.clientY
    }
    const onUp = (event: PointerEvent) => {
      points.delete(event.pointerId)
      if (event.button === 2) right = false
      if (points.size < 2) pinch = null
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      orbit.current.zoom = THREE.MathUtils.clamp(orbit.current.zoom + event.deltaY * 0.001, 0.72, 1.7)
    }

    element.addEventListener('contextmenu', onContext)
    element.addEventListener('pointerdown', onDown)
    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerup', onUp)
    element.addEventListener('pointercancel', onUp)
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      element.removeEventListener('contextmenu', onContext)
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerup', onUp)
      element.removeEventListener('pointercancel', onUp)
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
      const frameWidth = 1.12 * 4.5
      const frameHeight = 1.38 * 4.5
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
    const base = aspect < 0.85 ? 40 : 34
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
