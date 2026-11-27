import { fillElk, fillSanta } from './characters'
import { TREE } from './tree'
import { CHRISTMAS_FONT } from './textFont'

export type ShapeName = 'TREE' | 'GIFT' | 'HAT' | 'STOCKING' | 'TEXT' | 'ELK' | 'SANTA' | 'GALLERY'

export type Cloud = {
  positions: Float32Array
  colors: Float32Array
}

export function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function write(positions: Float32Array, colors: Float32Array, i: number, x: number, y: number, z: number, r: number, g: number, b: number) {
  const o = i * 3
  positions[o] = x
  positions[o + 1] = y
  positions[o + 2] = z
  colors[o] = r
  colors[o + 1] = g
  colors[o + 2] = b
}

function fillTree(count: number, positions: Float32Array, colors: Float32Array) {
  for (let i = 0; i < count; i += 1) {
    const layer = hash(i + 4)
    // Bias the sample count toward the crown, then open the lower coils.
    const t = Math.min(0.998, Math.pow(hash(i + 5), 0.78))
    const looseness = (1 - t) ** 2
    const taper = Math.pow(1 - t, 0.88)
    const spiral = layer < 0.68 + t * 0.3
    const lane = hash(i + 6) > 0.64 ? 1 : 0
    const angle = spiral
      ? t * TREE.turns * Math.PI * 2 + lane * Math.PI + (hash(i + 7) - 0.5) * (0.06 + looseness * 0.55)
      : hash(i + 7) * Math.PI * 2
    const shell = spiral
      ? 1 + (hash(i + 8) - 0.5) * (0.025 + looseness * 0.32)
      : 1 + (hash(i + 8) - 0.35) * (0.08 + looseness * 0.65)
    const radius = TREE.radius * taper * shell
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = TREE.y0 + t * TREE.height + (hash(i + 9) - 0.5) * (0.05 + looseness * 0.38)
    const gold = lane === 1
    const light = (spiral ? 0.55 : 0.18) + hash(i + 11) * (spiral ? 0.4 : 0.2)
    const depth = 0.78 + (z / TREE.radius + 1) * 0.11
    const r = (gold ? light : light * 0.22) * depth
    const g = (gold ? light * 0.88 : light * 0.92) * depth
    const b = (gold ? light * 0.36 : light * 0.69) * depth
    write(positions, colors, i, x, y, z, r, g, b)
  }
}

function fillGift(count: number, positions: Float32Array, colors: Float32Array) {
  const half = 3.35
  const y0 = 4.6
  for (let i = 0; i < count; i += 1) {
    const h = hash(i)
    let x = 0
    let y = 0
    let z = 0
    let r = 1
    let g = 0.78
    let b = 0.32
    if (h < 0.42) {
      const edge = (hash(i + 3) * 12) | 0
      const along = hash(i + 5) * 2 - 1
      const axis = (edge / 4) | 0
      const corner = edge % 4
      const s1 = corner & 1 ? 1 : -1
      const s2 = corner & 2 ? 1 : -1
      const u = along * half
      const j = (hash(i + 9) - 0.5) * 0.14
      if (axis === 0) {
        x = u
        y = s1 * half
        z = s2 * half
      } else if (axis === 1) {
        y = u
        x = s1 * half
        z = s2 * half
      } else {
        z = u
        x = s1 * half
        y = s2 * half
      }
      x += j
      y += (hash(i + 11) - 0.5) * 0.14
      z += (hash(i + 13) - 0.5) * 0.14
    } else if (h < 0.78) {
      const face = (hash(i + 4) * 6) | 0
      const u = (hash(i + 6) * 2 - 1) * half * 0.94
      const v = (hash(i + 8) * 2 - 1) * half * 0.94
      const o = half * (0.9 + hash(i + 10) * 0.1)
      if (face === 0) {
        x = o
        y = u
        z = v
      } else if (face === 1) {
        x = -o
        y = u
        z = v
      } else if (face === 2) {
        y = o
        x = u
        z = v
      } else if (face === 3) {
        y = -o
        x = u
        z = v
      } else if (face === 4) {
        z = o
        x = u
        y = v
      } else {
        z = -o
        x = u
        y = v
      }
      const band = Math.abs(u) < 0.22 || Math.abs(v) < 0.22
      if (band) {
        r = 1
        g = 0.8
        b = 0.34
      } else {
        const lift = 0.65 + hash(i + 2) * 0.7
        r = 0.05 * lift
        g = 0.42 * lift
        b = 0.16 * lift
      }
    } else {
      const loop = hash(i + 21) > 0.5 ? 1 : -1
      if (hash(i + 22) > 0.7) {
        const tail = hash(i + 24)
        x = loop * (0.3 + tail * 1.05)
        y = half + 0.15 - tail * 2.5
        z = (hash(i + 25) - 0.5) * 0.35
      } else {
        const a = hash(i + 23) * Math.PI * 2
        x = loop * (0.9 + Math.cos(a) * 1.05)
        y = half + 0.95 + Math.sin(a) * 1.15
        z = Math.sin(a * 2) * 0.32
      }
      r = 1
      g = 0.84
      b = 0.4
    }
    write(positions, colors, i, x, y + y0, z, r, g, b)
  }
}

