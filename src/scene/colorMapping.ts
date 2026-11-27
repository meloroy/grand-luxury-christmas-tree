import type { getPalette } from './palette'

export type Tint = { r: number; g: number; b: number }

export function hasClassicColors(mode: string) {
  return mode === 'HAT' || mode === 'SANTA'
}

/** Recolor surfaces by material role, preserving shadows and ivory details. */
export function mapPalette(r: number, g: number, b: number, height: number, tree: boolean,
  palette: ReturnType<typeof getPalette>, out: Tint) {
  const peak = Math.max(r, g, b)
  const low = Math.min(r, g, b)
  const secondary = r > g
  const shade = tree ? g / (secondary ? 0.88 : 0.92) : peak
  const mix = secondary ? 1 - height * 0.22 * palette.gradient : height * 0.75 * palette.gradient
  out.r = (palette.primary.r + (palette.secondary.r - palette.primary.r) * mix) * shade
  out.g = (palette.primary.g + (palette.secondary.g - palette.primary.g) * mix) * shade
  out.b = (palette.primary.b + (palette.secondary.b - palette.primary.b) * mix) * shade
  if (!tree && peak > 0.3 && peak - low < peak * 0.15) {
    // Keep fur trims and glints pale so faces and lettering retain contrast.
    out.r = peak * (0.78 + palette.secondary.r * 0.22)
    out.g = peak * (0.78 + palette.secondary.g * 0.22)
    out.b = peak * (0.78 + palette.secondary.b * 0.22)
  }
  return out
}
