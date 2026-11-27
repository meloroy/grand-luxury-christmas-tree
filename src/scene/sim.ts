import { PHOTO_COUNT } from '../photos/months'
import { FOCUS_PHOTO_SCALE } from '../photos/polaroid'
import { MORPH_BURST, MORPH_DURATION, scatterAmount } from './morph'
import { getPalette, stepPalette } from './palette'
import { hasClassicColors, mapPalette } from './colorMapping'
import * as THREE from 'three'
import type { QualityProfile } from './quality'
import { revealCtrl } from './reveal'
import { buildClouds, buildScatter, hash, type ShapeName } from './shapes'
import { SCATTER_CENTER_Y, TREE } from './tree'
import { finishMorph, finishReveal, runtime, type Mode } from '../session/store'

export type Pose = {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  s: number
}

let particleCount = 0
let ribbonCount = 0
let ornamentCount = 0
let particleSize = 0.05

let pos = new Float32Array(0)
let drift = new Float32Array(0)
let col = new Float32Array(0)
let rot = new Float32Array(0)
let phase = new Float32Array(0)
let accent = new Uint8Array(0)
let size = new Float32Array(0)
let home = new Float32Array(0)
let axis = new Float32Array(0)
let spin = new Float32Array(0)
let scatterCol = new Float32Array(0)
let clouds: ReturnType<typeof buildClouds> | null = null

let rPos = new Float32Array(0)
let rDrift = new Float32Array(0)
let rHome = new Float32Array(0)
let rAxis = new Float32Array(0)
let rSpin = new Float32Array(0)
let rGarland = new Float32Array(0)
let rTangent = new Float32Array(0)
let rColor = new Float32Array(0)
let rStretch = 0.2

const photoNow: Pose[] = Array.from({ length: PHOTO_COUNT }, () => ({ x: 0, y: 12, z: 8, rx: 0, ry: 0, rz: 0, s: 0.2 }))
const ornamentNow: Pose[] = []
const ornamentAnchor: Pose[] = []

let power = 0
let simTime = 0
let seenMorph = 0
let morphElapsed = 0
let morphFrom = new Float32Array(0)
let ribbonFrom = new Float32Array(0)
const surfaceTint = { r: 0, g: 0, b: 0 }
const burstTint = { r: 0, g: 0, b: 0 }


export function getPower() {
  return power
}

export function getReveal() {
  return revealCtrl.t
}

export function getPhotoPose(index: number) {
  return photoNow[index]
}

export function getOrnamentPose(index: number) {
  return ornamentNow[index]
}

function shapeOf(mode: Mode): ShapeName {
  if (mode === 'SCATTER' || mode === 'FOCUS') return 'TREE'
  return mode
}

function resetMotion() {
  pos.set(home)
  for (let i = 0; i < particleCount; i += 1) pos[i * 3 + 1] += SCATTER_CENTER_Y
  col.set(scatterCol)
  rPos.set(rHome)
  for (let i = 0; i < ribbonCount; i += 1) rPos[i * 3 + 1] += SCATTER_CENTER_Y
  rStretch = 0.08
  for (let i = 0; i < PHOTO_COUNT; i += 1) {
    const ang = (i / PHOTO_COUNT) * Math.PI * 2
    photoNow[i].x = Math.cos(ang) * 10
    photoNow[i].y = 14
    photoNow[i].z = Math.sin(ang) * 10
    photoNow[i].s = 0.15
    photoNow[i].ry = ang
  }
  for (let i = 0; i < ornamentCount; i += 1) {
    ornamentNow[i].x = ornamentAnchor[i].x
    ornamentNow[i].y = ornamentAnchor[i].y + 8
    ornamentNow[i].z = ornamentAnchor[i].z
    ornamentNow[i].s = 0.2
  }
  revealCtrl.t = 0
  revealCtrl.startedAt = 0
  power = 0
}

