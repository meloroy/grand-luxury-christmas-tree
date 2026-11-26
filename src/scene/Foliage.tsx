import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { getTreeData } from './buildTree'
import { foliageFragment, foliageVertex } from './shaders'
import { frameMotion } from './motion'

export function Foliage() {
  const geometry = useMemo(() => getTreeData().foliage, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uProgress: { value: 1 },
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
        },
        vertexShader: foliageVertex,
        fragmentShader: foliageFragment,
        transparent: false,
        depthWrite: true,
      }),
    [],
  )

  useFrame((state) => {
    material.uniforms.uProgress.value = frameMotion.needle
    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio()
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
