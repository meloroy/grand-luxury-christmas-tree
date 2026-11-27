import { PALETTES, setPalette, usePalette } from '../scene/palette'
import { useSession } from '../session/store'

export function PaletteSlider() {
  const index = usePalette()
  const session = useSession()
  const [open, setOpen] = useState(false)
  const control = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const slider = useRef<HTMLInputElement>(null)
  const visible = session.phase === 'play' && session.mode !== 'FOCUS'

  const close = () => {
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (!visible) setOpen(false)
  }, [visible])

  useEffect(() => {
    if (!open || !visible) return
    slider.current?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !control.current?.contains(event.target)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      close()
    }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('keydown', escape)
    }
  }, [open, visible])

  if (!visible) return null

  return (
    <aside ref={control} className="palette-control" aria-label="圣诞树配色">
      <button ref={trigger} className="palette-trigger" type="button" aria-expanded={open}
        aria-controls="tree-palette-panel" aria-label={`调整配色，当前为${PALETTES[index].name}`}
        title={`配色：${PALETTES[index].name}`} onClick={() => setOpen(!open)}>
        <span className="palette-trigger-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.5-3.3 1.6 1.6 0 0 1 1.2-2.7H18a3 3 0 0 0 3-3c0-5-4-9-9-9Z" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="8" cy="10" r="1.3" fill="#f5a0c3" />
            <circle cx="12" cy="7.5" r="1.3" fill="#9990f2" />
            <circle cx="16" cy="10" r="1.3" fill={PALETTES[index].swatch} />
          </svg>
        </span>
        <span>配色</span>
      </button>
      {open ? <div id="tree-palette-panel" className="palette-panel">
      <div className="palette-heading">
        <label htmlFor="tree-palette">配色</label>
        <button type="button" onClick={close} aria-label="收起配色面板" title="收起">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m10 4-4 4 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="palette-options">
        <input ref={slider} id="tree-palette" type="range" min={0} max={PALETTES.length - 1} step={1} value={index}
          aria-orientation="vertical" aria-valuetext={PALETTES[index].name}
          onChange={(event) => setPalette(Number(event.target.value))} />
        <div className="palette-labels" aria-hidden="true">
          {PALETTES.map((palette, item) => <span key={palette.name} className={item === index ? 'is-selected' : ''}>
            <i style={{ backgroundColor: palette.swatch }} />{palette.name}
          </span>)}
        </div>
      </div>
      <output htmlFor="tree-palette" className="sr-only" aria-live="polite">{PALETTES[index].name}</output>
      </div> : null}
    </aside>
  )
}
import { useEffect, useRef, useState } from 'react'
