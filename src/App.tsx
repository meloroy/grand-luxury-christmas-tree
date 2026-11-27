import { Canvas } from '@react-three/fiber'
import { Component, useEffect, useRef, type ReactNode } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { ConfirmNew, StartGate } from './hud/StartGate'
import { Controls } from './hud/Controls'
import { PhotoControls } from './hud/PhotoControls'
import { PaletteSlider } from './hud/PaletteSlider'
import { Experience } from './scene/Experience'
import { getQuality } from './scene/quality'
import { bootSession, nextPhoto, nextShape, runtime } from './session/store'
import { startMusic } from './session/music'

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
  const scenePress = useRef<{ id: number; x: number; y: number; dragged: boolean; released: boolean } | null>(null)

  useEffect(() => {
    void bootSession()
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <SceneBoundary>
        <Canvas
          tabIndex={0}
          aria-label="圣诞粒子场景，点击空白切换造型，拖动旋转视角"
          onPointerDownCapture={(event) => {
            const previous = scenePress.current
            if (previous && !previous.released) {
              previous.dragged = true
              return
            }
            scenePress.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false, released: false }
          }}
          onPointerMoveCapture={(event) => {
            const press = scenePress.current
            if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) press.dragged = true
          }}
          onPointerUpCapture={() => {
            if (scenePress.current) scenePress.current.released = true
          }}
          onPointerCancelCapture={() => { scenePress.current = null }}
          onPointerMissed={(event) => {
            const press = scenePress.current
            scenePress.current = null
            if (event.type !== 'click' || event.button !== 0 || !press || press.dragged) return
            startMusic()
            if (runtime.mode === 'FOCUS') nextPhoto(event.shiftKey ? -1 : 1)
            else nextShape(event.shiftKey ? -1 : 1)
          }}
          onKeyDown={(event) => {
            if (runtime.mode === 'FOCUS') return
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            nextShape(event.key === 'ArrowLeft' ? -1 : 1)
          }}
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
      <PhotoControls />
      <PaletteSlider />
      <ConfirmNew />
    </div>
  )
}
