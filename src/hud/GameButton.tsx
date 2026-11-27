import { useState, type ButtonHTMLAttributes, type Ref } from 'react'

type GameButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>
}

function FrameStars({ bottom = false }: { bottom?: boolean }) {
  return <svg className={`game-button-stars ${bottom ? 'is-bottom' : ''}`} width="28" height="6" viewBox="0 0 28 6" fill="currentColor" aria-hidden="true">
    <path d="m14 0 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
    <path d="m7 1.5.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5ZM21 1.5l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5Z" opacity=".55" />
  </svg>
}

/** Shared starlight frame with a short, theme-tinted response to every click. */
export function GameButton({ children, className = '', onClick, ref, type = 'button', ...props }: GameButtonProps) {
  const [flash, setFlash] = useState(0)
  return <button {...props} ref={ref} type={type} className={`game-button ${className}`}
    onClick={(event) => { setFlash((value) => value + 1); onClick?.(event) }}>
    <span className="game-button-frame" aria-hidden="true"><FrameStars /><FrameStars bottom /></span>
    {flash > 0 ? <span key={flash} className="game-button-feedback" aria-hidden="true" /> : null}
    <span className="game-button-content">{children}</span>
  </button>
}
