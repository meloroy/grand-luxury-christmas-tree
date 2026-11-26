import { Canvas } from '@react-three/fiber'
import { Component, type ReactNode } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { Controls } from './hud/Controls'
import { Experience } from './scene/Experience'
import { getQuality } from './scene/quality'

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return <div className="h-full w-full bg-[#040a08]" />
    return this.props.children
  }
}

export default function App() {
  const quality = getQuality()
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#040a08]">
      <SceneBoundary>
        <Canvas
          className="touch-none block h-full w-full"
          camera={{ position: [0, 4, 20], fov: 40, near: 0.1, far: 100 }}
          dpr={[1, quality.dprMax]}
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: 'high-performance',
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 0.96,
          }}
        >
          <Experience />
        </Canvas>
      </SceneBoundary>
      <Controls />
    </div>
  )
}
