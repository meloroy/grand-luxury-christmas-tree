import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type * as THREE from 'three'
import { getQuality } from './quality'
import { getOrnamentPose, getPower } from './sim'

const COLORS = ['#f0d48a', '#d0121c', '#81D8D0', '#e8eef5', '#9dffc4', '#c9a36a']

function Ornament({ index }: { index: number }) {
  const ref = useRef<THREE.Group>(null)
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const kind = index % 3
  const color = COLORS[index % COLORS.length]

  useFrame(() => {
    const group = ref.current
    const pose = getOrnamentPose(index)
    if (!group || !pose) return
    group.position.set(pose.x, pose.y, pose.z)
    group.rotation.set(pose.rx, pose.ry, pose.rz)
    group.scale.setScalar(Math.max(0.001, pose.s))
    if (material.current) material.current.emissiveIntensity = 0.12 + getPower() * 0.7
  })

  return (
    <group ref={ref}>
      {kind === 0 ? (
        <mesh>
          <sphereGeometry args={[0.28, 24, 16]} />
          <meshStandardMaterial
            ref={material}
            color={color}
            metalness={0.88}
            roughness={0.14}
            emissive={color}
            emissiveIntensity={0.3}
          />
        </mesh>
      ) : null}
      {kind === 1 ? (
        <group>
          <mesh scale={[1, 0.88, 1]}>
            <sphereGeometry args={[0.26, 24, 16]} />
            <meshStandardMaterial
              ref={material}
              color="#e7fff8"
              metalness={0.25}
              roughness={0.08}
              emissive="#81D8D0"
              emissiveIntensity={0.35}
            />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.02, 0.03, 0.14, 8]} />
            <meshStandardMaterial color="#d7b56a" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ) : null}
      {kind === 2 ? (
        <group>
          <mesh position={[0, -0.06, 0]}>
            <coneGeometry args={[0.28, 0.42, 8]} />
            <meshStandardMaterial
              ref={material}
              color="#bff8ee"
              metalness={0.4}
              roughness={0.12}
              emissive="#1E5959"
              emissiveIntensity={0.45}
            />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <coneGeometry args={[0.18, 0.32, 8]} />
            <meshStandardMaterial color="#f3fffb" emissive="#81D8D0" emissiveIntensity={0.4} metalness={0.45} roughness={0.1} />
          </mesh>
        </group>
      ) : null}
    </group>
  )
}

export function Ornaments() {
  const count = getQuality().ornaments
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <Ornament key={index} index={index} />
      ))}
    </group>
  )
}
