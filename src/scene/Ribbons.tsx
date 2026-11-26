import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getQuality } from './quality'
import { writeRibbons } from './sim'

export function Ribbons() {
  const quality = getQuality()
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        toneMapped: false,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    mesh.count = quality.ribbons
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(quality.ribbons * 3), 3)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
  }, [quality.ribbons])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame(() => {
    const mesh = ref.current
    if (mesh?.instanceColor) writeRibbons(mesh)
  })

  return (
    <instancedMesh ref={ref} args={[geometry, material, quality.ribbons]} frustumCulled={false} renderOrder={2} />
  )
}
