import { WEIGHT, type WeightKey } from './constants'
import { treeState } from './treeState'

export const frameMotion: Record<WeightKey, number> = {
  light: 1,
  bauble: 1,
  needle: 1,
  snow: 1,
  polaroid: 1,
  gift: 1,
  star: 1,
}

const current: Record<WeightKey, number> = { ...frameMotion }

const keys = Object.keys(WEIGHT) as WeightKey[]

export function stepMotion(delta: number) {
  const target = treeState.mode === 'formed' ? 1 : 0
  const dt = Math.min(delta, 0.05)
  for (const key of keys) {
    const lambda = 1.55 / WEIGHT[key]
    const k = 1 - Math.exp(-lambda * dt)
    current[key] += (target - current[key]) * k
    if (Math.abs(target - current[key]) < 0.0008) current[key] = target
    frameMotion[key] = current[key]
  }
}
