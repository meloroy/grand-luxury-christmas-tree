import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getQuality } from './quality'

export function Starfield() {
  const material = useRef<THREE.ShaderMaterial>(null)
  const quality = getQuality()
  const geometry = useMemo(() => {
    const count = quality.stars
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      const radius = 70 + Math.random() * 60
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
      positions[i * 3 + 1] = Math.cos(phi) * radius * 0.72
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
      phases[i] = Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    return geo
  }, [quality.stars])

  const shader = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          uniform float uTime;
          attribute float aPhase;
          varying float vTwinkle;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            vTwinkle = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.6 + aPhase) + aPhase * 12.0));
            gl_PointSize = (1.1 + aPhase * 2.8) * vTwinkle * (180.0 / max(1.0, -mv.z));
          }
        `,
        fragmentShader: `
          varying float vTwinkle;
          void main() {
            vec2 c = gl_PointCoord - vec2(0.5);
            float a = smoothstep(0.5, 0.05, length(c)) * vTwinkle;
            gl_FragColor = vec4(vec3(0.9, 0.94, 1.0), a);
          }
        `,
      }),
    [],
  )

  useFrame((_, dt) => {
    if (material.current) material.current.uniforms.uTime.value += dt
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <primitive object={shader} ref={material} attach="material" />
    </points>
  )
}
