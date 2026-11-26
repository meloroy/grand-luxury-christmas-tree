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
            ? 'pointer-events-none fixed z-20 h-16 w-16 rounded-full border border-[#d5dee8]/55 object-cover shadow-[0_0_24px_rgba(206,218,230,0.22)] [transform:scaleX(-1)] top-[max(0.6rem,env(safe-area-inset-top))] right-[max(0.6rem,env(safe-area-inset-right))] landscape:h-14 landscape:w-14 sm:h-24 sm:w-24'
            : 'pointer-events-none fixed top-0 left-0 h-px w-px opacity-0'
        }
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pl-[max(0.85rem,env(safe-area-inset-left))] pr-[max(0.85rem,env(safe-area-inset-right))] pb-[max(0.9rem,env(safe-area-inset-bottom))] landscape:pb-[max(0.45rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex w-full max-w-md gap-3 landscape:max-w-sm">
          <button
            type="button"
            className="hud-button min-h-14 flex-1 basis-0 whitespace-nowrap px-3 text-[0.8rem] tracking-[0.14em] active:border-[#eef3f8]/85 active:bg-[#12211c]/80 landscape:min-h-12 sm:min-h-11 sm:flex-none sm:min-w-32 sm:px-6 sm:text-[0.72rem] sm:tracking-[0.28em]"
            onClick={() => treeState.setMode(hud.mode === 'formed' ? 'chaos' : 'formed', 'user')}
          >
            {hud.mode === 'formed' ? 'Unleash' : 'Form'}
          </button>
          <button
            type="button"
            className={`hud-button min-h-14 flex-1 basis-0 whitespace-nowrap px-3 text-[0.8rem] tracking-[0.14em] active:border-[#eef3f8]/85 active:bg-[#12211c]/80 landscape:min-h-12 sm:min-h-11 sm:flex-none sm:min-w-36 sm:px-6 sm:text-[0.72rem] sm:tracking-[0.28em] ${hud.cameraBusy ? 'camera-busy' : ''} ${hud.cameraError ? 'camera-error' : ''}`}
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
