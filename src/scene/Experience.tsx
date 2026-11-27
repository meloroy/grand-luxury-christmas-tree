import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useSession } from '../session/store'
import { CameraRig } from './CameraRig'
import { Lamp } from './Lamp'
import { getQuality } from './quality'
import { Showcase } from './Showcase'
import { SnowFall } from './Snow'
import { Starfield } from './Starfield'
import { PointerTrail } from './PointerTrail'

export function Experience() {
  const phase = useSession().phase
  const quality = getQuality()
  const assembled = phase === 'reveal' || phase === 'play'

  return (
    <>
      <color attach="background" args={['#000000']} />
      <Starfield />
      <SnowFall count={assembled ? quality.falling : Math.min(360, quality.falling)} />
      <CameraRig />
      {assembled ? (
        <>
          <Showcase />
          <Lamp />
          <PointerTrail />
          <EffectComposer multisampling={quality.multisampling} enableNormalPass={false}>
            <Bloom
              luminanceThreshold={quality.bloomThreshold}
              intensity={quality.bloomIntensity}
              luminanceSmoothing={0.22}
              mipmapBlur
              levels={quality.bloomLevels}
              radius={0.45}
            />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette offset={0.2} darkness={0.55} />
          </EffectComposer>
        </>
      ) : null}
    </>
  )
}
