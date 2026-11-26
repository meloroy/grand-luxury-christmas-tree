import { useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { requestReveal } from '../scene/reveal'
import { idbGet, idbSet, type DraftRecord, type SavedRecord } from './db'

export type Phase = 'boot' | 'choice' | 'upload' | 'opening' | 'reveal' | 'play'

export type Mode =
  | 'TREE'
  | 'GIFT'
  | 'HAT'
  | 'STOCKING'
  | 'TEXT'
  | 'ELK'
  | 'SANTA'
  | 'GALLERY'
  | 'SCATTER'
  | 'FOCUS'

export type ScenePhoto = {
  type: 'PHOTO'
  index: number
  texture: THREE.Texture
}

export type Snapshot = {
  phase: Phase
  status: string
  filled: number
  sources: (string | null)[]
  pending: boolean[]
  mode: Mode
  cameraOn: boolean
  cameraBusy: boolean
  cameraError: boolean
  saved: boolean
  saveError: boolean
  hasRecord: boolean
  confirmNew: boolean
  track: 1 | 2
}

const SLOT_COUNT = 16

export const runtime = {
  phase: 'boot' as Phase,
  mode: 'TREE' as Mode,
  formed: 'TREE' as Mode,
  powered: false,
  focusIndex: 0,
  gestureLock: null as Mode | null,
  handActive: false,
  handX: 0,
  handY: 0,
  cameraOn: false,
  cameraBusy: false,
  cameraError: false,
  saved: false,
  saveError: false,
  hasRecord: false,
  confirmNew: false,
  track: 1 as 1 | 2,
  status: '',
}

const photoTextures: (THREE.Texture | null)[] = Array.from({ length: SLOT_COUNT }, () => null)
const photoSources: (string | null)[] = Array.from({ length: SLOT_COUNT }, () => null)
const pending: boolean[] = Array.from({ length: SLOT_COUNT }, () => false)
const slotGen = new Uint32Array(SLOT_COUNT)

let restoring = false
let draftTimer = 0
let draftGen = 0

const listeners = new Set<() => void>()

let snapshot: Snapshot = blankSnapshot()

function blankSnapshot(): Snapshot {
  return {
    phase: runtime.phase,
    status: runtime.status,
    filled: 0,
    sources: photoSources.slice(),
    pending: pending.slice(),
    mode: runtime.mode,
    cameraOn: runtime.cameraOn,
    cameraBusy: runtime.cameraBusy,
    cameraError: runtime.cameraError,
    saved: runtime.saved,
    saveError: runtime.saveError,
    hasRecord: runtime.hasRecord,
    confirmNew: runtime.confirmNew,
    track: runtime.track,
  }
}

function countFilled() {
  let n = 0
  for (const source of photoSources) if (source) n += 1
  return n
}

function publish() {
  snapshot = {
    phase: runtime.phase,
    status: runtime.status,
    filled: countFilled(),
    sources: photoSources.slice(),
    pending: pending.slice(),
    mode: runtime.mode,
    cameraOn: runtime.cameraOn,
    cameraBusy: runtime.cameraBusy,
    cameraError: runtime.cameraError,
    saved: runtime.saved,
    saveError: runtime.saveError,
    hasRecord: runtime.hasRecord,
    confirmNew: runtime.confirmNew,
    track: runtime.track,
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSession() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

export function getPhotoTexture(index: number) {
  return photoTextures[index]
}

export function listPhotos(): ScenePhoto[] {
  const photos: ScenePhoto[] = []
  for (let index = 0; index < SLOT_COUNT; index += 1) {
    const texture = photoTextures[index]
    if (texture) photos.push({ type: 'PHOTO', index, texture })
  }
  return photos
}

function firstEmpty() {
  for (let index = 0; index < SLOT_COUNT; index += 1) {
    if (!photoTextures[index] && !pending[index]) return index
  }
  return -1
}

export function nextSlotGeneration(slot: number) {
  slotGen[slot] += 1
  pending[slot] = true
  publish()
  return slotGen[slot]
}

export function failSlot(slot: number, gen: number) {
  if (slotGen[slot] !== gen) return
  pending[slot] = false
  publish()
}

/** Receives a texture loaded from a data URL. Slot and source live on userData. */
export function addPhotoToScene(texture: THREE.Texture) {
  const rawSlot = texture.userData.slot
  const rawGen = texture.userData.gen
  let slot = typeof rawSlot === 'number' ? rawSlot : firstEmpty()
  if (slot < 0 || slot >= SLOT_COUNT) slot = firstEmpty()
  if (slot < 0) {
    texture.dispose()
    return
  }
  if (typeof rawGen === 'number' && rawGen !== slotGen[slot]) {
    texture.dispose()
    return
  }
  const image = texture.image as HTMLImageElement | undefined
  const source =
    typeof texture.userData.source === 'string' && texture.userData.source
      ? texture.userData.source
      : typeof image?.src === 'string'
        ? image.src
        : ''
  const previous = photoTextures[slot]
  if (previous && previous !== texture) previous.dispose()
  photoTextures[slot] = texture
  photoSources[slot] = source || null
  pending[slot] = false
  publish()
  if (!restoring && runtime.phase === 'upload') scheduleDraft()
}

export function removePhotoAt(slot: number) {
  slotGen[slot] += 1
  photoTextures[slot]?.dispose()
  photoTextures[slot] = null
  photoSources[slot] = null
  pending[slot] = false
  publish()
  if (runtime.phase === 'upload') scheduleDraft()
}

function clearPhotos() {
  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    slotGen[slot] += 1
    photoTextures[slot]?.dispose()
    photoTextures[slot] = null
    photoSources[slot] = null
    pending[slot] = false
  }
}

function scheduleDraft() {
  if (restoring || runtime.phase !== 'upload') return
  const gen = ++draftGen
  window.clearTimeout(draftTimer)
  draftTimer = window.setTimeout(() => {
    if (gen !== draftGen || runtime.phase !== 'upload') return
    const draft: DraftRecord = {
      active: true,
      photos: photoSources.slice(),
      updatedAt: Date.now(),
    }
    void idbSet('draft', draft).catch(() => {
      runtime.saveError = true
      publish()
    })
  }, 280)
}

function isRecord(value: SavedRecord | null): value is SavedRecord {
  return Boolean(value?.generated && Array.isArray(value.photos) && value.photos.length === SLOT_COUNT)
}

async function restore(sources: (string | null)[]) {
  restoring = true
  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    const source = sources[slot]
    if (!source) continue
    const gen = nextSlotGeneration(slot)
    await new Promise<void>((resolve) => {
      new THREE.TextureLoader().load(
        source,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace
          texture.userData.slot = slot
          texture.userData.gen = gen
          texture.userData.source = source
          addPhotoToScene(texture)
          resolve()
        },
        undefined,
        () => {
          failSlot(slot, gen)
          resolve()
        },
      )
    })
  }
  restoring = false
}

