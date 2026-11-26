import { Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, HueSaturation, ToneMapping, Vignette } from '@react-three/postprocessing'
import { Component, Suspense, type ReactNode } from 'react'
import { ToneMappingMode } from 'postprocessing'
import { BLOOM_INTENSITY, BLOOM_THRESHOLD } from './constants'
import { getQuality } from './quality'
import { CameraRig } from './CameraRig'
import { Foliage } from './Foliage'
import { stepMotion } from './motion'
import { Ornaments } from './Ornaments'
import { Palace } from './Palace'
import { Polaroids } from './Polaroids'
import { Snow } from './Snow'

class QuietBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

function MotionDriver() {
  useFrame((_, delta) => {
    stepMotion(delta)
  }, -100)
  return null
}

export function Experience() {
  const quality = getQuality()
  return (
    <>
      <color attach="background" args={['#040a08']} />
      <MotionDriver />
      <CameraRig />
      <QuietBoundary>
        <Suspense fallback={null}>
          <Environment preset="lobby" background={false} environmentIntensity={0.32} />
        </Suspense>
      </QuietBoundary>
      <Palace />
      <Foliage />
      <Snow />
      <Ornaments />
      <Polaroids />
      <EffectComposer multisampling={quality.multisampling} enableNormalPass={false}>
        <Bloom
          luminanceThreshold={BLOOM_THRESHOLD}
          intensity={BLOOM_INTENSITY}
          luminanceSmoothing={0.18}
          mipmapBlur
          levels={quality.bloomLevels}
          radius={0.48}
        />
        <HueSaturation hue={0} saturation={-0.14} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.18} darkness={0.62} />
      </EffectComposer>
    </>
  )
}