export function mountSim(quality: QualityProfile) {
  if (particleCount !== quality.particles || !clouds) {
    particleCount = quality.particles
    ribbonCount = quality.ribbons
    particleSize = quality.particleSize
    clouds = buildClouds(particleCount)
    const scatter = buildScatter(particleCount)
    home = scatter.home
    axis = scatter.axis
    spin = scatter.speed
    scatterCol = scatter.colors
    pos = new Float32Array(particleCount * 3)
    drift = buildDrift(particleCount, 1)
    col = new Float32Array(particleCount * 3)
    rot = new Float32Array(particleCount)
    phase = new Float32Array(particleCount)
    accent = new Uint8Array(particleCount)
    size = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i += 1) {
      rot[i] = hash(i + 20) * Math.PI
      phase[i] = hash(i + 21)
      accent[i] = hash(i + 99) > 0.975 ? 1 : 0
      size[i] = particleSize * (0.65 + hash(i + 22) * 0.9)
    }
    const ribbons = buildScatter(ribbonCount)
    rHome = ribbons.home
    rAxis = ribbons.axis
    rSpin = ribbons.speed
    rPos = new Float32Array(ribbonCount * 3)
    rDrift = buildDrift(ribbonCount, 0.4)
    rGarland = new Float32Array(ribbonCount * 3)
    rTangent = new Float32Array(ribbonCount * 3)
    rColor = new Float32Array(ribbonCount * 3)
    const metals = [
      [0.22, 0.92, 0.69],
      [1, 0.88, 0.36],
    ]
    for (let i = 0; i < ribbonCount; i += 1) {
      const lane = i % 2
      const t = Math.pow(Math.floor(i / 2) / Math.max(1, Math.ceil(ribbonCount / 2) - 1), 0.78)
      const looseness = (1 - t) ** 2
      const radius = TREE.radius * Math.pow(1 - t, 0.88) * (1 + (hash(i + 811) - 0.5) * looseness * 0.18)
      const angle = t * TREE.turns * Math.PI * 2 + lane * Math.PI + (hash(i + 812) - 0.5) * looseness * 0.18
      const ap = TREE.turns * Math.PI * 2
      const rp = -TREE.radius * 0.88 * Math.pow(Math.max(0.002, 1 - t), -0.12)
      rGarland[i * 3] = Math.cos(angle) * radius
      rGarland[i * 3 + 1] = TREE.y0 + t * TREE.height
      rGarland[i * 3 + 2] = Math.sin(angle) * radius
      const dx = -Math.sin(angle) * ap * radius + Math.cos(angle) * rp
      const dy = TREE.height
      const dz = Math.cos(angle) * ap * radius + Math.sin(angle) * rp
      const len = Math.hypot(dx, dy, dz) || 1
      rTangent[i * 3] = dx / len
      rTangent[i * 3 + 1] = dy / len
      rTangent[i * 3 + 2] = dz / len
      const metal = metals[lane]
      const brightness = 0.6 + t * 0.4
      rColor[i * 3] = metal[0] * brightness
      rColor[i * 3 + 1] = metal[1] * brightness
      rColor[i * 3 + 2] = metal[2] * brightness
    }
  }
  if (ornamentCount !== quality.ornaments) {
    ornamentCount = quality.ornaments
    ornamentAnchor.length = 0
    ornamentNow.length = 0
    for (let i = 0; i < ornamentCount; i += 1) {
      const t = 0.12 + (i / ornamentCount) * 0.76
      const radius = TREE.radius * (1 - t)
      const angle = t * 50 * Math.PI
      const pose = {
        x: Math.cos(angle) * (radius + 0.2),
        y: TREE.y0 + t * TREE.height,
        z: Math.sin(angle) * (radius + 0.2),
        rx: 0,
        ry: angle,
        rz: 0,
        s: 1,
      }
      ornamentAnchor.push(pose)
      ornamentNow.push({ ...pose, y: pose.y + 6, s: 0.2 })
    }
  }
  if (revealCtrl.armed || runtime.phase === 'reveal') {
    resetMotion()
    revealCtrl.armed = false
  }
}

const spun = { x: 0, y: 0, z: 0 }

function spinOffset(
  homeArr: Float32Array,
  axisArr: Float32Array,
  spinArr: Float32Array,
  i: number,
  time: number,
) {
  const o = i * 3
  const x = homeArr[o]
  const y = homeArr[o + 1]
  const z = homeArr[o + 2]
  const ax = axisArr[o]
  const ay = axisArr[o + 1]
  const az = axisArr[o + 2]
  const ang = time * spinArr[i]
  const cos = Math.cos(ang)
  const sin = Math.sin(ang)
  const dot = ax * x + ay * y + az * z
  const cx = ay * z - az * y
  const cy = az * x - ax * z
  const cz = ax * y - ay * x
  const one = 1 - cos
  spun.x = x * cos + cx * sin + ax * dot * one
  spun.y = y * cos + cy * sin + ay * dot * one + SCATTER_CENTER_Y
  spun.z = z * cos + cz * sin + az * dot * one
  return spun
}