function beginShowcase(quick: boolean) {
  runtime.mode = 'TREE'
  runtime.formed = 'TREE'
  runtime.powered = false
  runtime.focusIndex = 0
  runtime.gestureLock = null
  runtime.confirmNew = false
  requestReveal(quick ? 1.8 : 3.4)
  runtime.phase = 'reveal'
  runtime.status = ''
  publish()
}

async function persistRecord(photos: string[]) {
  const record: SavedRecord = { generated: true, photos, savedAt: Date.now() }
  await idbSet('record', record)
  const draft: DraftRecord = {
    active: false,
    photos: Array.from({ length: SLOT_COUNT }, () => null),
    updatedAt: Date.now(),
  }
  await idbSet('draft', draft)
  runtime.saved = true
  runtime.saveError = false
  runtime.hasRecord = true
  publish()
}

export function assembleShowcase() {
  if (countFilled() !== SLOT_COUNT || pending.some(Boolean)) return
  const photos = photoSources.map((source) => source ?? '')
  draftGen += 1
  window.clearTimeout(draftTimer)
  beginShowcase(false)
  void persistRecord(photos).catch(() => {
    runtime.saveError = true
    runtime.saved = false
    publish()
  })
}

export async function reopenRecord() {
  runtime.phase = 'opening'
  runtime.status = 'Opening your tree'
  publish()
  try {
    const record = await idbGet<SavedRecord>('record')
    if (!isRecord(record)) {
      runtime.phase = 'upload'
      runtime.status = ''
      publish()
      return
    }
    clearPhotos()
    await restore(record.photos)
    if (countFilled() !== SLOT_COUNT) {
      runtime.phase = 'upload'
      runtime.status = ''
      runtime.hasRecord = true
      publish()
      return
    }
    const draft: DraftRecord = {
      active: false,
      photos: Array.from({ length: SLOT_COUNT }, () => null),
      updatedAt: Date.now(),
    }
    await idbSet('draft', draft).catch(() => undefined)
    runtime.hasRecord = true
    runtime.saved = true
    beginShowcase(true)
  } catch {
    runtime.phase = 'upload'
    runtime.status = ''
    runtime.saveError = true
    publish()
  }
}

