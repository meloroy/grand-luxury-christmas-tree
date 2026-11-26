import { Canvas } from '@react-three/fiber'
import { Component, useEffect, type ReactNode } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { ConfirmNew, StartGate } from './hud/StartGate'
import { Controls } from './hud/Controls'
import { Experience } from './scene/Experience'
import { getQuality } from './scene/quality'
import { bootSession } from './session/store'

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return <div className="h-full w-full bg-black" />
    return this.props.children
  }
}

export default function App() {
  const quality = getQuality()

  useEffect(() => {
    void bootSession()
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <SceneBoundary>
        <Canvas
          className="block h-full w-full touch-none"
          camera={{ position: [0, 9.1, 33.8], fov: 34, near: 0.1, far: 280 }}
          dpr={[1, quality.dprMax]}
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: 'high-performance',
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.02,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#000000')
          }}
        >
          <Experience />
        </Canvas>
      </SceneBoundary>
      <StartGate />
      <Controls />
      <ConfirmNew />
    </div>
  )
}