// Independent phases keep the cloud floating without bending the whole silhouette.
function buildDrift(count: number, scale: number) {
  const motion = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    motion[i * 3] = hash(i + 701) * Math.PI * 2
    motion[i * 3 + 1] = 0.18 + hash(i + 702) * 0.3
    // A few loose motes drift farther; most stay near their shape anchor.
    motion[i * 3 + 2] = scale * (hash(i + 703) > 0.95 ? 0.55 + hash(i + 704) * 0.65 : 0.06 + hash(i + 704) * 0.13)
  }
  return motion
}

function stepPoints(
  count: number,
  positions: Float32Array,
  motion: Float32Array,
  targets: Float32Array | null,
  homeArr: Float32Array | null,
  axisArr: Float32Array | null,
  spinArr: Float32Array | null,
  k: number,
  time: number,
  scatterMix = 0,
) {
  for (let i = 0; i < count; i += 1) {
    const o = i * 3
    let tx = 0
    let ty = 0
    let tz = 0
    if (targets) {
      tx = targets[o]
      ty = targets[o + 1]
      tz = targets[o + 2]
    } else if (homeArr && axisArr && spinArr) {
      const spun = spinOffset(homeArr, axisArr, spinArr, i, time)
      tx = spun.x
      ty = spun.y
      tz = spun.z
    }
    if (targets && scatterMix > 0 && homeArr && axisArr && spinArr) {
      const spread = spinOffset(homeArr, axisArr, spinArr, i, time * 0.55)
      tx += (spread.x * 0.72 - tx) * scatterMix
      ty += ((spread.y - SCATTER_CENTER_Y) * 0.72 + SCATTER_CENTER_Y - ty) * scatterMix
      tz += (spread.z * 0.72 - tz) * scatterMix
    }
    const phase = motion[o]
    const t = time * motion[o + 1]
    const height = THREE.MathUtils.clamp((ty - TREE.y0) / TREE.height, 0, 1)
    const driftGain = runtime.mode === 'TEXT' ? 0.12
      : runtime.mode === 'ELK' || runtime.mode === 'SANTA' ? 0.28
      : runtime.mode === 'TREE' ? 0.18 + (1 - height) ** 2 * 1.25 : 1
    const amplitude = motion[o + 2] * driftGain
    tx += Math.sin(t + phase) * amplitude
    ty += Math.sin(t * 0.73 + phase * 2.3) * amplitude * 1.4
    tz += Math.cos(t * 0.87 + phase * 1.7) * amplitude
    positions[o] += (tx - positions[o]) * k
    positions[o + 1] += (ty - positions[o + 1]) * k
    positions[o + 2] += (tz - positions[o + 2]) * k
  }
}

function updatePhotos(dt: number, k: number) {
  const mode = runtime.morphing && morphElapsed < MORPH_BURST ? 'SCATTER' : runtime.mode
  const time = simTime
  for (let i = 0; i < PHOTO_COUNT; i += 1) {
    const pose = photoNow[i]
    let tx = 0
    let ty = 5
    let tz = 0
    let ry = 0
    let rx = 0.16
    let rz = 0
    let s = 1.12
    if (mode === 'FOCUS' && i === runtime.focusIndex) {
      tx = 0
      ty = 2
      tz = 35
      rx = 0
      ry = 0
      s = FOCUS_PHOTO_SCALE
    } else if (mode === 'SCATTER' || mode === 'FOCUS') {
      const ang = hash(i + 3) * Math.PI * 2 + time * (0.25 + hash(i + 4) * 0.4)
      const rad = 11 + (i % 5) * 1.1
      tx = Math.cos(ang) * rad
      tz = Math.sin(ang) * rad
      ty = SCATTER_CENTER_Y + Math.sin(hash(i + 5) * 6 + time * 0.6) * 4
      ry = Math.atan2(tx, tz)
      rx = 0.2
      s = 0.82
    } else if (mode === 'GALLERY') {
      const t = i / PHOTO_COUNT
      const ang = t * Math.PI * 4 + time * 0.12
      const rad = 3.2 + t * 9.5
      tx = Math.cos(ang) * rad
      tz = Math.sin(ang) * rad
      ty = 5.1 + Math.sin(time * 0.45 + i) * 0.7
      ry = Math.atan2(tx, tz)
      s = 1.25
    } else if (mode === 'TREE') {
      const t = 0.16 + (i / PHOTO_COUNT) * 0.68
      const radius = TREE.radius * (1 - t)
      const angle = t * TREE.turns * Math.PI * 2 + 0.35
      tx = Math.cos(angle) * (radius + 0.55)
      tz = Math.sin(angle) * (radius + 0.55)
      ty = TREE.y0 + t * TREE.height
      ry = Math.atan2(tx, tz)
      rx = 0.08
      rz = Math.sin(i * 1.8) * 0.07
      s = 0.78
    } else {
      const ang = (i / PHOTO_COUNT) * Math.PI * 2 + time * 0.08
      tx = Math.cos(ang) * 9.2
      tz = Math.sin(ang) * 9.2
      ty = 4.2 + Math.sin(ang * 2) * 1.2
      ry = Math.atan2(tx, tz)
      s = 1.05
    }
    pose.x += (tx - pose.x) * k
    pose.y += (ty - pose.y) * k
    pose.z += (tz - pose.z) * k
    pose.rx += (rx - pose.rx) * k
    pose.ry += (ry - pose.ry) * k
    pose.rz += (rz - pose.rz) * k
    pose.s += (s - pose.s) * k
    if (mode === 'SCATTER' || (mode === 'FOCUS' && i !== runtime.focusIndex)) pose.ry += dt * 0.4
  }
}