export function retrySave() {
  if (countFilled() !== SLOT_COUNT) return
  const photos = photoSources.map((source) => source ?? '')
  void persistRecord(photos).catch(() => {
    runtime.saveError = true
    runtime.saved = false
    publish()
  })
}

export function requestNewRecord() {
  runtime.confirmNew = true
  publish()
}

export function cancelNewRecord() {
  runtime.confirmNew = false
  publish()
}

export async function confirmNewRecord() {
  clearPhotos()
  runtime.mode = 'TREE'
  runtime.formed = 'TREE'
  runtime.powered = false
  runtime.confirmNew = false
  runtime.saved = false
  runtime.phase = 'upload'
  runtime.status = ''
  publish()
  const draft: DraftRecord = {
    active: true,
    photos: Array.from({ length: SLOT_COUNT }, () => null),
    updatedAt: Date.now(),
  }
  await idbSet('draft', draft).catch(() => {
    runtime.saveError = true
    publish()
  })
}

export function setMode(mode: Mode, source: 'user' | 'gesture' = 'user') {
  if (runtime.phase !== 'play') return
  if (source === 'user') runtime.gestureLock = mode
  if (runtime.mode === mode) return
  if (mode === 'FOCUS') {
    const photos = listPhotos().filter((item) => item.type === 'PHOTO')
    const pick = photos[Math.floor(Math.random() * photos.length)]
    runtime.focusIndex = pick?.index ?? 0
  }
  if (mode !== 'SCATTER' && mode !== 'FOCUS') runtime.formed = mode
  runtime.mode = mode
  publish()
}

export function toggleChaos() {
  if (runtime.phase !== 'play') return
  if (runtime.mode === 'SCATTER') setMode(runtime.formed, 'user')
  else setMode('SCATTER', 'user')
}

export function togglePower() {
  if (runtime.phase !== 'play') return
  runtime.powered = !runtime.powered
}

export function finishReveal() {
  if (runtime.phase !== 'reveal') return
  runtime.phase = 'play'
  runtime.powered = true
  publish()
}

export function setCamera(partial: { on?: boolean; busy?: boolean; error?: boolean }) {
  if (partial.on !== undefined) runtime.cameraOn = partial.on
  if (partial.busy !== undefined) runtime.cameraBusy = partial.busy
  if (partial.error !== undefined) runtime.cameraError = partial.error
  publish()
}

export function setTrack(track: 1 | 2) {
  runtime.track = track
  publish()
}

let booted: Promise<void> | null = null

async function bootOnce() {
  try {
    const [record, draft] = await Promise.all([
      idbGet<SavedRecord>('record'),
      idbGet<DraftRecord>('draft'),
    ])
    runtime.hasRecord = isRecord(record)
    if (draft?.active && Array.isArray(draft.photos)) {
      runtime.phase = 'opening'
      runtime.status = 'Restoring photos'
      publish()
      await restore(draft.photos)
      runtime.phase = 'upload'
      runtime.status = ''
      publish()
      return
    }
    runtime.phase = runtime.hasRecord ? 'choice' : 'upload'
    runtime.status = ''
    publish()
  } catch {
    runtime.phase = 'upload'
    runtime.status = ''
    runtime.saveError = true
    publish()
  }
}

export function bootSession() {
  if (!booted) booted = bootOnce()
  return booted
}
