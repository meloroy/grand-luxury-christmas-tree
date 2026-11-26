import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getPhotoTexture } from '../session/store'
import { getPhotoPose, getPower } from './sim'

function Polaroid({ index, texture }: { index: number; texture: THREE.Texture }) {
  const ref = useRef<THREE.Group>(null)
  const frame = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    const group = ref.current
    const pose = getPhotoPose(index)
    if (!group) return
    group.position.set(pose.x, pose.y, pose.z)
    group.rotation.set(pose.rx, pose.ry, pose.rz)
    group.scale.setScalar(Math.max(0.001, pose.s))
    if (frame.current) frame.current.emissiveIntensity = 0.18 + getPower() * 0.85
  })

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[1.12, 1.38, 0.055]} />
        <meshStandardMaterial
          ref={frame}
          color="#f0d48a"
          metalness={0.94}
          roughness={0.22}
          emissive="#a07828"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[0, -0.03, 0.034]}>
        <planeGeometry args={[0.96, 1.12]} />
        <meshBasicMaterial map={texture} toneMapped />
      </mesh>
    </group>
  )
}

export function PhotoWall() {
  const photos = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => {
        const texture = getPhotoTexture(index)
        return texture ? { index, texture } : null
      }).filter((item): item is { index: number; texture: THREE.Texture } => item !== null),
    [],
  )

  return (
    <group renderOrder={1}>
      {photos.map((photo) => (
        <Polaroid key={photo.index} index={photo.index} texture={photo.texture} />
      ))}
    </group>
  )
}
