import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { LOOK_AT } from './constants'
import { fitView } from './quality'
import { treeState } from './treeState'

const LOOK = new THREE.Vector3(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z)

function createInitialSpherical() {
  const offset = new THREE.Vector3(0, 4, 20).sub(LOOK)
  return new THREE.Spherical().setFromVector3(offset)
}

export function CameraRig() {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)
  const spherical = useRef<THREE.Spherical>(null)
  const target = useRef({ theta: 0, phi: 1.2, radius: 20 })
  const offset = useRef(new THREE.Vector3())
  const zoomed = useRef(false)
  if (!spherical.current) {
    const initial = createInitialSpherical()
    const fitted = fitView(window.innerWidth, window.innerHeight)
    spherical.current = initial
    spherical.current.radius = fitted.radius
    target.current.theta = initial.theta
    target.current.phi = initial.phi
    target.current.radius = fitted.radius
  }

  useEffect(() => {
    const element = gl.domElement
    const pointers = new Map<number, { x: number; y: number }>()
    let pinch: number | null = null
    const last = { x: 0, y: 0 }

    const distance = () => {
      const points = [...pointers.values()]
      if (points.length < 2) return null
      return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
    }

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      last.x = event.clientX
      last.y = event.clientY
      pinch = distance()
      try {
        element.setPointerCapture(event.pointerId)
      } catch {
        /* iOS can reject capture after the gesture has already ended */
      }
    }

    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      const span = distance()
      if (pointers.size >= 2 && span !== null && pinch !== null) {
        const delta = pinch - span
        target.current.radius = THREE.MathUtils.clamp(target.current.radius + delta * 0.018, 12, 42)
        pinch = span
        zoomed.current = true
        event.preventDefault()
        return
      }
      if (pointers.size !== 1) return
      const dx = event.clientX - last.x
      const dy = event.clientY - last.y
      last.x = event.clientX
      last.y = event.clientY
      target.current.theta -= dx * 0.005
      target.current.phi = THREE.MathUtils.clamp(target.current.phi - dy * 0.0032, 0.48, 1.62)
      event.preventDefault()
    }

    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      pinch = distance()
      const remaining = [...pointers.values()]
      if (remaining[0]) {
        last.x = remaining[0].x
        last.y = remaining[0].y
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      target.current.radius = THREE.MathUtils.clamp(target.current.radius + delta * 0.006, 12, 42)
      zoomed.current = true
    }

    element.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      element.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      element.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  useFrame((_, delta) => {
    const view = fitView(size.width, size.height)
    if (camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov - view.fov) > 0.05) {
      camera.fov = view.fov
      camera.updateProjectionMatrix()
    }
    const aim = target.current
    if (!zoomed.current) aim.radius = view.radius
    else aim.radius = THREE.MathUtils.clamp(aim.radius, Math.max(12, view.radius * 0.72), Math.min(46, view.radius * 1.45))

    const hand = treeState.hand
    if (hand.active) {
      const dead = 0.045
      const ax = Math.abs(hand.dx) < dead ? 0 : hand.dx - Math.sign(hand.dx) * dead
      const ay = Math.abs(hand.dy) < dead ? 0 : hand.dy - Math.sign(hand.dy) * dead
      aim.theta -= ax * 0.9 * delta
      aim.phi = THREE.MathUtils.clamp(aim.phi + ay * 0.55 * delta, 0.48, 1.62)
    }

    const current = spherical.current
    if (!current) return
    const k = 1 - Math.exp(-5.4 * Math.min(delta, 0.05))
    current.theta += (aim.theta - current.theta) * k
    current.phi += (aim.phi - current.phi) * k
    current.radius += (aim.radius - current.radius) * k
    offset.current.setFromSpherical(current)
    camera.position.copy(LOOK).add(offset.current)
    camera.lookAt(LOOK)
  })

  return null
}