function fillHat(count: number, positions: Float32Array, colors: Float32Array) {
  const yBase = 2.15
  const height = 8.1
  const baseR = 3.05
  for (let i = 0; i < count; i += 1) {
    const h = hash(i)
    let x = 0
    let y = 0
    let z = 0
    let r = 0.95
    let g = 0.95
    let b = 0.95
    if (h < 0.64) {
      const t = Math.pow(hash(i + 2), 0.8)
      const flop = t * t * 1.7
      const ang = hash(i + 3) * Math.PI * 2
      const rad = baseR * (1 - t) * Math.sqrt(hash(i + 4))
      x = Math.cos(ang) * rad + flop
      z = Math.sin(ang) * rad * 0.9
      y = t * height
      r = 0.72 + hash(i + 5) * 0.28
      g = 0.03 + hash(i + 6) * 0.05
      b = 0.05
    } else if (h < 0.86) {
      const a = hash(i + 2) * Math.PI * 2
      const tubeA = hash(i + 3) * Math.PI * 2
      const ring = baseR * 1.05
      const tube = 0.5
      x = Math.cos(a) * (ring + Math.cos(tubeA) * tube)
      z = Math.sin(a) * (ring + Math.cos(tubeA) * tube) * 0.9
      y = Math.sin(tubeA) * tube * 0.7
      const white = 0.9 + hash(i + 4) * 0.1
      r = white
      g = white
      b = white
    } else {
      const ang = hash(i + 2) * Math.PI * 2
      const phi = Math.acos(2 * hash(i + 3) - 1)
      const rad = 0.78 * Math.cbrt(hash(i + 4))
      x = 1.7 + Math.sin(phi) * Math.cos(ang) * rad
      y = height + Math.cos(phi) * rad
      z = Math.sin(phi) * Math.sin(ang) * rad
    }
    write(positions, colors, i, x, yBase + y, z, r, g, b)
  }
}

function paintStocking(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  ctx.beginPath()
  ctx.moveTo(190, 36)
  ctx.lineTo(330, 36)
  ctx.lineTo(318, 300)
  ctx.quadraticCurveTo(330, 390, 250, 430)
  ctx.lineTo(70, 468)
  ctx.quadraticCurveTo(28, 440, 58, 392)
  ctx.lineTo(168, 352)
  ctx.quadraticCurveTo(196, 330, 188, 270)
  ctx.lineTo(190, 36)
  ctx.closePath()
  ctx.save()
  ctx.clip()
  const stripes = ['#f4f1ea', '#e10600', '#f0d078', '#1f8f45', '#f7f7f7', '#d0121c', '#e6c15a', '#157a3a', '#f3efe4']
  for (let i = 0; i < stripes.length; i += 1) {
    ctx.fillStyle = stripes[i]
    ctx.fillRect(0, 20 + i * 54, w, 54)
  }
  ctx.restore()
  ctx.fillStyle = '#f7f7f7'
  ctx.fillRect(184, 30, 154, 78)
  ctx.strokeStyle = '#f7f7f7'
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(318, 62, 26, Math.PI * 0.95, Math.PI * 1.85)
  ctx.stroke()
}

