import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { PALETTES, setPalette, usePalette } from '../scene/palette'
import { useSession } from '../session/store'
import { GameButton } from './GameButton'

export function PaletteSlider() {
  const index = usePalette()
  const session = useSession()
  const [open, setOpen] = useState(false)
  const control = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const slider = useRef<HTMLInputElement>(null)
  const options = useRef<(HTMLButtonElement | null)[]>([])
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
    options.current[index]?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !control.current?.contains(event.target)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      close()
    }
    const focusOutside = (event: FocusEvent) => {
      if (event.target instanceof Node && !control.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', escape)
    document.addEventListener('focusin', focusOutside)
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('keydown', escape)
      document.removeEventListener('focusin', focusOutside)
    }
  }, [open, visible])

  if (!visible) return null

  const selectWithKeys = (event: ReactKeyboardEvent<HTMLElement>, radio = true) => {
    let next = index
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = radio ? (index + 1) % PALETTES.length : Math.min(PALETTES.length - 1, index + 1)
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = radio ? (index - 1 + PALETTES.length) % PALETTES.length : Math.max(0, index - 1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = PALETTES.length - 1
    else return
    event.preventDefault()
    setPalette(next)
    if (radio) options.current[next]?.focus({ preventScroll: true })
  }

  return (
    <>
    {open ? <div className="palette-dismiss-layer" aria-hidden="true" onPointerDown={() => setOpen(false)} /> : null}
    <aside ref={control} className="palette-control" aria-label="圣诞树配色">
      <GameButton ref={trigger} className="palette-trigger" type="button" aria-expanded={open}
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
      </GameButton>
      {open ? <div id="tree-palette-panel" className="palette-panel">
      <div className="palette-heading">
        <label id="tree-palette-label" htmlFor="tree-palette">配色</label>
        <GameButton type="button" onClick={close} aria-label="收起配色面板" title="收起">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </GameButton>
      </div>
      <div className="palette-options">
        <input ref={slider} id="tree-palette" type="range" min={0} max={PALETTES.length - 1} step={1} value={index}
          aria-orientation="vertical" aria-valuetext={PALETTES[index].name}
          aria-label="拖动切换配色"
          onKeyDown={(event) => selectWithKeys(event, false)}
          onChange={(event) => setPalette(Number(event.target.value))} />
        <div className="palette-labels" role="radiogroup" aria-labelledby="tree-palette-label" onKeyDown={(event) => selectWithKeys(event)}>
          {PALETTES.map((palette, item) => <GameButton key={palette.name} className="palette-choice" role="radio"
            ref={(node) => { options.current[item] = node }}
            aria-checked={item === index} tabIndex={item === index ? 0 : -1}
            onClick={() => setPalette(item)}>
            <i style={{ backgroundColor: palette.swatch }} aria-hidden="true" />
            <span>{palette.name}</span>
            <svg className="palette-check" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </GameButton>)}
        </div>
      </div>
      <output htmlFor="tree-palette" className="sr-only" aria-live="polite">{PALETTES[index].name}</output>
      </div> : null}
    </aside>
    </>
  )
}
