import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getQuality } from './quality'
import { writeParticles } from './sim'
import { runtime } from '../session/store'

export function ParticleField() {
  const quality = getQuality()
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => new THREE.OctahedronGeometry(1, 0), [])
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        toneMapped: false,
        transparent: true,
        opacity: 0.82,
        blending: THREE.NormalBlending,
        depthWrite: false,
      }),
    [],
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    mesh.count = quality.particles
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(quality.particles * 3), 3)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
  }, [quality.particles])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame((_, delta) => {
    const surface = runtime.phase === 'play' && runtime.mode === 'SANTA' && !runtime.morphing
    material.opacity = THREE.MathUtils.damp(material.opacity, surface ? 0.12 : 0.82, 7, delta)
    const mesh = ref.current
    if (mesh?.instanceColor) writeParticles(mesh)
  })

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, quality.particles]}
      frustumCulled={false}
      renderOrder={2}
    />
  )
}
