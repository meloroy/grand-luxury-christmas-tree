import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PHOTO_COUNT, MONTHS } from '../photos/months'
import { captionTexture, paperTexture, photoAspect, polaroidLayout } from '../photos/polaroid'
import { focusMonth, getPhotoTexture, nextPhoto, runtime, useSession } from '../session/store'
import { getPhotoPose } from './sim'

function Polaroid({ index, texture, caption, paper, wood }: {
  index: number; texture: THREE.Texture; caption: string; paper: THREE.Texture; wood: THREE.Texture
}) {
  const ref = useRef<THREE.Group>(null)
  const hovered = useRef(false)
  const hoverMix = useRef(0)
  const layout = polaroidLayout(photoAspect(texture.image))
  const { width, height, frameWidth, frameHeight, imageY, thickness, bottom } = layout
  const label = useMemo(() => captionTexture(MONTHS[index], caption, frameWidth, bottom), [index, caption, frameWidth, bottom])
  useEffect(() => () => { label.dispose(); document.body.style.cursor = '' }, [label])

  useFrame((state, dt) => {
    const group = ref.current, pose = getPhotoPose(index)
    if (!group) return
    const focus = runtime.mode === 'FOCUS'
    const hover = hovered.current && !focus
    hoverMix.current = THREE.MathUtils.damp(hoverMix.current, hover ? 1 : 0, 8, dt)
    group.position.set(pose.x, pose.y + hoverMix.current * 0.07, pose.z)
    group.rotation.set(pose.rx, pose.ry, pose.rz + (focus ? 0 : Math.sin(state.clock.elapsedTime * 1.1 + index) * 0.018))
    group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, Math.max(0.001, pose.s * (1 + hoverMix.current * 0.08)), 7, dt))
  })

  return <group ref={ref} scale={0.001} onClick={(event) => {
    if (event.delta > 5 || runtime.photoEditing) return
    event.stopPropagation()
    if (runtime.mode === 'FOCUS' && runtime.focusIndex === index) nextPhoto(1)
    else focusMonth(index)
  }} onPointerOver={(event) => {
    event.stopPropagation(); hovered.current = true; document.body.style.cursor = 'pointer'
  }} onPointerOut={() => { hovered.current = false; document.body.style.cursor = '' }}>
    <mesh>
      <boxGeometry args={[frameWidth, frameHeight, thickness]} />
      <meshBasicMaterial map={paper} color="#c4baa6" toneMapped={false} />
    </mesh>
    {([1, -1] as const).map((side) => <group key={side} position={[0, 0, side * (thickness / 2 + 0.002)]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
      <mesh position={[0, imageY, 0.001]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      <mesh position={[0, -frameHeight / 2 + bottom / 2, 0.002]}>
        <planeGeometry args={[frameWidth - 0.04, bottom - 0.035]} />
        <meshBasicMaterial map={label} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>)}
    <group position={[0, frameHeight / 2 + 0.015, 0]} rotation={[0, 0, Math.sin(index * 2) * 0.07]}>
      {[-1, 1].map((side) => <mesh key={side} position={[0, 0, side * 0.036]} rotation={[side * -0.08, 0, 0]}>
        <boxGeometry args={[0.09, 0.24, 0.04]} />
        <meshBasicMaterial map={wood} color="#e9c995" />
      </mesh>)}
      <mesh position={[0, 0, 0.06]}>
        <torusGeometry args={[0.027, 0.006, 5, 12]} />
        <meshBasicMaterial color="#887152" />
      </mesh>
    </group>
  </group>
}

export function PhotoWall() {
  const snapshot = useSession()
  const paper = useMemo(() => paperTexture(), [])
  const wood = useMemo(() => paperTexture(true), [])
  useEffect(() => () => { paper.dispose(); wood.dispose() }, [paper, wood])
  const photos = useMemo(() => Array.from({ length: PHOTO_COUNT }, (_, index) => {
    const texture = getPhotoTexture(index)
    return texture ? { index, texture } : null
  }).filter((item): item is { index: number; texture: THREE.Texture } => item !== null), [snapshot.sources])

  return <group renderOrder={1}>
    {photos.map((photo) => <Polaroid key={photo.index} {...photo} caption={snapshot.captions[photo.index]} paper={paper} wood={wood} />)}
  </group>
}
