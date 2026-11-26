import { useEffect, useRef } from 'react'
import { useHandCamera } from '../gestures/useHandCamera'
import { startMusic, toggleMusic } from '../session/music'
import { requestNewRecord, retrySave, runtime, setMode, toggleChaos, useSession, type Mode } from '../session/store'

const SHAPES: { mode: Mode; label: string }[] = [
  { mode: 'TREE', label: 'Tree' },
  { mode: 'GIFT', label: 'Gift' },
  { mode: 'HAT', label: 'Hat' },
  { mode: 'STOCKING', label: 'Stocking' },
  { mode: 'TEXT', label: 'Text' },
  { mode: 'ELK', label: 'Elk' },
  { mode: 'SANTA', label: 'Santa' },
  { mode: 'GALLERY', label: 'Gallery' },
]

export function Controls() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { start, stop } = useHandCamera(videoRef)
  const hud = useSession()

  useEffect(() => {
    if (hud.phase !== 'play') stop()
  }, [hud.phase, stop])

  if (hud.phase !== 'play') return null

  const chaosLabel = hud.mode === 'SCATTER' ? 'Ignite Festivity' : 'Release Chaos'

  return (
    <>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-hidden="true"
        className={
          hud.cameraOn
            ? 'pointer-events-none fixed z-20 h-16 w-16 rounded-full border border-[#e6c878]/70 object-cover shadow-[0_0_24px_rgba(230,200,120,0.25)] [transform:scaleX(-1)] top-[max(0.6rem,env(safe-area-inset-top))] right-[max(0.6rem,env(safe-area-inset-right))] landscape:h-14 landscape:w-14 sm:h-24 sm:w-24'
            : 'pointer-events-none fixed top-0 left-0 h-px w-px opacity-0'
        }
      />
      <div className="dock">
        <div className="shape-row" role="toolbar" aria-label="Shapes">
          {SHAPES.map((shape) => (
            <button
              key={shape.mode}
              type="button"
              className={`hud-button ${hud.mode === shape.mode ? 'is-on' : ''}`}
              aria-pressed={hud.mode === shape.mode}
              onClick={() => {
                startMusic()
                setMode(shape.mode, 'user')
              }}
            >
              {shape.label}
            </button>
          ))}
        </div>
        <div className="dock-actions">
          <button
            type="button"
            className={`hud-button chaos ${hud.mode === 'SCATTER' ? 'is-on' : ''}`}
            onClick={() => {
              startMusic()
              toggleChaos()
            }}
          >
            {chaosLabel}
          </button>
          <button
            type="button"
            className={`hud-button ${hud.mode === 'FOCUS' ? 'is-on' : ''}`}
            onClick={() => {
              startMusic()
              if (hud.mode === 'FOCUS') setMode(runtime.formed, 'user')
              else setMode('FOCUS', 'user')
            }}
          >
            Focus
          </button>
          <button
            type="button"
            className={`hud-button ${hud.cameraBusy ? 'is-busy' : ''} ${hud.cameraError ? 'is-error' : ''}`}
            onClick={() => {
              startMusic()
              if (hud.cameraOn || hud.cameraBusy) stop()
              else void start()
            }}
          >
            {hud.cameraOn || hud.cameraBusy ? 'Camera Off' : 'Camera'}
          </button>
          <div className="upload-wrapper">
            <button
              type="button"
              onClick={() => {
                startMusic()
                toggleMusic()
              }}
            >
              Change Music
            </button>
          </div>
          <button
            type="button"
            className="hud-button"
            onClick={() => {
              startMusic()
              retrySave()
            }}
          >
            {hud.saveError ? 'Retry Save' : hud.saved ? 'Saved' : 'Save'}
          </button>
          <button type="button" className="hud-button" onClick={() => requestNewRecord()}>
            New Record
          </button>
        </div>
      </div>
    </>
  )
}