function updateOrnaments(k: number) {
  const mode = runtime.morphing && morphElapsed < MORPH_BURST ? 'SCATTER' : runtime.mode
  const time = simTime
  for (let i = 0; i < ornamentCount; i += 1) {
    const pose = ornamentNow[i]
    const anchor = ornamentAnchor[i]
    let tx = anchor.x
    let ty = anchor.y + Math.sin(time * 0.7 + i) * 0.12
    let tz = anchor.z
    let s = 1
    let ry = anchor.ry + time * 0.15
    if (mode === 'GALLERY') {
      const ang = anchor.ry + time * 0.16
      const rad = 4 + (i % 6) * 1.15
      tx = Math.cos(ang) * rad
      tz = Math.sin(ang) * rad
      ty = 5.4 + Math.sin(time * 0.5 + i) * 0.85
      ry = ang
    } else if (mode === 'SCATTER' || mode === 'FOCUS') {
      const ang = anchor.ry + time * (0.3 + (i % 4) * 0.08)
      const rad = 10 + (i % 5) * 1.4
      tx = Math.cos(ang) * rad
      tz = Math.sin(ang) * rad
      ty = SCATTER_CENTER_Y + Math.sin(time * 0.8 + i) * 3.2
      ry = ang
      s = 0.85
    } else if (mode !== 'TREE') {
      const ang = anchor.ry + time * 0.1
      tx = Math.cos(ang) * 5.6
      tz = Math.sin(ang) * 5.6
      ty = 4.2 + Math.sin(ang) * 1.2
      ry = time * 0.2 + i
    }
    pose.x += (tx - pose.x) * k
    pose.y += (ty - pose.y) * k
    pose.z += (tz - pose.z) * k
    pose.ry += (ry - pose.ry) * k
    pose.s += (s - pose.s) * k
  }
}

