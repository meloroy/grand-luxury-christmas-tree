import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PHOTO_COUNT } from '../photos/months'
import { focusMonth, getPhotoTexture, nextPhoto, runtime } from '../session/store'
import { getPhotoPose, getPower } from './sim'

function Polaroid({ index, texture }: { index: number; texture: THREE.Texture }) {
  const ref = useRef<THREE.Group>(null)
  const frame = useRef<THREE.MeshStandardMaterial>(null)
  const image = texture.image as HTMLImageElement
  const aspect = image.naturalWidth / image.naturalHeight
  // Fit the original aspect ratio within the existing scene budget.
  // The uploaded pixels and texture UVs remain unchanged.
  const width = Math.min(0.96, 1.12 * aspect)
  const height = width / aspect
  const border = Math.min(width, height) * 0.025
  const thickness = 0.012

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
    <group ref={ref} onClick={(event) => {
      if (event.delta > 5) return
      event.stopPropagation()
      if (runtime.mode === 'FOCUS' && runtime.focusIndex === index) nextPhoto(1)
      else focusMonth(index)
    }} onPointerOver={(event) => {
      event.stopPropagation()
      document.body.style.cursor = 'pointer'
    }} onPointerOut={() => { document.body.style.cursor = '' }}>
      <mesh>
        <boxGeometry args={[width + border * 2, height + border * 2, thickness]} />
        <meshStandardMaterial
          ref={frame}
          transparent
          opacity={0.1}
          depthWrite={false}
          color="#f0d48a"
          metalness={0.94}
          roughness={0.22}
          emissive="#a07828"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[0, 0, thickness / 2 + 0.001]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} toneMapped />
      </mesh>
      {/* A separate outward-facing back keeps the image readable, not mirrored. */}
      <mesh position={[0, 0, -thickness / 2 - 0.001]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} toneMapped />
      </mesh>
    </group>
  )
}

export function PhotoWall() {
  const photos = useMemo(
    () =>
      Array.from({ length: PHOTO_COUNT }, (_, index) => {
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
