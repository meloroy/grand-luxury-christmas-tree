import * as THREE from 'three'
import type { QualityProfile } from './quality'
import { revealCtrl } from './reveal'
import { buildClouds, buildScatter, hash, type ShapeName } from './shapes'
import { POINTER_RADIUS, SCATTER_CENTER_Y, TREE } from './tree'
import { finishReveal, runtime, type Mode } from '../session/store'

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
let vel = new Float32Array(0)
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
let rVel = new Float32Array(0)
let rHome = new Float32Array(0)
let rAxis = new Float32Array(0)
let rSpin = new Float32Array(0)
let rGarland = new Float32Array(0)
let rTangent = new Float32Array(0)
let rColor = new Float32Array(0)
let rStretch = 0.2

const photoNow: Pose[] = Array.from({ length: 16 }, () => ({ x: 0, y: 12, z: 8, rx: 0, ry: 0, rz: 0, s: 0.2 }))
const ornamentNow: Pose[] = []
const ornamentAnchor: Pose[] = []

let power = 0
let simTime = 0

const pointer = { active: false, x: 0, y: 0, z: 0 }
const raycaster = new THREE.Raycaster()
const plane = new THREE.Plane()
const hit = new THREE.Vector3()
const center = new THREE.Vector3()
const normal = new THREE.Vector3()
const ndc = new THREE.Vector2()

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
  vel.fill(0)
  col.set(scatterCol)
  rPos.set(rHome)
  for (let i = 0; i < ribbonCount; i += 1) rPos[i * 3 + 1] += SCATTER_CENTER_Y
  rVel.fill(0)
  rStretch = 0.08
  for (let i = 0; i < 16; i += 1) {
    const ang = (i / 16) * Math.PI * 2
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
    vel = new Float32Array(particleCount * 3)
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
    rVel = new Float32Array(ribbonCount * 3)
    rGarland = new Float32Array(ribbonCount * 3)
    rTangent = new Float32Array(ribbonCount * 3)
    rColor = new Float32Array(ribbonCount * 3)
    const metals = [
      [1, 0.84, 0.5],
      [0.78, 0.88, 1],
      [0.5, 0.74, 1],
    ]
    for (let i = 0; i < ribbonCount; i += 1) {
      const t = i / Math.max(1, ribbonCount - 1)
      const radius = TREE.radius * (1 - t) * 0.99
      const angle = t * 8 * Math.PI * 2
      const ap = 8 * Math.PI * 2
      const rp = -TREE.radius
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
      const metal = metals[i % 3]
      rColor[i * 3] = metal[0]
      rColor[i * 3 + 1] = metal[1]
      rColor[i * 3 + 2] = metal[2]
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

export function aimPointer(camera: THREE.Camera, pointerNdc: THREE.Vector2, group: THREE.Group, active: boolean) {
  pointer.active = active && runtime.phase === 'play'
  if (!pointer.active) return
  center.set(0, SCATTER_CENTER_Y, 0)
  group.localToWorld(center)
  camera.getWorldDirection(normal)
  plane.setFromNormalAndCoplanarPoint(normal, center)
  ndc.copy(pointerNdc)
  raycaster.setFromCamera(ndc, camera)
  if (!raycaster.ray.intersectPlane(plane, hit)) {
    pointer.active = false
    return
  }
  group.worldToLocal(hit)
  pointer.x = hit.x
  pointer.y = hit.y
  pointer.z = hit.z
}

const pushed = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }

function pushTarget(x: number, y: number, z: number, tx: number, ty: number, tz: number) {
  pushed.x = tx
  pushed.y = ty
  pushed.z = tz
  pushed.vx = 0
  pushed.vy = 0
  pushed.vz = 0
  if (!pointer.active) return pushed
  const dx = x - pointer.x
  const dy = y - pointer.y
  const dz = z - pointer.z
  const dist = Math.hypot(dx, dy, dz)
  if (dist >= POINTER_RADIUS || dist < 1e-4) return pushed
  const fall = (1 - dist / POINTER_RADIUS) ** 1.25
  const push = fall * 6.4
  const inv = push / dist
  pushed.x = x + dx * inv
  pushed.y = y + dy * inv
  pushed.z = z + dz * inv
  pushed.vx = dx * inv * 0.28
  pushed.vy = dy * inv * 0.28
  pushed.vz = dz * inv * 0.28
  return pushed
}

function stepPoints(
  count: number,
  positions: Float32Array,
  velocity: Float32Array,
  targets: Float32Array | null,
  homeArr: Float32Array | null,
  axisArr: Float32Array | null,
  spinArr: Float32Array | null,
  k: number,
  dt: number,
  time: number,
) {
  const damp = Math.exp(-dt * 2.8)
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
    let x = positions[o]
    let y = positions[o + 1]
    let z = positions[o + 2]
    let vx = velocity[o]
    let vy = velocity[o + 1]
    let vz = velocity[o + 2]
    const next = pushTarget(x, y, z, tx, ty, tz)
    vx = (vx + next.vx) * damp
    vy = (vy + next.vy) * damp
    vz = (vz + next.vz) * damp
    x += vx * dt + (next.x - x) * k
    y += vy * dt + (next.y - y) * k
    z += vz * dt + (next.z - z) * k
    positions[o] = x
    positions[o + 1] = y
    positions[o + 2] = z
    velocity[o] = vx
    velocity[o + 1] = vy
    velocity[o + 2] = vz
  }
}