export function stepSim(dt: number) {
  stepPalette(dt)
  if (!clouds || particleCount === 0) return
  const step = Math.min(0.05, Math.max(0.001, dt))
  simTime += step
  if (runtime.morphing) {
    if (seenMorph !== runtime.morphId) {
      seenMorph = runtime.morphId
      morphElapsed = 0
      morphFrom = pos.slice()
      ribbonFrom = rPos.slice()
    }
    morphElapsed += step
    if (morphElapsed >= MORPH_DURATION) finishMorph()
  }
  if (runtime.phase === 'reveal') {
    if (!revealCtrl.startedAt) revealCtrl.startedAt = performance.now()
    revealCtrl.t = Math.min(1, (performance.now() - revealCtrl.startedAt) / (revealCtrl.duration * 1000))
    if (revealCtrl.t >= 1) finishReveal()
  }
  const revealPower = Math.max(0, (revealCtrl.t - 0.18) / 0.82)
  const targetPower = runtime.phase === 'reveal' ? revealPower : runtime.phase === 'play' && runtime.powered ? 1 : 0
  power += (targetPower - power) * (1 - Math.exp(-Math.min(dt, 0.12) * 1.6))
  const gain = runtime.phase === 'reveal' ? 1.4 + revealCtrl.t * 3.2 : runtime.morphing ? 6 : 2.6
  const k = 1 - Math.exp(-Math.min(dt, 0.12) * gain)

  const mode = runtime.mode
  const scattered = mode === 'SCATTER' || mode === 'FOCUS'
  const cloud = clouds[shapeOf(mode)]
  const time = simTime
  const bursting = runtime.morphing && morphElapsed < MORPH_BURST
  const spread = runtime.morphing ? scatterAmount(morphElapsed) : 0

  if (scattered) {
    stepPoints(particleCount, pos, drift, null, home, axis, spin, k, time)
  } else {
    stepPoints(particleCount, pos, drift, bursting ? morphFrom : cloud.positions, home, axis, spin, k, time, spread)
  }
  const colorTarget = scattered ? scatterCol : cloud.colors
  const palette = getPalette()
  const classic = hasClassicColors(mode)
  for (let i = 0; i < particleCount; i += 1) {
    const o = i * 3
    const height = THREE.MathUtils.clamp(((scattered ? pos[o + 1] : cloud.positions[o + 1]) - TREE.y0) / TREE.height, 0, 1)
    if (classic) {
      surfaceTint.r = colorTarget[o]
      surfaceTint.g = colorTarget[o + 1]
      surfaceTint.b = colorTarget[o + 2]
      // Keep the character's own red/white colors throughout its burst as well.
      burstTint.r = surfaceTint.r
      burstTint.g = surfaceTint.g
      burstTint.b = surfaceTint.b
    } else {
      mapPalette(colorTarget[o], colorTarget[o + 1], colorTarget[o + 2], height, mode === 'TREE', palette, surfaceTint)
      if (spread > 0) mapPalette(scatterCol[o], scatterCol[o + 1], scatterCol[o + 2], height, false, palette, burstTint)
    }
    col[o] += (THREE.MathUtils.lerp(surfaceTint.r, burstTint.r, spread) - col[o]) * k
    col[o + 1] += (THREE.MathUtils.lerp(surfaceTint.g, burstTint.g, spread) - col[o + 1]) * k
    col[o + 2] += (THREE.MathUtils.lerp(surfaceTint.b, burstTint.b, spread) - col[o + 2]) * k
  }

  const ribbonTree = mode === 'TREE'
  const ribbonStretch = ribbonTree ? 0.035 : mode === 'GALLERY' ? 0.22 : 0.08
  rStretch += (ribbonStretch - rStretch) * k
  const stride = Math.max(1, Math.floor(particleCount / ribbonCount))
  if (scattered) {
    stepPoints(ribbonCount, rPos, rDrift, null, rHome, rAxis, rSpin, k, time)
  } else if (ribbonTree) {
    stepPoints(ribbonCount, rPos, rDrift, bursting ? ribbonFrom : rGarland, rHome, rAxis, rSpin, k, time, spread)
  } else {
    const sampled = sampleRibbonTargets(cloud.positions, stride)
    stepPoints(ribbonCount, rPos, rDrift, bursting ? ribbonFrom : sampled, rHome, rAxis, rSpin, k, time, spread)
  }

  updatePhotos(step, k)
  updateOrnaments(k)
}

function writeBasis(
  array: Float32Array,
  offset: number,
  xx: number,
  xy: number,
  xz: number,
  yx: number,
  yy: number,
  yz: number,
  zx: number,
  zy: number,
  zz: number,
  px: number,
  py: number,
  pz: number,
) {
  array[offset] = xx
  array[offset + 1] = xy
  array[offset + 2] = xz
  array[offset + 3] = 0
  array[offset + 4] = yx
  array[offset + 5] = yy
  array[offset + 6] = yz
  array[offset + 7] = 0
  array[offset + 8] = zx
  array[offset + 9] = zy
  array[offset + 10] = zz
  array[offset + 11] = 0
  array[offset + 12] = px
  array[offset + 13] = py
  array[offset + 14] = pz
  array[offset + 15] = 1
}

