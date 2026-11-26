import { useRef } from 'react'
import { useHandCamera } from '../gestures/useHandCamera'
import { treeState, useTreeHud } from '../scene/treeState'

export function Controls() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { start, stop } = useHandCamera(videoRef)
  const hud = useTreeHud()

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
            ? 'pointer-events-none fixed top-5 right-5 z-20 h-24 w-24 rounded-full border border-[#d5dee8]/55 object-cover shadow-[0_0_28px_rgba(206,218,230,0.22)] [transform:scaleX(-1)]'
            : 'pointer-events-none fixed top-0 left-0 h-px w-px opacity-0'
        }
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex gap-3">
          <button
            type="button"
            className="hud-button"
            onClick={() => treeState.setMode(hud.mode === 'formed' ? 'chaos' : 'formed', 'user')}
          >
            {hud.mode === 'formed' ? 'Unleash' : 'Form'}
          </button>
          <button
            type="button"
            className={`hud-button ${hud.cameraBusy ? 'camera-busy' : ''} ${hud.cameraError ? 'camera-error' : ''}`}
            disabled={hud.cameraBusy}
            onClick={() => {
              if (hud.cameraOn) stop()
              else void start()
            }}
          >
            {hud.cameraOn ? 'Camera Off' : 'Camera'}
          </button>
        </div>
      </div>
    </>
  )
}
