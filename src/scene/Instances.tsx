import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import type { InstancedMesh, Material, BufferGeometry } from 'three'
import type { WeightKey } from './constants'
import { paintInstances, writeDualMatrices, type DualBuffers } from './dualTransform'
import { frameMotion } from './motion'

type InstancesProps = {
  geometry: BufferGeometry
  material: Material
  data: DualBuffers
  motion: WeightKey
  weight: number
  colorize?: boolean
}

export function Instances({ geometry, material, data, motion, weight, colorize = false }: InstancesProps) {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    if (colorize) paintInstances(mesh, data.color)
    writeDualMatrices(mesh, data, frameMotion[motion], weight, 0)
  }, [colorize, data, motion, weight])

  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    writeDualMatrices(mesh, data, frameMotion[motion], weight, clock.elapsedTime)
  })

  return <instancedMesh ref={ref} args={[geometry, material, data.count]} frustumCulled={false} />
}
