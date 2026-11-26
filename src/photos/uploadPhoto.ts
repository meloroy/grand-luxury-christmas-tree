import * as THREE from 'three'
import { addPhotoToScene, failSlot, nextSlotGeneration } from '../session/store'

export function uploadPhoto(file: File, slot: number) {
  const gen = nextSlotGeneration(slot)
  const reader = new FileReader()
  reader.onload = (ev) => {
    const source = ev.target?.result
    if (typeof source !== 'string') {
      failSlot(slot, gen)
      return
    }
    new THREE.TextureLoader().load(
      source,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.userData.slot = slot
        t.userData.gen = gen
        t.userData.source = source
        addPhotoToScene(t)
      },
      undefined,
      () => failSlot(slot, gen),
    )
  }
  reader.onerror = () => failSlot(slot, gen)
  reader.readAsDataURL(file)
}
