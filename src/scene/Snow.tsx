import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { getQuality } from './quality'
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
    const radius = 9.2
    for (let i = 0; i < count; i += 1) {
      const r = Math.sqrt(Math.random()) * radius
      const a = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = Math.sin(a) * r
      phases[i] = Math.random()
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
        },
        vertexShader: `
          uniform float uTime;
          attribute float aPhase;
          varying float vPhase;
          void main() {
            vPhase = aPhase;
            vec3 p = position;
            float wave = sin(p.x * 0.55 + uTime * 0.65 + aPhase) * cos(p.z * 0.5 + uTime * 0.5);
            p.y += wave * 0.08 + sin(uTime * 0.8 + aPhase * 6.2831) * 0.06;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (0.9 + aPhase * 1.15) * (120.0 / max(1.0, -mv.z));
          }
        `,
        fragmentShader: `
          uniform float uPower;
          varying float vPhase;
          void main() {
            vec2 c = gl_PointCoord - vec2(0.5);
            float a = smoothstep(0.5, 0.05, length(c));
            float glow = 0.05 + uPower * 0.32;
            vec3 col = mix(vec3(0.72, 0.82, 0.9), vec3(0.95, 0.97, 1.0), vPhase);
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
        color="#ffffff"
        size={0.16}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.75}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}