export function writeParticles(mesh: THREE.InstancedMesh) {
  const matrices = mesh.instanceMatrix.array as Float32Array
  const colors = mesh.instanceColor?.array as Float32Array | undefined
  if (!colors) return
  const glow = 0.07 + 0.93 * power
  const palette = getPalette()
  for (let i = 0; i < particleCount; i += 1) {
    const o = i * 3
    const tw = 0.8 + 0.2 * Math.sin(simTime * (2.1 + phase[i]) + phase[i] * 6.2)
    const s = size[i] * tw * (0.55 + 0.45 * Math.min(1, glow + 0.25)) * (runtime.mode === 'TEXT' ? 0.6 : 1)
    const c = Math.cos(rot[i])
    const sn = Math.sin(rot[i])
    writeBasis(matrices, i * 16, c * s, 0, -sn * s, 0, s, 0, sn * s, 0, c * s, pos[o], pos[o + 1], pos[o + 2])
    let r = col[o]
    let g = col[o + 1]
    let b = col[o + 2]
    if (accent[i] && power > 0.35 && !hasClassicColors(runtime.mode)) {
      const mix = 0.42
      const tr = palette.secondary.r
      const tg = palette.secondary.g
      const tb = palette.secondary.b
      r = r * (1 - mix) + tr * mix
      g = g * (1 - mix) + tg * mix
      b = b * (1 - mix) + tb * mix
    }
    const gain = glow * 0.95
    colors[o] = r * gain
    colors[o + 1] = g * gain
    colors[o + 2] = b * gain
  }
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

export function writeRibbons(mesh: THREE.InstancedMesh) {
  const matrices = mesh.instanceMatrix.array as Float32Array
  const colors = mesh.instanceColor?.array as Float32Array | undefined
  if (!colors) return
  const glow = 0.05 + 0.95 * power
  const treeMode = runtime.mode === 'TREE'
  const palette = getPalette()
  const ribbonBoost = hasClassicColors(runtime.mode) ? 0 : treeMode ? 0.72 : runtime.mode === 'GALLERY' ? 0.4 : 0.015
  const sx = 0.018
  const sy = Math.max(0.025, rStretch)
  const sz = 0.012
  for (let i = 0; i < ribbonCount; i += 1) {
    const o = i * 3
    let yx = 0
    let yy = 1
    let yz = 0
    if (treeMode) {
      yx = rTangent[o]
      yy = rTangent[o + 1]
      yz = rTangent[o + 2]
    } else {
      const yaw = simTime * rSpin[i] + i
      yx = Math.sin(yaw) * 0.2
      yy = 1
      yz = Math.cos(yaw) * 0.2
    }
    const len = Math.hypot(yx, yy, yz) || 1
    yx /= len
    yy /= len
    yz /= len
    let hx = 0
    let hy = 1
    let hz = 0
    if (Math.abs(yy) > 0.85) {
      hx = 1
      hy = 0
    }
    let xx = hy * yz - hz * yy
    let xy = hz * yx - hx * yz
    let xz = hx * yy - hy * yx
    const xl = Math.hypot(xx, xy, xz) || 1
    xx /= xl
    xy /= xl
    xz /= xl
    const zx = xy * yz - xz * yy
    const zy = xz * yx - xx * yz
    const zz = xx * yy - xy * yx
    writeBasis(
      matrices,
      i * 16,
      xx * sx,
      xy * sx,
      xz * sx,
      yx * sy,
      yy * sy,
      yz * sy,
      zx * sz,
      zy * sz,
      zz * sz,
      rPos[o],
      rPos[o + 1],
      rPos[o + 2],
    )
    const height = THREE.MathUtils.clamp((rGarland[o + 1] - TREE.y0) / TREE.height, 0, 1)
    const tint = mapPalette(rColor[o], rColor[o + 1], rColor[o + 2], height, treeMode, palette, surfaceTint)
    colors[o] = tint.r * glow * ribbonBoost
    colors[o + 1] = tint.g * glow * ribbonBoost
    colors[o + 2] = tint.b * glow * ribbonBoost
  }
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

let ribbonSample = new Float32Array(0)

function sampleRibbonTargets(source: Float32Array, stride: number) {
  const needed = ribbonCount * 3
  if (ribbonSample.length !== needed) ribbonSample = new Float32Array(needed)
  for (let i = 0; i < ribbonCount; i += 1) {
    const from = i * stride * 3
    ribbonSample[i * 3] = source[from]
    ribbonSample[i * 3 + 1] = source[from + 1]
    ribbonSample[i * 3 + 2] = source[from + 2]
  }
  return ribbonSample
}
