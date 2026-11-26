import { TREE } from './tree'

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
  const maxRadius = TREE.radius
  for (let i = 0; i < count; i += 1) {
    const spiral = hash(i + 4) > 0.58
    const tt = spiral ? i / count : hash(i + 5)
    const t = Math.min(0.999, Math.max(0, tt))
    let radius = maxRadius * (1 - t)
    let angle = t * 50 * Math.PI
    if (!spiral) {
      radius *= Math.sqrt(hash(i + 6))
      angle = hash(i + 7) * Math.PI * 2
    } else {
      const tube = (0.08 + 0.42 * (1 - t)) * Math.sqrt(hash(i + 8))
      const a2 = hash(i + 9) * Math.PI * 2
      radius = Math.max(0, radius + Math.cos(a2) * tube * 0.35)
      angle += Math.sin(a2) * 0.18
    }
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = TREE.y0 + t * TREE.height
    const gAng = t * 7.5 * Math.PI * 2
    const garland = Math.hypot(x - Math.cos(gAng) * maxRadius * (1 - t), z - Math.sin(gAng) * maxRadius * (1 - t))
    const spark = hash(i + 12)
    let r: number
    let g: number
    let b: number
    if (garland < 0.42 || spark > 0.955) {
      r = 0.95
      g = 0.72 + spark * 0.2
      b = 0.28
    } else if (spark > 0.9) {
      r = 0.55
      g = 0.95
      b = 0.62
    } else if (spark < 0.03) {
      r = 0.506
      g = 0.847
      b = 0.816
    } else {
      const lift = 0.72 + hash(i + 13) * 0.55
      r = Math.min(1, 0.1 * lift)
      g = Math.min(1, 0.78 * lift)
      b = Math.min(1, 0.32 * lift)
    }
    write(positions, colors, i, x, y + (hash(i + 15) - 0.5) * 0.08, z, r, g, b)
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

function paintLine(ctx: CanvasRenderingContext2D, text: string, y: number, w: number, size: number) {
  const letters = [...text]
  const widths = letters.map((letter) => ctx.measureText(letter).width)
  const gap = size * 0.16
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (letters.length - 1)
  let x = (w - total) / 2
  letters.forEach((letter, index) => {
    ctx.fillText(letter, x + widths[index] / 2, y)
    x += widths[index] + gap
  })
}

function paintText(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#f3d78a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const family = '"Liberation Serif", "Nimbus Roman", "Times New Roman", Times, serif'
  let size = 188
  ctx.font = `700 ${size}px ${family}`
  const widest = () => {
    const letters = [...'CHRISTMAS']
    const widths = letters.map((letter) => ctx.measureText(letter).width)
    return widths.reduce((sum, width) => sum + width, 0) + size * 0.16 * (letters.length - 1)
  }
  while (widest() > w * 0.94 && size > 64) {
    size -= 6
    ctx.font = `700 ${size}px ${family}`
  }
  paintLine(ctx, 'MERRY', h * 0.33, w, size)
  paintLine(ctx, 'CHRISTMAS', h * 0.69, w, size)
}

function paintElk(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  const cx = w / 2
  ctx.strokeStyle = '#f6d27a'
  ctx.lineWidth = 18
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const antler = (sign: number) => {
    ctx.beginPath()
    ctx.moveTo(cx + sign * 18, 176)
    ctx.lineTo(cx + sign * 48, 108)
    ctx.lineTo(cx + sign * 28, 70)
    ctx.moveTo(cx + sign * 46, 112)
    ctx.lineTo(cx + sign * 92, 84)
    ctx.moveTo(cx + sign * 40, 136)
    ctx.lineTo(cx + sign * 96, 132)
    ctx.stroke()
  }
  antler(1)
  antler(-1)
  ctx.fillStyle = '#8a4b22'
  ctx.beginPath()
  ctx.ellipse(cx - 62, 206, 26, 16, -0.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx + 62, 206, 26, 16, 0.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c46a32'
  ctx.beginPath()
  ctx.ellipse(cx, 226, 52, 46, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1a100c'
  ctx.beginPath()
  ctx.arc(cx - 18, 220, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + 18, 220, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f0c36a'
  ctx.beginPath()
  ctx.arc(cx, 246, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#8a451c'
  ctx.fillRect(cx - 32, 262, 64, 54)
  ctx.fillStyle = '#a85a28'
  ctx.beginPath()
  ctx.ellipse(cx, 390, 92, 112, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f4f0e8'
  ctx.beginPath()
  ctx.ellipse(cx, 430, 30, 26, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#6d3816'
  ctx.fillRect(cx - 64, 480, 22, 78)
  ctx.fillRect(cx - 24, 488, 18, 72)
  ctx.fillRect(cx + 8, 488, 18, 72)
  ctx.fillRect(cx + 44, 480, 22, 78)
}

function paintSanta(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  const cx = w * 0.46
  ctx.fillStyle = '#f4f7fb'
  ctx.beginPath()
  ctx.ellipse(cx, 360, 132, 160, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#d0121c'
  ctx.beginPath()
  ctx.moveTo(cx - 116, 230)
  ctx.lineTo(cx + 18, 42)
  ctx.lineTo(cx + 132, 214)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f7f7f7'
  ctx.beginPath()
  ctx.ellipse(cx + 6, 224, 128, 32, -0.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + 118, 78, 32, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f0c2a0'
  ctx.beginPath()
  ctx.ellipse(cx + 4, 268, 58, 50, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1c140f'
  ctx.beginPath()
  ctx.arc(cx - 16, 262, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + 24, 260, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e7a888'
  ctx.beginPath()
  ctx.arc(cx + 4, 284, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(cx - 20, 302, 28, 14, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx + 32, 300, 28, 14, 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c10f18'
  ctx.fillRect(cx - 100, 470, 200, 90)
  ctx.fillStyle = '#f6d27a'
  ctx.beginPath()
  ctx.arc(cx, 500, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, 530, 9, 0, Math.PI * 2)
  ctx.fill()
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
  samplePaint(count, text.positions, text.colors, 1400, 700, 17.4, 8.8, 5.5, 1.8, paintText, true)
  samplePaint(count, elk.positions, elk.colors, 420, 580, 8.4, 12.6, 5.2, 1.5, paintElk)
  samplePaint(count, santa.positions, santa.colors, 460, 620, 9.2, 11.6, 5.15, 1.7, paintSanta)
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
