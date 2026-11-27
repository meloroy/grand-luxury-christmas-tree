import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { runtime } from '../session/store'
import { createSantaSleigh } from './characters'

/** The same sculpted surfaces as the particles, revealed only after assembly. */
export function SantaSleigh() {
  const root = useRef<THREE.Group>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)
  const opacity = useRef(0)
  const surfaces = useMemo(() => {
    const byColor = new Map<string, { color: THREE.Color; geometries: THREE.BufferGeometry[] }>()
    for (const part of createSantaSleigh()) {
      if (part.sampleOnly) { part.geometry.dispose(); continue }
      const name = part.color.getHexString()
      const bucket = byColor.get(name) ?? { color: part.color, geometries: [] }
      const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry
      if (geometry !== part.geometry) part.geometry.dispose()
      bucket.geometries.push(geometry)
      byColor.set(name, bucket)
    }
    return [...byColor.entries()].map(([name, bucket]) => {
      const geometry = mergeGeometries(bucket.geometries)!
      for (const source of bucket.geometries) source.dispose()
      const metallic = name === 'f5ce83' || name === 'ffe7ad'
      const material = new THREE.MeshStandardMaterial({
        color: bucket.color, roughness: metallic ? 0.34 : 0.58, metalness: metallic ? 0.28 : 0,
        transparent: true, opacity: 0, depthWrite: false,
      })
      return { name, geometry, material }
    })
  }, [])

  useEffect(() => () => {
    for (const surface of surfaces) { surface.geometry.dispose(); surface.material.dispose() }
  }, [surfaces])

  useFrame((_, delta) => {
    const show = runtime.phase === 'play' && runtime.mode === 'SANTA' && !runtime.morphing
    opacity.current = THREE.MathUtils.damp(opacity.current, show ? 1 : 0, 7, delta)
    if (root.current) root.current.visible = opacity.current > 0.005
    for (const surface of surfaces) {
      surface.material.opacity = opacity.current
      surface.material.depthWrite = opacity.current > 0.95
    }
    if (ambient.current) ambient.current.intensity = opacity.current * 0.8
    if (key.current) key.current.intensity = opacity.current * 2.2
    if (fill.current) fill.current.intensity = opacity.current * 1.1
  })

  return <group ref={root} visible={false} name="santa-sleigh">
    <ambientLight ref={ambient} intensity={0} color="#fff4e6" />
    <directionalLight ref={key} position={[-4, 12, 9]} color="#fff5e8" intensity={0} />
    <directionalLight ref={fill} position={[5, 7, 4]} color="#e9f1ff" intensity={0} />
    {surfaces.map((surface) => <mesh key={surface.name} geometry={surface.geometry} material={surface.material} />)}
  </group>
}
