import { useEffect, useRef } from 'react'
import { nextPhoto, runtime, setMode, useSession } from '../session/store'

export function PhotoControls() {
  const snap = useSession()
  const previous = useRef<HTMLButtonElement>(null)
  const active = snap.phase === 'play' && snap.mode === 'FOCUS'

  useEffect(() => {
    if (!active) return
    previous.current?.focus({ preventScroll: true })
    let press: { id: number; x: number; y: number } | null = null
    const down = (event: PointerEvent) => {
      if (!(event.target instanceof HTMLCanvasElement) || event.button !== 0) return
      if (press) { press = null; return }
      press = { id: event.pointerId, x: event.clientX, y: event.clientY }
    }
    const up = (event: PointerEvent) => {
      const start = press
      press = null
      if (!start || start.id !== event.pointerId) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) nextPhoto(dx < 0 ? 1 : -1)
    }
    const cancel = () => { press = null }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMode(runtime.formed, 'user')
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        nextPhoto(event.key === 'ArrowRight' ? 1 : -1)
      }
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', key)
    }
  }, [active])

  if (!active) return null
  return (
    <nav className="photo-navigation" aria-label="照片浏览">
      <button ref={previous} type="button" aria-label="上一张照片" title="上一张" onClick={() => nextPhoto(-1)}>
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="m12 5-5 5 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button type="button" aria-label="下一张照片" title="下一张" onClick={() => nextPhoto(1)}>
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button type="button" aria-label="返回场景" title="返回场景" onClick={() => setMode(runtime.formed, 'user')}>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
      </button>
    </nav>
  )
}
