import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { startMusic } from '../session/music'
import { runtime } from '../session/store'
import { getQuality } from './quality'
import { Ornaments } from './Ornaments'
import { ParticleField } from './ParticleField'
import { PhotoWall } from './PhotoWall'
import { Ribbons } from './Ribbons'
import { getPower, mountSim, stepSim } from './sim'
import { SnowGround } from './Snow'
import { Star } from './Star'
import { getPalette } from './palette'


export function Showcase() {
  const group = useRef<THREE.Group>(null)
  const fill = useRef<THREE.PointLight>(null)
  const accent = useRef<THREE.PointLight>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const gl = useThree((state) => state.gl)
  const quality = getQuality()

  useLayoutEffect(() => {
    mountSim(quality)
  }, [quality])

  useEffect(() => {
    const element = gl.domElement
    const down = () => startMusic()
    element.addEventListener('pointerdown', down)
    return () => element.removeEventListener('pointerdown', down)
  }, [gl])

  useFrame((state, dt) => {
    const root = group.current
    if (!root) return
    stepSim(dt)
    const playing = runtime.phase === 'play'
    const focus = runtime.mode === 'FOCUS'
    const yaw = playing && runtime.handActive && !focus ? runtime.handX * 1.35 : 0
    const pitch = playing && runtime.handActive && !focus ? runtime.handY * 0.55 : 0
    root.rotation.y = THREE.MathUtils.damp(root.rotation.y, yaw, 3.1, dt)
    root.rotation.x = THREE.MathUtils.damp(root.rotation.x, pitch, 3.1, dt)
    const glow = getPower()
    if (accent.current) accent.current.color.copy(getPalette().primary)
    if (fill.current) fill.current.intensity = 0.6 + glow * 7
    if (accent.current) accent.current.intensity = glow * 3.2 * (0.65 + 0.35 * Math.sin(state.clock.elapsedTime * 1.6))
    if (ambient.current) ambient.current.intensity = 0.05 + glow * 0.12
  }, -1)

  return (
    <>
      <ambientLight ref={ambient} intensity={0.05} />
      <pointLight ref={fill} position={[0, 7, 6]} color="#fff0d0" distance={48} decay={2} intensity={0.6} />
      <pointLight ref={accent} position={[-5, 4, -2]} color="#81D8D0" distance={32} decay={2} intensity={0} />
      <group ref={group} name="mainGroup">
        <SnowGround />
        <ParticleField />
        <Ribbons />
        <PhotoWall />
        <Ornaments />
        <Star />
      </group>
    </>
  )
}
