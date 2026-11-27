import { useSyncExternalStore } from 'react'
import { Color } from 'three'

export const PALETTES = [
  { name: '渐变粉色', swatch: '#f5a0c3', primary: [1, 0.28, 0.54], secondary: [1, 0.74, 0.87], star: [1, 0.82, 0.91], gradient: 1 },
  { name: '蓝紫色', swatch: '#9990f2', primary: [0.2, 0.51, 1], secondary: [0.7, 0.35, 1], star: [0.79, 0.82, 1], gradient: 0.2 },
  { name: '白金色', swatch: '#e8d5a0', primary: [0.78, 0.85, 0.92], secondary: [1, 0.8, 0.35], star: [1, 0.92, 0.69], gradient: 0.15 },
  { name: '薄荷绿金', swatch: '#85d9b2', primary: [0.22, 0.92, 0.69], secondary: [1, 0.88, 0.36], star: [0.91, 0.84, 0.2], gradient: 0 },
] as const

const KEY = 'christmas-tree-palette'
let selected = 3
try {
  const value = window.localStorage.getItem(KEY)
  const index = value === null ? 3 : Number(value)
  if (Number.isInteger(index) && index >= 0 && index < PALETTES.length) selected = index
} catch { /* Use the green palette when storage is unavailable. */ }

const color = (rgb: readonly [number, number, number]) => new Color().setRGB(...rgb)
const targets = PALETTES.map((palette) => ({ primary: color(palette.primary), secondary: color(palette.secondary), star: color(palette.star) }))
const current = {
  primary: targets[selected].primary.clone(),
  secondary: targets[selected].secondary.clone(),
  star: targets[selected].star.clone(),
  gradient: PALETTES[selected].gradient as number,
}
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

export function usePalette() {
  return useSyncExternalStore(subscribe, () => selected, () => 3)
}

export function setPalette(index: number) {
  if (!Number.isFinite(index)) return
  const next = Math.max(0, Math.min(PALETTES.length - 1, Math.round(index)))
  if (next === selected) return
  selected = next
  try { window.localStorage.setItem(KEY, String(selected)) } catch { /* Color selection still works without storage. */ }
  for (const listener of listeners) listener()
}

export function stepPalette(dt: number) {
  const ease = 1 - Math.exp(-Math.max(0, Math.min(dt, 0.1)) * 5)
  current.primary.lerp(targets[selected].primary, ease)
  current.secondary.lerp(targets[selected].secondary, ease)
  current.star.lerp(targets[selected].star, ease)
  current.gradient += (PALETTES[selected].gradient - current.gradient) * ease
}

export function getPalette() { return current }
