import * as THREE from 'three'
import { POLAROID_GRID } from '../scene/buildTree'
import { mulberry32, range, type Rng } from '../scene/rng'

function clampByte(value: number) {
  return Math.max(0, Math.min(255, value))
}

function vignette(ctx: CanvasRenderingContext2D, size: number) {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.72)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(2,8,10,0.55)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
}

function pines(ctx: CanvasRenderingContext2D, size: number, rng: Rng) {
  const sky = ctx.createLinearGradient(0, 0, 0, size)
  sky.addColorStop(0, '#07141c')
  sky.addColorStop(0.55, '#12343a')
  sky.addColorStop(1, '#d5e0e8')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, size, size)
  const moonX = range(rng, size * 0.62, size * 0.82)
  ctx.fillStyle = 'rgba(236,242,246,0.95)'
  ctx.beginPath()
  ctx.arc(moonX, size * 0.28, size * 0.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#07110e'
  for (let i = 0; i < 7; i++) {
    const x = (i / 6) * size * 1.1 - size * 0.08
    const h = range(rng, size * 0.28, size * 0.55)
    ctx.beginPath()
    ctx.moveTo(x, size * 0.98)
    ctx.lineTo(x + size * 0.12, size * 0.98 - h)
    ctx.lineTo(x + size * 0.24, size * 0.98)
    ctx.fill()
  }
  vignette(ctx, size)
}

function bokeh(ctx: CanvasRenderingContext2D, size: number, rng: Rng) {
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#04140f')
  gradient.addColorStop(1, '#0c2a24')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 28; i++) {
    const radius = range(rng, size * 0.02, size * 0.11)
    ctx.fillStyle = `rgba(214, 226, 234, ${range(rng, 0.08, 0.55)})`
    ctx.beginPath()
    ctx.arc(rng() * size, rng() * size, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  vignette(ctx, size)
}

function frost(ctx: CanvasRenderingContext2D, size: number, rng: Rng) {
  ctx.fillStyle = '#d5dee6'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = 'rgba(90, 112, 124, 0.45)'
  ctx.lineWidth = 1.2
  for (let i = 0; i < 18; i++) {
    const x = rng() * size
    const y = rng() * size
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let arm = 0; arm < 6; arm++) {
      const angle = (arm / 6) * Math.PI * 2
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(angle) * range(rng, 18, 46), y + Math.sin(angle) * range(rng, 18, 46))
    }
    ctx.stroke()
  }
  vignette(ctx, size)
}

function lake(ctx: CanvasRenderingContext2D, size: number, rng: Rng) {
  const sky = ctx.createLinearGradient(0, 0, 0, size)
  sky.addColorStop(0, '#0c1c28')
  sky.addColorStop(0.48, '#8ea4b4')
  sky.addColorStop(0.5, '#6e868f')
  sky.addColorStop(1, '#dfe7ee')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = 'rgba(12, 28, 32, 0.85)'
  ctx.beginPath()
  ctx.moveTo(0, size * 0.5)
  for (let x = 0; x <= size; x += 16) {
    ctx.lineTo(x, size * 0.46 - Math.sin(x * 0.02 + rng()) * 10 - rng() * 18)
  }
  ctx.lineTo(size, size * 0.5)
  ctx.fill()
  vignette(ctx, size)
}

function forest(ctx: CanvasRenderingContext2D, size: number, rng: Rng) {
  const fog = ctx.createLinearGradient(0, 0, 0, size)
  fog.addColorStop(0, '#c5d2da')
  fog.addColorStop(0.45, '#6d8c86')
  fog.addColorStop(1, '#0c241c')
  ctx.fillStyle = fog
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 14; i++) {
    const x = rng() * size
    const base = range(rng, size * 0.55, size * 0.95)
    const height = range(rng, size * 0.2, size * 0.5)
    ctx.fillStyle = `rgba(6, 24, 18, ${range(rng, 0.35, 0.9)})`
    ctx.beginPath()
    ctx.moveTo(x, base)
    ctx.lineTo(x + 18, base - height)
    ctx.lineTo(x + 36, base)
    ctx.fill()
  }
  vignette(ctx, size)
}

function deco(ctx: CanvasRenderingContext2D, size: number, rng: Rng) {
  ctx.fillStyle = '#10181c'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = `rgba(214, 224, 232, ${range(rng, 0.35, 0.8)})`
  ctx.lineWidth = range(rng, 1.5, 3)
  for (let i = 0; i < 8; i++) {
    ctx.beginPath()
    ctx.arc(size / 2, size * 0.62, size * (0.12 + i * 0.08), Math.PI, 0)
    ctx.stroke()
  }
  ctx.fillStyle = '#d5dee8'
  ctx.fillRect(size * 0.46, size * 0.18, size * 0.08, size * 0.22)
  vignette(ctx, size)
}

function streaks(ctx: CanvasRenderingContext2D, size: number, rng: Rng) {
  ctx.fillStyle = '#070d10'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = 'rgba(226, 234, 240, 0.55)'
  for (let i = 0; i < 40; i++) {
    const x = rng() * size
    const y = rng() * size
    ctx.lineWidth = range(rng, 0.6, 1.8)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + range(rng, -8, 8), y + range(rng, 24, 70))
    ctx.stroke()
  }
  vignette(ctx, size)
}

function stillLife(ctx: CanvasRenderingContext2D, size: number, rng: Rng) {
  const bg = ctx.createLinearGradient(0, 0, 0, size)
  bg.addColorStop(0, '#1c2a30')
  bg.addColorStop(1, '#8d9aa4')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)
  const emeraldX = range(rng, size * 0.32, size * 0.44)
  ctx.fillStyle = '#0e3b30'
  ctx.beginPath()
  ctx.arc(emeraldX, size * 0.58, size * 0.16, 0, Math.PI * 2)
  ctx.fill()
  const silverX = range(rng, size * 0.56, size * 0.7)
  ctx.fillStyle = '#d5dee8'
  ctx.beginPath()
  ctx.arc(silverX, size * 0.5, size * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(232, 238, 244, 0.8)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(silverX, size * 0.5, size * 0.18, 0, Math.PI * 2)
  ctx.stroke()
  vignette(ctx, size)
}

const PAINTERS = [pines, bokeh, frost, lake, forest, deco, streaks, stillLife]

export function createPolaroidAtlas() {
  const { columns, rows, cell } = POLAROID_GRID
  const width = columns * cell
  const height = rows * cell
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create polaroid atlas')
  const count = columns * rows
  for (let i = 0; i < count; i++) {
    const col = i % columns
    const row = Math.floor(i / columns)
    const painter = PAINTERS[i % PAINTERS.length]
    const tile = document.createElement('canvas')
    tile.width = cell
    tile.height = cell
    const tileCtx = tile.getContext('2d')
    if (!tileCtx) continue
    painter(tileCtx, cell, mulberry32(800 + i * 17))
    ctx.drawImage(tile, col * cell, row * cell)
  }
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  const grain = mulberry32(99)
  for (let i = 0; i < data.length; i += 16) {
    const n = (grain() - 0.5) * 18
    data[i] = clampByte(data[i] + n)
    data[i + 1] = clampByte(data[i + 1] + n)
    data[i + 2] = clampByte(data[i + 2] + n)
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}
