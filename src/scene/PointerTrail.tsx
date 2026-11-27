import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { runtime } from '../session/store'
import { getPalette } from './palette'
import { getQuality } from './quality'
import { createPointerDust, stepPointerDust } from './pointerDust'

/** Screen-space stardust: follows the pointer without deforming the scene. */
export function PointerTrail() {
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)
  const pointer = useRef({ x: 0, y: 0, active: false, fresh: true })
  const reduced = useRef(false)
  const count = getQuality().tier === 'desktop' ? 512 : 320
  const dust = useMemo(() => createPointerDust(count), [count])

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
        float head = exp(-((along - 0.18) * (along - 0.18) + across * across) * 220.0);
        float tail = exp(-across * across / (vWidth * vWidth))
          * smoothstep(-0.5, 0.18, along) * (1.0 - smoothstep(0.18, 0.48, along));
        float alpha = (head * 0.45 + tail * 0.5) * vAlpha;
        // Keep this overlay below bloom's threshold instead of blooming each bead.
        gl_FragColor = vec4(mix(uPrimary, uSecondary, vTint) * 0.32, alpha);
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
    const up = (event: PointerEvent) => {
      if (event.pointerType === 'touch') pointer.current.active = false
    }
    const leave = () => { pointer.current.active = false }
    canvas.addEventListener('pointerenter', move)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerdown', move)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('pointercancel', leave)
    window.addEventListener('pointerup', up)
    window.addEventListener('blur', leave)
    return () => {
      motion.removeEventListener('change', preference)
      canvas.removeEventListener('pointerenter', move)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerdown', move)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('pointercancel', leave)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('blur', leave)
    }
  }, [gl])

  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  useFrame((_, delta) => {
    const p = pointer.current
    const enabled = runtime.phase === 'play' && runtime.mode !== 'FOCUS' && !reduced.current && !document.hidden
    if (p.fresh) { dust.fresh = true; p.fresh = false }
    stepPointerDust(dust, p, delta, size.width, size.height, enabled)
    material.uniforms.uDpr.value = Math.min(2, gl.getPixelRatio())
    for (const name of ['position', 'aAlpha', 'aSize', 'aAngle', 'aWidth', 'aTint']) geometry.getAttribute(name).needsUpdate = true
  })

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={5} raycast={() => {}} />
}
