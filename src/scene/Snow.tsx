import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { getQuality } from './quality'
import { hash } from './shapes'
import { getPalette } from './palette'
import { getPower } from './sim'
import { TREE } from './tree'

function snowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.28, 'rgba(255,255,255,0.75)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 64, 64)
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 1.2
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(32, 32)
    ctx.lineTo(32 + Math.cos(angle) * 22, 32 + Math.sin(angle) * 22)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function SnowGround() {
  const quality = getQuality()
  const geometry = useMemo(() => {
    const count = quality.ground
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      const band = Math.floor(hash(i + 301) * 5)
      const a = hash(i + 302) * Math.PI * 2
      const loose = hash(i + 303) > 0.82
      const r = loose
        ? 4 + hash(i + 304) * 6
        : 4.5 + band * 1.05 + Math.sin(a * 3 + band) * 0.12 + (hash(i + 304) - 0.5) * 0.26
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = (hash(i + 305) - 0.5) * (loose ? 0.7 : 0.16)
      positions[i * 3 + 2] = Math.sin(a) * r
      phases[i] = hash(i + 306)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    return geo
  }, [quality.ground])

  const shader = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPower: { value: 0 },
          uPrimary: { value: getPalette().primary },
          uSecondary: { value: getPalette().secondary },
        },
        vertexShader: `
          uniform float uTime;
          attribute float aPhase;
          varying float vPhase;
          void main() {
            vPhase = aPhase;
            vec3 p = position;
            float turn = uTime * (0.025 + aPhase * 0.018);
            p.xz = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * p.xz;
            float wave = sin(p.x * 0.55 + uTime * 0.65 + aPhase) * cos(p.z * 0.5 + uTime * 0.5);
            p.y += wave * 0.08 + sin(uTime * 0.8 + aPhase * 6.2831) * 0.06;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (0.35 + aPhase * 0.6) * (90.0 / max(1.0, -mv.z));
          }
        `,
        fragmentShader: `
          uniform float uPower;
          uniform vec3 uPrimary;
          uniform vec3 uSecondary;
          varying float vPhase;
          void main() {
            vec2 c = gl_PointCoord - vec2(0.5);
            float a = 1.0 - smoothstep(0.02, 0.5, length(c));
            float glow = (0.025 + uPower * 0.28) * (0.5 + vPhase * 0.5);
            vec3 col = mix(uPrimary * 0.78, uSecondary * 0.98, step(0.52, vPhase));
            gl_FragColor = vec4(col, a * glow);
          }
        `,
      }),
    [],
  )

  useFrame((_, dt) => {
    shader.uniforms.uTime.value += dt
    shader.uniforms.uPower.value = getPower()
  })

  return <points geometry={geometry} material={shader} position={[0, TREE.y0 - 0.15, 0]} frustumCulled={false} />
}

export function SnowFall({ count }: { count: number }) {
  const map = useMemo(() => snowTexture(), [])
  const positions = useMemo(() => {
    const array = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      array[i * 3] = (Math.random() - 0.5) * 36
      array[i * 3 + 1] = Math.random() * 24 - 4
      array[i * 3 + 2] = (Math.random() - 0.5) * 28
    }
    return array
  }, [count])
  const speeds = useMemo(() => Float32Array.from({ length: count }, () => 0.35 + Math.random() * 0.9), [count])
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [positions])

  useFrame((_, dt) => {
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    const array = attr.array as Float32Array
    for (let i = 0; i < count; i += 1) {
      array[i * 3 + 1] -= speeds[i] * dt
      array[i * 3] += Math.sin(array[i * 3 + 1] * 0.4 + i) * dt * 0.15
      if (array[i * 3 + 1] < -4) {
        array[i * 3 + 1] = 18
        array[i * 3] = (Math.random() - 0.5) * 36
        array[i * 3 + 2] = (Math.random() - 0.5) * 28
      }
    }
    attr.needsUpdate = true
  })

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={3}>
      <pointsMaterial
        map={map}
        color="#fff1c9"
        size={0.08}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.42}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}
