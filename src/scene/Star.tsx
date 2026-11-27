import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { runtime } from '../session/store'
import { getPower } from './sim'
import { TREE } from './tree'
import { getPalette } from './palette'

function starGeometry() {
  const shape = new THREE.Shape()
  const spikes = 5
  const outer = 0.5
  const inner = 0.21
  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 1,
  })
  geometry.center()
  return geometry
}

export function Star() {
  const ref = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const material = useRef<THREE.MeshBasicMaterial>(null)
  const geometry = useMemo(starGeometry, [])
  const y = TREE.y0 + TREE.height + 0.35

  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    const show = runtime.mode === 'TREE' && !runtime.morphing ? 0.85 + getPower() * 0.2 : 0.001
    mesh.scale.setScalar(THREE.MathUtils.damp(mesh.scale.x, show, 4, dt))
    mesh.position.set(0, y, 0)
    mesh.rotation.y += dt * 0.35
    if (material.current) material.current.color.copy(getPalette().star)
    if (light.current) light.current.color.copy(getPalette().star)
    if (light.current) light.current.intensity = runtime.mode === 'TREE' ? 4 * getPower() : 0
  })

  return (
    <group>
      <mesh ref={ref} geometry={geometry} position={[0, y, 0]} renderOrder={2}>
        <meshBasicMaterial ref={material} color="#f5e779" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, y, 0.4]} color="#ffe1a0" distance={18} decay={2} intensity={0} />
    </group>
  )
}