function updatePhotos(dt: number, k: number) {
  const mode = runtime.mode
  const time = simTime
  for (let i = 0; i < 16; i += 1) {
    const pose = photoNow[i]
    let tx = 0
    let ty = 5
    let tz = 0
    let ry = 0
    let rx = 0.16
    let s = 1.12
    if (mode === 'FOCUS' && i === runtime.focusIndex) {
      tx = 0
      ty = 2
      tz = 35
      rx = 0
      ry = 0
      s = 4.5
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
      const t = i / 16
      const ang = t * Math.PI * 4 + time * 0.12
      const rad = 3.2 + t * 9.5
      tx = Math.cos(ang) * rad
      tz = Math.sin(ang) * rad
      ty = 5.1 + Math.sin(time * 0.45 + i) * 0.7
      ry = Math.atan2(tx, tz)
      s = 1.25
    } else if (mode === 'TREE') {
      const t = 0.16 + (i / 16) * 0.68
      const radius = TREE.radius * (1 - t)
      const angle = t * 7.5 * Math.PI * 2 + 0.35
      tx = Math.cos(angle) * (radius + 0.55)
      tz = Math.sin(angle) * (radius + 0.55)
      ty = TREE.y0 + t * TREE.height
      ry = Math.atan2(tx, tz)
      rx = 0.22
      s = 1.55
    } else {
      const ang = (i / 16) * Math.PI * 2 + time * 0.08
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
    pose.s += (s - pose.s) * k
    if (mode === 'SCATTER' || (mode === 'FOCUS' && i !== runtime.focusIndex)) pose.ry += dt * 0.4
  }
}

function updateOrnaments(k: number) {
  const mode = runtime.mode
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

export function stepSim(dt: number, camera: THREE.Camera, pointerNdc: THREE.Vector2, group: THREE.Group, pointerActive: boolean) {
  if (!clouds || particleCount === 0) return
  const step = Math.min(0.05, Math.max(0.001, dt))
  simTime += step
  if (runtime.phase === 'reveal') {
    if (!revealCtrl.startedAt) revealCtrl.startedAt = performance.now()
    revealCtrl.t = Math.min(1, (performance.now() - revealCtrl.startedAt) / (revealCtrl.duration * 1000))
    if (revealCtrl.t >= 1) finishReveal()
  }
  const revealPower = Math.max(0, (revealCtrl.t - 0.18) / 0.82)
  const targetPower = runtime.phase === 'reveal' ? revealPower : runtime.phase === 'play' && runtime.powered ? 1 : 0
  power += (targetPower - power) * (1 - Math.exp(-Math.min(dt, 0.12) * 1.6))
  const gain = runtime.phase === 'reveal' ? 1.4 + revealCtrl.t * 3.2 : 2.6
  const k = 1 - Math.exp(-Math.min(dt, 0.12) * gain)
  aimPointer(camera, pointerNdc, group, pointerActive)

  const mode = runtime.mode
  const scattered = mode === 'SCATTER' || mode === 'FOCUS'
  const cloud = clouds[shapeOf(mode)]
  const time = simTime

  if (scattered) {
    stepPoints(particleCount, pos, vel, null, home, axis, spin, k, step, time)
  } else {
    stepPoints(particleCount, pos, vel, cloud.positions, null, null, null, k, step, time)
  }
  const colorTarget = scattered ? scatterCol : cloud.colors
  for (let i = 0; i < particleCount; i += 1) {
    const o = i * 3
    col[o] += (colorTarget[o] - col[o]) * k
    col[o + 1] += (colorTarget[o + 1] - col[o + 1]) * k
    col[o + 2] += (colorTarget[o + 2] - col[o + 2]) * k
  }

  const ribbonTree = mode === 'TREE'
  const ribbonStretch = ribbonTree ? 0.46 : mode === 'GALLERY' ? 0.22 : 0.08
  rStretch += (ribbonStretch - rStretch) * k
  const stride = Math.max(1, Math.floor(particleCount / ribbonCount))
  if (scattered) {
    stepPoints(ribbonCount, rPos, rVel, null, rHome, rAxis, rSpin, k, step, time)
  } else if (ribbonTree) {
    stepPoints(ribbonCount, rPos, rVel, rGarland, null, null, null, k, step, time)
  } else {
    const sampled = sampleRibbonTargets(cloud.positions, stride)
    stepPoints(ribbonCount, rPos, rVel, sampled, null, null, null, k, step, time)
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
  const pulse = 0.5 + 0.5 * Math.sin(simTime * 1.7)
  const tiffany = pulse > 0.45
  for (let i = 0; i < particleCount; i += 1) {
    const o = i * 3
    const tw = 0.8 + 0.2 * Math.sin(simTime * (2.1 + phase[i]) + phase[i] * 6.2)
    const s = size[i] * tw * (0.55 + 0.45 * Math.min(1, glow + 0.25))
    const c = Math.cos(rot[i])
    const sn = Math.sin(rot[i])
    writeBasis(matrices, i * 16, c * s, 0, -sn * s, 0, s, 0, sn * s, 0, c * s, pos[o], pos[o + 1], pos[o + 2])
    let r = col[o]
    let g = col[o + 1]
    let b = col[o + 2]
    if (accent[i] && power > 0.35) {
      const mix = 0.42
      const tr = tiffany ? 0.506 : 0.118
      const tg = tiffany ? 0.847 : 0.349
      const tb = tiffany ? 0.816 : 0.349
      r = r * (1 - mix) + tr * mix
      g = g * (1 - mix) + tg * mix
      b = b * (1 - mix) + tb * mix
    }
    const gain = glow * 1.35
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
  const ribbonBoost = treeMode ? 1.45 : runtime.mode === 'GALLERY' ? 0.4 : 0.015
  const sx = 0.05
  const sy = Math.max(0.05, rStretch)
  const sz = 0.02
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
    colors[o] = rColor[o] * glow * ribbonBoost
    colors[o + 1] = rColor[o + 1] * glow * ribbonBoost
    colors[o + 2] = rColor[o + 2] * glow * ribbonBoost
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
