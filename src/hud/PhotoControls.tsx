import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { nextPhoto, runtime, savePhotoEdits, setMode, setPhotoCaption, useSession } from '../session/store'
import { CAPTION_LIMIT } from '../photos/polaroid'
import { MONTHS } from '../photos/months'
import { uploadPhoto } from '../photos/uploadPhoto'
import { GameButton } from './GameButton'

export function PhotoControls() {
  const snap = useSession()
  const [editing, setEditing] = useState(false)
  const previous = useRef<HTMLButtonElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const note = useRef<HTMLTextAreaElement>(null)
  const picker = useRef<HTMLInputElement>(null)
  const replaceTarget = useRef(0)
  const active = snap.phase === 'play' && snap.mode === 'FOCUS'
  const pending = snap.pending[snap.focusIndex]

  useEffect(() => { setEditing(false) }, [active, snap.focusIndex])
  useEffect(() => {
    runtime.photoEditing = active && editing
    if (active && editing) note.current?.focus({ preventScroll: true })
    return () => { runtime.photoEditing = false }
  }, [active, editing])

  const closeEditor = () => {
    setEditing(false)
    void savePhotoEdits()
    editButton.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (!active) return
    previous.current?.focus({ preventScroll: true })
    let press: { id: number; x: number; y: number } | null = null
    const down = (event: PointerEvent) => {
      if (runtime.photoEditing || !(event.target instanceof HTMLCanvasElement) || event.button !== 0) return
      if (press) { press = null; return }
      press = { id: event.pointerId, x: event.clientX, y: event.clientY }
    }
    const up = (event: PointerEvent) => {
      const start = press
      press = null
      if (!start || start.id !== event.pointerId || runtime.photoEditing) return
      const dx = event.clientX - start.x, dy = event.clientY - start.y
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) nextPhoto(dx < 0 ? 1 : -1)
    }
    const cancel = () => { press = null }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (runtime.photoEditing) closeEditor()
        else setMode(runtime.formed, 'user')
        return
      }
      if (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable="true"]')) return
      if (runtime.photoEditing) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
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
  const advance = (direction: number) => { setEditing(false); void savePhotoEdits(); nextPhoto(direction) }
  const replace = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) uploadPhoto(file, replaceTarget.current)
  }

  return <>
    {editing ? <div className="photo-edit-dismiss-layer" aria-hidden="true" onPointerDown={closeEditor} /> : null}
    <nav className="photo-navigation" aria-label="照片浏览">
      <GameButton ref={previous} type="button" aria-label="上一张照片" title="上一张" onClick={() => advance(-1)}>
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="m12 5-5 5 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </GameButton>
      <GameButton type="button" aria-label="下一张照片" title="下一张" onClick={() => advance(1)}>
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </GameButton>
      <GameButton ref={editButton} type="button" aria-label="编辑这张拍立得" title="编辑照片和说明" aria-expanded={editing}
        aria-controls="photo-editor" onClick={() => editing ? closeEditor() : setEditing(true)}>
        <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true"><path d="m12.5 3.5 4 4M4 12l9-9a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2l-9 9-5 1 1-5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
      </GameButton>
      <GameButton type="button" aria-label="返回场景" title="返回场景" onClick={() => {
        setEditing(false); void savePhotoEdits(); setMode(runtime.formed, 'user')
      }}>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
      </GameButton>
      {editing ? <section id="photo-editor" className="photo-editor" aria-labelledby="photo-editor-title">
        <h2 id="photo-editor-title">{MONTHS[snap.focusIndex]}的拍立得</h2>
        <label className="photo-editor-note">
          <span>照片说明（选填）</span>
          <textarea ref={note} rows={2} maxLength={CAPTION_LIMIT} value={snap.captions[snap.focusIndex]}
            placeholder="留下一句回忆" onChange={(event) => setPhotoCaption(snap.focusIndex, event.target.value)} />
        </label>
        <input ref={picker} className="sr-only" tabIndex={-1} type="file" accept="image/*" aria-label="替换当前照片" onChange={replace} />
        <p className="photo-editor-status" role="status">{pending ? '正在替换照片…' : snap.status || (snap.saveError ? '暂时未能保存，请重试' : '修改会自动保存在此设备')}</p>
        <div className="photo-editor-actions">
          <GameButton className="hud-button" disabled={pending} onClick={() => {
            replaceTarget.current = snap.focusIndex; picker.current?.click()
          }}>替换照片</GameButton>
          {snap.saveError ? <GameButton className="hud-button" onClick={() => { void savePhotoEdits() }}>重试保存</GameButton> : null}
          <GameButton className="hud-button" onClick={closeEditor}>完成</GameButton>
        </div>
      </section> : null}
    </nav>
  </>
}