function paintText(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#ffe6ae'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const text = 'Merry Christmas'
  let size = 300
  ctx.font = `400 ${size}px "${CHRISTMAS_FONT}"`
  let metrics = ctx.measureText(text)
  while ((metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight > w * 0.88 ||
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent > h * 0.76) && size > 64) {
    size -= 2
    ctx.font = `400 ${size}px "${CHRISTMAS_FONT}"`
    metrics = ctx.measureText(text)
  }
  // Center the ink, including the capital flourishes and descending strokes.
  const x = (w - metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft) / 2
  const y = (h + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2
  ctx.fillText(text, x, y)
}

function samplePaint(
  count: number,
  positions: Float32Array,
  colors: Float32Array,
  width: number,
  height: number,
  worldW: number,
  worldH: number,
  yCenter: number,
  depth: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  glitterGold = false,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  paint(ctx, width, height)
  const data = ctx.getImageData(0, 0, width, height).data
  const candidates: number[] = []
  for (let p = 0; p < width * height; p += 1) {
    if (data[p * 4 + 3] > 36) candidates.push(p)
  }
  const total = Math.max(1, candidates.length)
  for (let i = 0; i < count; i += 1) {
    const pick = candidates[Math.floor((i * total) / count) % total] ?? 0
    const x = pick % width
    const y = (pick / width) | 0
    const o = pick * 4
    const jx = (hash(i + 41) - 0.5) * (worldW / width) * 1.6
    const jy = (hash(i + 43) - 0.5) * (worldH / height) * 1.6
    const wx = (x / width - 0.5) * worldW + jx
    const wy = yCenter + (0.5 - y / height) * worldH + jy
    const wz = (hash(i + 19) - 0.5) * depth
    let r = data[o] / 255
    let g = data[o + 1] / 255
    let b = data[o + 2] / 255
    if (glitterGold) {
      const spark = hash(i + 7)
      if (spark > 0.92) {
        r = 1
        g = 0.9
        b = 0.55
      } else {
        r = 0.82
        g = 0.62 + spark * 0.08
        b = 0.22
      }
    } else {
      r = Math.min(1, r * 1.2)
      g = Math.min(1, g * 1.2)
      b = Math.min(1, b * 1.2)
    }
    write(positions, colors, i, wx, wy, wz, r, g, b)
  }
}

function fillGalaxy(count: number, positions: Float32Array, colors: Float32Array) {
  const arms = 3
  for (let i = 0; i < count; i += 1) {
    const t = hash(i)
    const arm = i % arms
    const radius = 1.5 + t * 13.2
    const angle = t * 5.4 * Math.PI + (arm * Math.PI * 2) / arms + (hash(i + 3) - 0.5) * 0.4
    const spread = (1.15 * (1 - t * 0.4)) * (hash(i + 4) - 0.5)
    const x = Math.cos(angle) * radius + Math.cos(angle + 1.57) * spread
    const z = Math.sin(angle) * radius + Math.sin(angle + 1.57) * spread
    const y = 5.3 + (hash(i + 6) - 0.5) * (1.5 + (1 - t) * 0.8)
    const tint = hash(i + 8)
    let r = 0.08
    let g = 0.42
    let b = 0.2
    if (tint > 0.72) {
      r = 1
      g = 0.82
      b = 0.4
    } else if (tint > 0.58) {
      r = 0.85
      g = 0.9
      b = 1
    } else if (tint < 0.06) {
      r = 0.506
      g = 0.847
      b = 0.816
    } else if (tint > 0.5) {
      r = 0.7
      g = 0.75
      b = 0.82
    }
    write(positions, colors, i, x, y, z, r, g, b)
  }
}

export function buildClouds(count: number): Record<ShapeName, Cloud> {
  const make = (): Cloud => ({
    positions: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
  })
  const tree = make()
  const gift = make()
  const hat = make()
  const stocking = make()
  const text = make()
  const elk = make()
  const santa = make()
  const gallery = make()
  fillTree(count, tree.positions, tree.colors)
  fillGift(count, gift.positions, gift.colors)
  fillHat(count, hat.positions, hat.colors)
  samplePaint(count, stocking.positions, stocking.colors, 480, 560, 8.2, 11.2, 5.1, 1.15, paintStocking)
  samplePaint(count, text.positions, text.colors, 2048, 560, 20.2, 5.52, 5.5, 0.12, paintText, true)
  fillElk(count, elk.positions, elk.colors)
  fillSanta(count, santa.positions, santa.colors)
  fillGalaxy(count, gallery.positions, gallery.colors)
  return {
    TREE: tree,
    GIFT: gift,
    HAT: hat,
    STOCKING: stocking,
    TEXT: text,
    ELK: elk,
    SANTA: santa,
    GALLERY: gallery,
  }
}

export function buildScatter(count: number) {
  const home = new Float32Array(count * 3)
  const axis = new Float32Array(count * 3)
  const speed = new Float32Array(count)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const radius = 8 + hash(i + 1) * 12
    const theta = hash(i + 2) * Math.PI * 2
    const phi = Math.acos(2 * hash(i + 3) - 1)
    home[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
    home[i * 3 + 1] = Math.cos(phi) * radius
    home[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
    const ax = hash(i + 4) * 2 - 1
    const ay = hash(i + 5) * 2 - 1
    const az = hash(i + 6) * 2 - 1
    const len = Math.hypot(ax, ay, az) || 1
    axis[i * 3] = ax / len
    axis[i * 3 + 1] = ay / len
    axis[i * 3 + 2] = az / len
    speed[i] = 0.18 + hash(i + 7) * 0.72
    const tint = hash(i + 8)
    const o = i * 3
    if (tint > 0.8) {
      colors[o] = 1
      colors[o + 1] = 0.8
      colors[o + 2] = 0.38
    } else if (tint > 0.62) {
      colors[o] = 0.12
      colors[o + 1] = 0.55
      colors[o + 2] = 0.28
    } else if (tint < 0.05) {
      colors[o] = 0.506
      colors[o + 1] = 0.847
      colors[o + 2] = 0.816
    } else {
      const w = 0.55 + hash(i + 9) * 0.4
      colors[o] = w
      colors[o + 1] = w
      colors[o + 2] = w
    }
  }
  return { home, axis, speed, colors }
}
