import { Canvas } from '@react-three/fiber'
import { Component, type ReactNode } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { Controls } from './hud/Controls'
import { Experience } from './scene/Experience'

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
  return (
    <div className="relative h-full w-full bg-[#040a08]">
      <SceneBoundary>
        <Canvas
          camera={{ position: [0, 4, 20], fov: 40, near: 0.1, far: 90 }}
          dpr={[1, 1.6]}
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
