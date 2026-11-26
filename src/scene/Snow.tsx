import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { getTreeData } from './buildTree'
import { frameMotion } from './motion'
import {
  fallingSnowFragment,
  fallingSnowVertex,
  settledSnowFragment,
  settledSnowVertex,
} from './shaders'

export function Snow() {
  const data = useMemo(() => getTreeData(), [])
  const settled = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uProgress: { value: 1 },
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
        },
        vertexShader: settledSnowVertex,
        fragmentShader: settledSnowFragment,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )
  const falling = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uSpan: { value: 18 },
          uFloor: { value: -1.2 },
        },
        vertexShader: fallingSnowVertex,
        fragmentShader: fallingSnowFragment,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )

  useFrame((state) => {
    const dpr = state.gl.getPixelRatio()
    const time = state.clock.elapsedTime
    settled.uniforms.uProgress.value = frameMotion.snow
    settled.uniforms.uTime.value = time
    settled.uniforms.uPixelRatio.value = dpr
    falling.uniforms.uTime.value = time
    falling.uniforms.uPixelRatio.value = dpr
  })

  return (
    <>
      <points geometry={data.settledSnow} material={settled} frustumCulled={false} renderOrder={2} />
      <points geometry={data.fallingSnow} material={falling} frustumCulled={false} renderOrder={4} />
    </>
  )
}
