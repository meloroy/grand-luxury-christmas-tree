import { useRef, type ChangeEvent } from 'react'
import { uploadPhoto } from '../photos/uploadPhoto'
import { pauseMusic, startMusic } from '../session/music'
import {
  assembleShowcase,
  cancelNewRecord,
  confirmNewRecord,
  removePhotoAt,
  reopenRecord,
  requestNewRecord,
  useSession,
} from '../session/store'

export function StartGate() {
  const snap = useSession()
  const single = useRef<HTMLInputElement>(null)
  const multi = useRef<HTMLInputElement>(null)
  const slotTarget = useRef(0)

  if (snap.phase === 'reveal' || snap.phase === 'play') return null

  const busy = snap.pending.some(Boolean)
  const ready = snap.filled === 16 && !busy

  const openSlot = (slot: number) => {
    slotTarget.current = slot
    single.current?.click()
  }

  const onSingle = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) uploadPhoto(file, slotTarget.current)
  }

  const onMulti = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    const empty: number[] = []
    snap.sources.forEach((source, index) => {
      if (!source && !snap.pending[index]) empty.push(index)
    })
    files.slice(0, empty.length).forEach((file, index) => {
      const slot = empty[index]
      if (slot !== undefined) uploadPhoto(file, slot)
    })
  }

  return (
    <div className={`gate ${snap.phase === 'upload' ? 'is-upload' : 'is-center'}`}>
      <input ref={single} className="sr-only" type="file" accept="image/*" onChange={onSingle} />
      <input ref={multi} className="sr-only" type="file" accept="image/*" multiple onChange={onMulti} />
      {snap.phase === 'boot' || snap.phase === 'opening' ? (
        <div className="gate-card gate-card-quiet">
          <p className="eyebrow">Grand Luxury</p>
          <p className="status">{snap.status || '…'}</p>
        </div>
      ) : null}
      {snap.phase === 'choice' ? (
        <div className="gate-card">
          <p className="eyebrow">Grand Luxury</p>
          <h1>Your tree is saved</h1>
          <p className="lede">Reopen it on this device, or begin another set of 16 memories.</p>
          <div className="choice-row">
            <button
              type="button"
              className="hud-button is-on"
              onClick={() => {
                startMusic()
                void reopenRecord()
              }}
            >
              Reopen
            </button>
            <button type="button" className="hud-button" onClick={() => requestNewRecord()}>
              Start a new record
            </button>
          </div>
        </div>
      ) : null}
      {snap.phase === 'upload' ? (
        <div className="gate-card start-scroll">
          <p className="eyebrow">Grand Luxury</p>
          <h1>Sixteen memories</h1>
          <p className="lede">The tree is assembled from this set only.</p>
          <p className="count" aria-live="polite">
            {snap.filled}/16
          </p>
          <div className="slot-actions">
            <button type="button" className="hud-button" onClick={() => multi.current?.click()} disabled={snap.filled === 16 && !busy}>
              Add photos
            </button>
            {snap.hasRecord ? (
              <button
                type="button"
                className="hud-button"
                onClick={() => {
                  startMusic()
                  void reopenRecord()
                }}
              >
                Reopen saved tree
              </button>
            ) : null}
          </div>
          <div className="slots">
            {snap.sources.map((source, index) => (
              <div className="slot" key={index}>
                <button
                  type="button"
                  className="slot-face"
                  onClick={() => openSlot(index)}
                  aria-label={source ? `Replace memory ${index + 1}` : `Add memory ${index + 1}`}
                >
                  {source ? <img src={source} alt="" /> : <span>+</span>}
                  {snap.pending[index] ? <span className="slot-wait">…</span> : null}
                </button>
                {source ? (
                  <button type="button" className="slot-remove" onClick={() => removePhotoAt(index)}>
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="gate-bar">
            <button
              type="button"
              className={`hud-button assemble ${ready ? 'is-on assemble-ready' : ''}`}
              disabled={!ready}
              onClick={() => {
                startMusic()
                assembleShowcase()
              }}
            >
              Assemble the tree
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ConfirmNew() {
  const snap = useSession()
  if (!snap.confirmNew) return null
  return (
    <div className="confirm-layer">
      <div className="gate-card confirm-card" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <p className="eyebrow">Record</p>
        <h2 id="confirm-title">Start a new record?</h2>
        <p className="lede">The saved tree stays on this device until a new set of 16 photos is assembled.</p>
        <div className="choice-row">
          <button type="button" className="hud-button is-on" onClick={() => cancelNewRecord()}>
            Keep saved tree
          </button>
          <button
            type="button"
            className="hud-button"
            onClick={() => {
              pauseMusic()
              void confirmNewRecord()
            }}
          >
            Start new
          </button>
        </div>
      </div>
    </div>
  )
}
