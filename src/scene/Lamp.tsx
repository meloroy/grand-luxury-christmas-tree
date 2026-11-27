import { Float } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { startMusic } from '../session/music'
import { runtime, togglePower } from '../session/store'
import { getPower } from './sim'

const ANCHOR = new THREE.Vector3(8.4, 14.2, 11.5)

export function Lamp() {
  const gl = useThree((state) => state.gl)
  const crystal = useRef<THREE.Group>(null)
  const cord = useRef<THREE.Mesh>(null)
  const bulb = useRef<THREE.MeshStandardMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const drag = useRef({ active: false, startY: 0, extension: 0, velocity: 0, peak: 0 })

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const pull = drag.current
      if (!pull.active) return
      const distance = Math.max(0, Math.min(2.4, (event.clientY - pull.startY) * 0.012))
      pull.extension = distance
      pull.peak = Math.max(pull.peak, distance)
    }
    const up = () => {
      const pull = drag.current
      if (!pull.active) return
      pull.active = false
      if (runtime.phase === 'play' && (pull.peak > 0.9 || pull.peak < 0.08)) togglePower()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl])

  useFrame((_, dt) => {
    const pull = drag.current
    if (!pull.active) {
      pull.velocity += (0 - pull.extension) * 26 * dt
      pull.velocity *= Math.exp(-dt * 3.4)
      pull.extension += pull.velocity * dt
      if (Math.abs(pull.extension) < 0.001) pull.extension = 0
    }
    const length = 2.15 + Math.max(0, pull.extension)
    if (crystal.current) {
      crystal.current.position.set(ANCHOR.x, ANCHOR.y - length, ANCHOR.z)
      crystal.current.rotation.z = Math.sin(performance.now() * 0.004) * pull.velocity * 0.08
    }
    if (cord.current) {
      cord.current.scale.set(1, length, 1)
      cord.current.position.set(ANCHOR.x, ANCHOR.y - length / 2, ANCHOR.z)
    }
    const glow = getPower()
    if (bulb.current) bulb.current.emissiveIntensity = 0.15 + glow * 1.6
    if (light.current) light.current.intensity = 1.5 + glow * 10
  })

  return (
    <group>
      <mesh ref={cord} position={[8.4, 13.125, 11.5]}>
        <cylinderGeometry args={[0.012, 0.012, 1, 6]} />
        <meshBasicMaterial color="#ead9a4" />
      </mesh>
      <group
        ref={crystal}
        position={[8.4, 12.05, 11.5]}
        onPointerDown={(event) => {
          event.stopPropagation()
          event.nativeEvent.preventDefault()
          drag.current.active = true
          drag.current.startY = event.clientY
          drag.current.peak = 0
          startMusic()
        }}
        onPointerOver={() => {
          gl.domElement.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          gl.domElement.style.cursor = ''
        }}
      >
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.28} enabled={!drag.current.active}>
          <mesh>
            <icosahedronGeometry args={[0.46, 0]} />
            <meshStandardMaterial
              ref={bulb}
              color="#f6f1e4"
              metalness={0.62}
              roughness={0.12}
              emissive="#81D8D0"
              emissiveIntensity={0.2}
            />
          </mesh>
        </Float>
        <mesh>
          <sphereGeometry args={[0.9, 10, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <pointLight ref={light} color="#fff1cc" distance={16} decay={2} intensity={1} />
      </group>
    </group>
  )
}
