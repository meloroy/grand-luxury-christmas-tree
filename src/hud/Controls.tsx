import { useEffect, useRef } from 'react'
import { useHandCamera } from '../gestures/useHandCamera'
import { startMusic, toggleMusic } from '../session/music'
import { requestNewRecord, runtime, setMode, useSession } from '../session/store'

function FrameCorner({ transform }: { transform?: string }) {
  return <g transform={transform} stroke="currentColor" strokeWidth="0.85" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 27V17c0-6 5-10 12-10h20" />
    <path d="M8 23C0 23-1 12 5 10c7-3 13 7 7 10-4 2-8-3-4-5 2-1 3 1 2 2" />
    <path d="M15 9C10 4 16-2 22 1c7 3 7 11 1 13-5 1-9-5-4-7 3-2 5 2 2 3" />
    <path d="M25 7c4-6 12-5 17 0M7 24c-4 4-4 7-1 11" strokeWidth="0.55" />
    <path d="M5 10C1 8 1 3 3 1c4 1 6 5 2 9ZM24 5c1-5 5-6 8-5-1 4-4 6-8 5ZM7 25c5 0 7 3 6 6-4 0-6-2-6-6Z" fill="currentColor" stroke="none" />
    <circle cx="35" cy="3" r="0.9" fill="currentColor" stroke="none" />
  </g>
}

function FrameCrest({ transform }: { transform?: string }) {
  return <g transform={transform} stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
    <path d="M65 7c4 0 5 4 10 3l5-3 5 3c5 1 6-3 10-3M76 7c-6 3-9-4-5-5 4-1 5 4 2 4M84 7c6 3 9-4 5-5-4-1-5 4-2 4" />
    <path d="M80 7c-6-2-5-7-2-7 3 1 2 5 2 7 0-3 1-7 3-6 3 1 1 5-3 6Z" fill="currentColor" stroke="none" />
    <path d="m80 10 1.6 2.5L80 15l-1.6-2.5Z" fill="currentColor" stroke="none" />
  </g>
}

function ButtonFrame() {
  return <svg className="button-filigree" viewBox="0 0 160 56" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <path d="M39 7h26m30 0h26M7 27v2m146-2v2M39 49h26m30 0h26" stroke="currentColor" strokeWidth="0.65" />
    <path d="M33 11H62m36 0h29c14 0 22 6 22 17s-8 17-22 17H98m-36 0H33c-14 0-22-6-22-17s8-17 22-17Z" stroke="currentColor" strokeWidth="0.4" opacity="0.45" />
    <FrameCorner />
    <FrameCorner transform="translate(160 0) scale(-1 1)" />
    <FrameCorner transform="translate(0 56) scale(1 -1)" />
    <FrameCorner transform="translate(160 56) scale(-1 -1)" />
    <FrameCrest />
    <FrameCrest transform="translate(0 56) scale(1 -1)" />
  </svg>
}

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
            className={`hud-button ornate-button ${hud.mode === 'FOCUS' ? 'is-on' : ''}`}
            onClick={() => {
              startMusic()
              if (hud.mode === 'FOCUS') setMode(runtime.formed, 'user')
              else setMode('FOCUS', 'user')
            }}
          >
            <ButtonFrame /><span>查看照片</span>
          </button>
          <button
            type="button"
            className={`hud-button ornate-button ${hud.cameraBusy ? 'is-busy' : ''} ${hud.cameraError ? 'is-error' : ''}`}
            onClick={() => {
              startMusic()
              if (hud.cameraOn || hud.cameraBusy) stop()
              else void start()
            }}
          >
            <ButtonFrame /><span>{hud.cameraBusy ? '取消开启' : hud.cameraOn ? '关闭手势' : '开启手势'}</span>
          </button>
            <button
              type="button"
              className="hud-button ornate-button"
              onClick={() => {
                startMusic()
                toggleMusic()
              }}
            >
              <ButtonFrame /><span>切换音乐</span>
            </button>
          <button type="button" className="hud-button ornate-button" onClick={() => requestNewRecord()}>
            <ButtonFrame /><span>新建回忆</span>
          </button>
        </div>
      </div>
    </>
  )
}
