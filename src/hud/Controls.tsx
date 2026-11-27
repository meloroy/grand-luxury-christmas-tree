import { useEffect, useRef } from 'react'
import { useHandCamera } from '../gestures/useHandCamera'
import { startMusic, toggleMusic } from '../session/music'
import { requestNewRecord, runtime, setMode, useSession } from '../session/store'

export function Controls() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { start, stop } = useHandCamera(videoRef)
  const hud = useSession()

  useEffect(() => {
    if (hud.phase !== 'play') stop()
  }, [hud.phase, stop])

  if (hud.phase !== 'play') return null

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
      <div className="dock" hidden={hud.mode === 'FOCUS'}>
        <div className="dock-actions">
          <button
            type="button"
            className={`hud-button dock-button ${hud.mode === 'FOCUS' ? 'is-on' : ''}`}
            onClick={() => {
              startMusic()
              if (hud.mode === 'FOCUS') setMode(runtime.formed, 'user')
              else setMode('FOCUS', 'user')
            }}
          >
            <span>查看照片</span>
          </button>
          <button
            type="button"
            className={`hud-button dock-button ${hud.cameraBusy ? 'is-busy' : ''} ${hud.cameraError ? 'is-error' : ''}`}
            onClick={() => {
              startMusic()
              if (hud.cameraOn || hud.cameraBusy) stop()
              else void start()
            }}
          >
            <span>{hud.cameraBusy ? '取消开启' : hud.cameraOn ? '关闭手势' : '开启手势'}</span>
          </button>
            <button
              type="button"
              className="hud-button dock-button"
              onClick={() => {
                startMusic()
                toggleMusic()
              }}
            >
              <span>切换音乐</span>
            </button>
          <button type="button" className="hud-button dock-button" onClick={() => requestNewRecord()}>
            <span>新建回忆</span>
          </button>
        </div>
      </div>
    </>
  )
}
