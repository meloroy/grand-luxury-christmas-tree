import { useRef, type ChangeEvent } from 'react'
import { uploadPhoto } from '../photos/uploadPhoto'
import { MONTHS, PHOTO_COUNT } from '../photos/months'
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
  const picker = useRef<HTMLInputElement>(null)
  const slotTarget = useRef<number | null>(null)

  if (snap.phase === 'reveal' || snap.phase === 'play') return null

  const busy = snap.pending.some(Boolean)
  const ready = snap.filled === PHOTO_COUNT && !busy

  const openSlot = (slot: number | null) => {
    slotTarget.current = slot
    picker.current?.click()
  }

  const onPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    const target = slotTarget.current
    slotTarget.current = null
    const slots: number[] = []
    if (target !== null && !snap.pending[target]) slots.push(target)
    // Start at the chosen month, then wrap to earlier empty months.
    for (let offset = 0; offset < PHOTO_COUNT; offset += 1) {
      const index = ((target ?? 0) + offset) % PHOTO_COUNT
      if (index !== target && !snap.sources[index] && !snap.pending[index]) slots.push(index)
    }
    files.slice(0, slots.length).forEach((file, index) => {
      const slot = slots[index]
      if (slot !== undefined) uploadPhoto(file, slot)
    })
  }

  return (
    <div className={`gate ${snap.phase === 'upload' ? 'is-upload' : 'is-center'}`}>
      <input ref={picker} className="sr-only" type="file" accept="image/*" multiple onChange={onPhotos} />
      {snap.phase === 'boot' || snap.phase === 'opening' ? (
        <div className="gate-card gate-card-quiet">
          <p className="eyebrow">圣诞回忆</p>
          <p className="status">{snap.status || '正在准备星光…'}</p>
        </div>
      ) : null}
      {snap.phase === 'choice' ? (
        <div className="gate-card">
          <p className="eyebrow">圣诞回忆</p>
          <h1>这一年的回忆已保存</h1>
          <p className="lede">打开保存在此设备上的圣诞树，或用十二个月的照片开始新的回忆。</p>
          <div className="choice-row">
            <button
              type="button"
              className="hud-button is-on"
              onClick={() => {
                startMusic()
                void reopenRecord()
              }}
            >
              打开回忆
            </button>
            <button type="button" className="hud-button" onClick={() => requestNewRecord()}>
              新建回忆
            </button>
          </div>
        </div>
      ) : null}
      {snap.phase === 'upload' ? (
        <div className="gate-card start-scroll">
          <p className="eyebrow">圣诞回忆</p>
          <h1>十二个月的回忆</h1>
          <p className="lede">每个月一张照片。点击批量上传或任意月份，均可一次选择多张；从所选月份起依次填入空缺，其他月份已有照片会保留。</p>
          {snap.status ? <p className="lede" role="status">{snap.status}</p> : null}
          <p className="count" aria-live="polite">
            {snap.filled}/{PHOTO_COUNT}
          </p>
          <div className="slot-actions">
            <button type="button" className="hud-button" onClick={() => openSlot(null)} disabled={snap.sources.every((source, index) => source || snap.pending[index])}>
              批量上传照片
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
                打开已存回忆
              </button>
            ) : null}
          </div>
          <div className="slots">
            {snap.sources.map((source, index) => (
              <div className="slot" key={index}>
                <span className="month-label">{MONTHS[index]}</span>
                <button
                  type="button"
                  className="slot-face"
                  disabled={snap.pending[index]}
                  onClick={() => openSlot(index)}
                  aria-label={`${source ? '替换' : '上传'}${MONTHS[index]}的照片`}
                >
                  {source ? <img src={source} alt="" /> : <span>+</span>}
                  {snap.pending[index] ? <span className="slot-wait">…</span> : null}
                </button>
                {source ? (
                  <button type="button" className="slot-remove" aria-label={`移除${MONTHS[index]}的照片`} onClick={() => removePhotoAt(index)}>
                    移除照片
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
              点亮圣诞树
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
        <p className="eyebrow">新的回忆</p>
        <h2 id="confirm-title">开始记录新的一年？</h2>
        <p className="lede">旧回忆会继续保存在此设备上，直到你上传十二个月的照片并点亮新的圣诞树。</p>
        <div className="choice-row">
          <button type="button" className="hud-button is-on" onClick={() => cancelNewRecord()}>
            保留当前回忆
          </button>
          <button
            type="button"
            className="hud-button"
            onClick={() => {
              pauseMusic()
              void confirmNewRecord()
            }}
          >
            开始新回忆
          </button>
        </div>
      </div>
    </div>
  )
}
