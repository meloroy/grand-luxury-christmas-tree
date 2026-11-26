import { useSyncExternalStore } from 'react'

export type TreeMode = 'chaos' | 'formed'

export type HudSnapshot = {
  mode: TreeMode
  cameraOn: boolean
  cameraBusy: boolean
  cameraError: boolean
}

type Listener = () => void

let hudSnapshot: HudSnapshot = {
  mode: 'formed',
  cameraOn: false,
  cameraBusy: false,
  cameraError: false,
}

export const treeState = {
  mode: 'formed' as TreeMode,
  cameraOn: false,
  cameraBusy: false,
  cameraError: false,
  gestureLock: null as TreeMode | null,
  hand: {
    active: false,
    dx: 0,
    dy: 0,
  },
  listeners: new Set<Listener>(),

  emit() {
    const next: HudSnapshot = {
      mode: this.mode,
      cameraOn: this.cameraOn,
      cameraBusy: this.cameraBusy,
      cameraError: this.cameraError,
    }
    if (
      next.mode === hudSnapshot.mode &&
      next.cameraOn === hudSnapshot.cameraOn &&
      next.cameraBusy === hudSnapshot.cameraBusy &&
      next.cameraError === hudSnapshot.cameraError
    ) {
      return
    }
    hudSnapshot = next
    for (const listener of this.listeners) listener()
  },

  setMode(mode: TreeMode, source: 'user' | 'gesture' = 'user') {
    if (source === 'user') this.gestureLock = mode
    if (this.mode === mode) return
    this.mode = mode
    this.emit()
  },

  setCamera(partial: { on?: boolean; busy?: boolean; error?: boolean }) {
    if (partial.on !== undefined) this.cameraOn = partial.on
    if (partial.busy !== undefined) this.cameraBusy = partial.busy
    if (partial.error !== undefined) this.cameraError = partial.error
    this.emit()
  },
}

function subscribeTree(listener: Listener) {
  treeState.listeners.add(listener)
  return () => {
    treeState.listeners.delete(listener)
  }
}

function getHudSnapshot() {
  return hudSnapshot
}

export function useTreeHud() {
  return useSyncExternalStore(subscribeTree, getHudSnapshot, getHudSnapshot)
}
