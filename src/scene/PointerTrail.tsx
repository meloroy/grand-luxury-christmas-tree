import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { runtime } from '../session/store'
import { getPalette } from './palette'
import { getQuality } from './quality'

/** Screen-space stardust: follows the pointer without deforming the scene. */
export function PointerTrail() {
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)
  const pointer = useRef({ x: 0, y: 0, previousX: 0, previousY: 0, active: false, dragging: false, fresh: true })
  const reduced = useRef(false)
  const count = getQuality().tier === 'desktop' ? 180 : 96
  const dust = useMemo(() => ({
    x: new Float32Array(count), y: new Float32Array(count),
    vx: new Float32Array(count), vy: new Float32Array(count),
    age: new Float32Array(count).fill(10), life: new Float32Array(count),
    size: new Float32Array(count), width: new Float32Array(count),
    position: new Float32Array(count * 3), alpha: new Float32Array(count),
    angle: new Float32Array(count), tint: new Float32Array(count),
    cursor: 0, carry: 0,
  }), [count])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    for (const [name, array, width] of [
      ['position', dust.position, 3], ['aAlpha', dust.alpha, 1], ['aSize', dust.size, 1],
      ['aAngle', dust.angle, 1], ['aWidth', dust.width, 1], ['aTint', dust.tint, 1],
    ] as const) geo.setAttribute(name, new THREE.BufferAttribute(array, width).setUsage(THREE.DynamicDrawUsage))
    return geo
  }, [dust])

  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uDpr: { value: 1 }, uPrimary: { value: getPalette().primary }, uSecondary: { value: getPalette().secondary },
    },
    vertexShader: `
      uniform float uDpr;
      attribute float aAlpha, aSize, aAngle, aWidth, aTint;
      varying float vAlpha, vAngle, vWidth, vTint;
      void main() {
        vAlpha = aAlpha; vAngle = aAngle; vWidth = aWidth; vTint = aTint;
        gl_Position = vec4(position.xy, 0.0, 1.0);
        gl_PointSize = max(1.0, aSize * uDpr);
      }
    `,
    fragmentShader: `
      uniform vec3 uPrimary, uSecondary;
      varying float vAlpha, vAngle, vWidth, vTint;
      void main() {
        if (vAlpha < 0.005) discard;
        vec2 p = gl_PointCoord - vec2(0.5);
        p.y = -p.y;
        float along = p.x * cos(vAngle) + p.y * sin(vAngle);
        float across = -p.x * sin(vAngle) + p.y * cos(vAngle);
        float head = exp(-((along - 0.18) * (along - 0.18) + across * across) * 85.0);
        float tail = exp(-across * across / (vWidth * vWidth))
          * smoothstep(-0.5, 0.18, along) * (1.0 - smoothstep(0.18, 0.48, along));
        float alpha = (head * 0.85 + tail * 0.35) * vAlpha;
        gl_FragColor = vec4(mix(uPrimary, uSecondary, vTint), alpha);
      }
    `,
  }), [])

  useEffect(() => {
    const canvas = gl.domElement
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const preference = () => { reduced.current = motion.matches }
    preference()
    motion.addEventListener('change', preference)
    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const p = pointer.current
      const x = event.clientX - rect.left, y = event.clientY - rect.top
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height
      if (!p.active) p.fresh = true
      p.x = x; p.y = y
      p.active = inside && (event.pointerType !== 'touch' || event.buttons !== 0)
    }
    const down = (event: PointerEvent) => { move(event); pointer.current.dragging = true }
    const up = (event: PointerEvent) => {
      pointer.current.dragging = false
      if (event.pointerType === 'touch') pointer.current.active = false
    }
    const leave = () => { pointer.current.active = false; pointer.current.dragging = false }
    canvas.addEventListener('pointerenter', move)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('pointercancel', leave)
    window.addEventListener('pointerup', up)
    window.addEventListener('blur', leave)
    return () => {
      motion.removeEventListener('change', preference)
      canvas.removeEventListener('pointerenter', move)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('pointercancel', leave)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('blur', leave)
    }
  }, [gl])

  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = pointer.current
    const enabled = runtime.phase === 'play' && runtime.mode !== 'FOCUS' && !reduced.current && !document.hidden
    if (p.fresh) { p.previousX = p.x; p.previousY = p.y; p.fresh = false }
    const dx = p.x - p.previousX, dy = p.y - p.previousY
    const speed = Math.hypot(dx, dy) / Math.max(dt, 0.001)
    if (enabled && p.active) {
      dust.carry += dt * Math.min(180, 14 + speed * 0.14) * (p.dragging ? 1.35 : 1)
      const emit = Math.min(count, Math.floor(dust.carry))
      dust.carry -= emit
      for (let n = 0; n < emit; n += 1) {
        const i = dust.cursor++ % count
        const t = (n + 1) / Math.max(1, emit)
        const angle = Math.random() * Math.PI * 2
        const moving = speed > 30
        dust.x[i] = p.previousX + dx * t + Math.cos(angle) * 3
        dust.y[i] = p.previousY + dy * t + Math.sin(angle) * 3
        const inertia = moving ? 0.12 : 0
        dust.vx[i] = dx / Math.max(dt, 0.001) * inertia + Math.cos(angle) * (moving ? 18 : 7)
        dust.vy[i] = dy / Math.max(dt, 0.001) * inertia + Math.sin(angle) * (moving ? 18 : 7)
        dust.age[i] = 0
        dust.life[i] = (moving ? 0.5 : 0.35) + Math.random() * 0.35
        dust.size[i] = moving ? Math.min(30, 9 + speed * 0.008) * (0.5 + Math.random() * 0.5) : 4 + Math.random() * 4
        dust.width[i] = moving ? 0.045 : 0.15
        dust.angle[i] = Math.atan2(-dust.vy[i], dust.vx[i])
        dust.tint[i] = Math.random()
      }
    } else dust.carry = 0
    p.previousX = p.x; p.previousY = p.y
    for (let i = 0; i < count; i += 1) {
      dust.age[i] += Math.min(delta, 1)
      if (!enabled || dust.age[i] >= dust.life[i]) { dust.alpha[i] = 0; continue }
      const fade = 1 - dust.age[i] / dust.life[i]
      const drag = Math.exp(-dt * 2)
      dust.vx[i] *= drag; dust.vy[i] *= drag
      dust.x[i] += dust.vx[i] * dt; dust.y[i] += dust.vy[i] * dt
      dust.position[i * 3] = dust.x[i] / Math.max(1, size.width) * 2 - 1
      dust.position[i * 3 + 1] = 1 - dust.y[i] / Math.max(1, size.height) * 2
      dust.alpha[i] = fade * fade * 0.85
    }
    material.uniforms.uDpr.value = Math.min(1.5, gl.getPixelRatio())
    for (const name of ['position', 'aAlpha', 'aSize', 'aAngle', 'aWidth', 'aTint']) geometry.getAttribute(name).needsUpdate = true
  })

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={5} raycast={() => {}} />
}
