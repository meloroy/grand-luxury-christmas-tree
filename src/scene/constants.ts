export const LOOK_AT = { x: 0, y: 3.55, z: 0 } as const

export const TREE_Y0 = 0.5
export const TREE_HEIGHT = 7.05
export const BASE_RADIUS = 3.22
export const PEDESTAL_TOP = 0.42

export const CHAOS_CENTER = { x: 0, y: 4.05, z: 0 } as const
export const CHAOS_RADIUS = 7.15

export const BLOOM_THRESHOLD = 0.8
export const BLOOM_INTENSITY = 1.2

export const WEIGHT = {
  light: 0.3,
  bauble: 0.58,
  needle: 0.78,
  snow: 0.88,
  polaroid: 1.14,
  gift: 1.55,
  star: 0.66,
} as const

export type WeightKey = keyof typeof WEIGHT
