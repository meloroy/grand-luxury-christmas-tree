import * as THREE from 'three'
import { TREE_HEIGHT, TREE_Y0 } from './constants'
import { createDual, writeColor, writeQuat, writeScale, writeVec3, type DualBuffers } from './dualTransform'
import { getQuality } from './quality'
import { mulberry32, range, type Rng } from './rng'
import {
  outwardQuaternion,
  placeSeparated,
  randomQuaternion,
  sampleChaos,
  sampleTreeSurface,
} from './treeLayout'

const CHROME = ['#e8eef4', '#d5dee8', '#c3ced8', '#f5f7fa', '#b7c4d0', '#9eacb9']
const JEWEL = ['#0d4a3a', '#08352b', '#145743', '#163652', '#1c4564', '#6d1b36', '#4a1730', '#1a4a44']
const PAPER = ['#123f34', '#1a3a52', '#e7edf2', '#721f38', '#243833', '#44525e', '#10241f', '#d9e2ea']
const METAL_GIFT = ['#d5dee8', '#eef2f6', '#b7c3ce']
const LIGHTS = ['#f4f8fc', '#e7f1f8', '#d7e7f2', '#f7fbff', '#d5e6ea', '#eef3f7']

function pick<T>(rng: Rng, values: T[]) {
  return values[Math.floor(rng() * values.length)]
}

function normalFromPoint(point: THREE.Vector3) {
  const normal = new THREE.Vector3(point.x, 0.42, point.z)
  if (normal.lengthSq() < 1e-4) normal.set(0, 1, 0)
  return normal.normalize()
}

function uprightQuat(rng: Rng, tilt = 0.12) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler((rng() - 0.5) * tilt, rng() * Math.PI * 2, (rng() - 0.5) * tilt),
  )
}

export type TreeData = {
  foliage: THREE.BufferGeometry
  settledSnow: THREE.BufferGeometry
  fallingSnow: THREE.BufferGeometry
  chrome: DualBuffers
  jewel: DualBuffers
  snowCaps: DualBuffers
  paperGifts: DualBuffers
  metalGifts: DualBuffers
  ribbons: DualBuffers
  lights: DualBuffers
  polaroids: DualBuffers
  photoUv: Float32Array
  clumps: DualBuffers
  starChaos: THREE.Vector3
  starTarget: THREE.Vector3
  starChaosQuat: THREE.Quaternion
  starTargetQuat: THREE.Quaternion
}

function fillOrnament(
  data: DualBuffers,
  index: number,
  rng: Rng,
  position: THREE.Vector3,
  targetQuat: THREE.Quaternion,
  scale: [number, number, number],
  color: string,
  chaos: { radius: number; yScale: number; yBias: number },
  lift = 0,
) {
  writeVec3(data.targetPos, index, position)
  writeVec3(data.chaosPos, index, sampleChaos(rng, chaos.radius, chaos.yScale, chaos.yBias))
  writeQuat(data.targetQuat, index, targetQuat)
  writeQuat(data.chaosQuat, index, randomQuaternion(rng))
  writeScale(data.scale, index, scale[0], scale[1], scale[2])
  writeColor(data.color, index, color)
  data.seed[index] = rng()
  data.lift[index] = lift
}

function buildBaubles(count: number, seed: number, palette: string[], minH: number, maxH: number, minDist: number) {
  const rng = mulberry32(seed)
  const data = createDual(count)
  const points = placeSeparated(count, minDist, () =>
    sampleTreeSurface(rng, minH, maxH, 0.35).position,
  )
  for (let i = 0; i < count; i++) {
    const hero = i % 15 === 0
    const radius = hero ? range(rng, 0.22, 0.32) : range(rng, 0.095, 0.19)
    const position = points[i].clone().addScaledVector(normalFromPoint(points[i]), radius * 0.9)
    fillOrnament(
      data,
      i,
      rng,
      position,
      randomQuaternion(rng),
      [radius, radius, radius],
      pick(rng, palette),
      { radius: 1, yScale: 1, yBias: 0 },
    )
  }
  return data
}

function buildCaps(sources: DualBuffers[]) {
  const count = sources.reduce((sum, source) => sum + source.count, 0)
  const caps = createDual(count)
  let offset = 0
  for (const source of sources) {
    for (let i = 0; i < source.count; i++) {
      const i3 = i * 3
      const i4 = i * 4
      const o3 = (offset + i) * 3
      const o4 = (offset + i) * 4
      caps.chaosPos.set(source.chaosPos.subarray(i3, i3 + 3), o3)
      caps.targetPos.set(source.targetPos.subarray(i3, i3 + 3), o3)
      caps.chaosQuat.set(source.chaosQuat.subarray(i4, i4 + 4), o4)
      caps.targetQuat.set(source.targetQuat.subarray(i4, i4 + 4), o4)
      const radius = source.scale[i3]
      const cap = radius * 0.46
      writeScale(caps.scale, offset + i, cap, cap * 0.34, cap)
      writeColor(caps.color, offset + i, '#e7eef3')
      caps.seed[offset + i] = source.seed[i]
      caps.lift[offset + i] = radius * 0.72
    }
    offset += source.count
  }
  return caps
}

function buildGifts(count: number, seed: number, palette: string[], metal: boolean) {
  const rng = mulberry32(seed)
  const data = createDual(count)
  const ribbons = createDual(count * 2)
  const points = placeSeparated(count, 0.58, () => sampleTreeSurface(rng, 0.04, 0.46, 0.2).position)
  for (let i = 0; i < count; i++) {
    const sx = range(rng, 0.28, 0.5)
    const sy = range(rng, 0.2, 0.36)
    const sz = range(rng, 0.24, 0.44)
    const position = points[i].clone()
    position.addScaledVector(normalFromPoint(position), Math.max(sx, sz) * 0.48)
    position.y += sy * 0.15
    const quat = uprightQuat(rng, 0.18)
    fillOrnament(
      data,
      i,
      rng,
      position,
      quat,
      [sx, sy, sz],
      pick(rng, palette),
      { radius: metal ? 0.72 : 0.78, yScale: 0.48, yBias: -1.05 },
    )
    for (let band = 0; band < 2; band++) {
      const ri = i * 2 + band
      const i3 = i * 3
      const r3 = ri * 3
      ribbons.chaosPos.set(data.chaosPos.subarray(i3, i3 + 3), r3)
      ribbons.targetPos.set(data.targetPos.subarray(i3, i3 + 3), r3)
      const i4 = i * 4
      const r4 = ri * 4
      ribbons.chaosQuat.set(data.chaosQuat.subarray(i4, i4 + 4), r4)
      ribbons.targetQuat.set(data.targetQuat.subarray(i4, i4 + 4), r4)
      ribbons.seed[ri] = data.seed[i]
      ribbons.lift[ri] = 0
      writeColor(ribbons.color, ri, '#e6edf3')
      if (band === 0) writeScale(ribbons.scale, ri, sx * 1.04, sy * 1.05, sz * 0.16)
      else writeScale(ribbons.scale, ri, sx * 0.16, sy * 1.05, sz * 1.04)
    }
  }
  return { gifts: data, ribbons }
}

function buildLights(count: number) {
  const rng = mulberry32(47)
  const data = createDual(count)
  for (let i = 0; i < count; i++) {
    const surface = sampleTreeSurface(rng, 0.06, 0.98, 0.7)
    const radius = range(rng, 0.032, 0.062)
    surface.position.addScaledVector(surface.normal, 0.02)
    fillOrnament(
      data,
      i,
      rng,
      surface.position,
      new THREE.Quaternion(),
      [radius, radius, radius],
      pick(rng, LIGHTS),
      { radius: 1.18, yScale: 1.12, yBias: 0.2 },
    )
  }
  return data
}

function buildPolaroids(count: number) {
  const rng = mulberry32(71)
  const data = createDual(count)
  const columns = 8
  const rows = 4
  const uv = new Float32Array(count * 4)
  const points = placeSeparated(count, 0.78, () => sampleTreeSurface(rng, 0.22, 0.8, 0.15).position)
  for (let i = 0; i < count; i++) {
    const scale = range(rng, 0.5, 0.66)
    const position = points[i].clone().addScaledVector(normalFromPoint(points[i]), 0.22)
    fillOrnament(
      data,
      i,
      rng,
      position,
      outwardQuaternion(position, rng, -0.12, 0.22),
      [scale, scale, scale],
      '#f4f7fa',
      { radius: 0.96, yScale: 0.9, yBias: 0.15 },
    )
    const col = i % columns
    const row = Math.floor(i / columns)
    const pad = 0.04
    uv[i * 4] = (col + pad) / columns
    uv[i * 4 + 1] = 1 - (row + 1 - pad) / rows
    uv[i * 4 + 2] = (1 - pad * 2) / columns
    uv[i * 4 + 3] = (1 - pad * 2) / rows
  }
  return { data, uv, columns, rows }
}

function buildClumps(count: number) {
  const rng = mulberry32(88)
  const data = createDual(count)
  for (let i = 0; i < count; i++) {
    const surface = sampleTreeSurface(rng, 0.08, 0.96, 0.18)
    if (surface.normal.y < 0.2 && rng() > 0.25) surface.position.y += 0.08
    const radius = range(rng, 0.07, 0.16)
    surface.position.addScaledVector(surface.normal, radius * 0.35)
    fillOrnament(
      data,
      i,
      rng,
      surface.position,
      uprightQuat(rng, 0.4),
      [radius, radius * range(rng, 0.35, 0.55), radius * range(rng, 0.75, 1)],
      '#e8eef3',
      { radius: 0.9, yScale: 0.85, yBias: 0 },
    )
  }
  return data
}

function buildFoliage(count: number) {
  const rng = mulberry32(20261126)
  const chaos = new Float32Array(count * 3)
  const target = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const shell = new Float32Array(count)
  const height = new Float32Array(count)
  const scratch = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    const sample = sampleTreeSurface(rng, 0, 1, 0.65)
    scratch.copy(sampleChaos(rng, 1.02, 1, 0))
    const o = i * 3
    target[o] = sample.position.x
    target[o + 1] = sample.position.y
    target[o + 2] = sample.position.z
    chaos[o] = scratch.x
    chaos[o + 1] = scratch.y
    chaos[o + 2] = scratch.z
    normal[o] = sample.normal.x
    normal[o + 1] = sample.normal.y
    normal[o + 2] = sample.normal.z
    seed[i] = rng()
    shell[i] = sample.shell
    height[i] = sample.height
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(target.slice(), 3))
  geometry.setAttribute('aTarget', new THREE.BufferAttribute(target, 3))
  geometry.setAttribute('aChaos', new THREE.BufferAttribute(chaos, 3))
  geometry.setAttribute('aNormal', new THREE.BufferAttribute(normal, 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  geometry.setAttribute('aShell', new THREE.BufferAttribute(shell, 1))
  geometry.setAttribute('aHeight', new THREE.BufferAttribute(height, 1))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 4, 0), 22)
  return geometry
}

function buildSettledSnow(count: number) {
  const rng = mulberry32(101)
  const treeCount = Math.floor(count * 0.78)
  const chaos = new Float32Array(count * 3)
  const target = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const size = new Float32Array(count)
  const scratch = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    if (i < treeCount) {
      const sample = sampleTreeSurface(rng, 0.02, 1, 0.22)
      sample.position.addScaledVector(sample.normal, 0.05)
      scratch.copy(sample.position)
    } else {
      const angle = rng() * Math.PI * 2
      const radius = range(rng, 2.3, 7.2)
      scratch.set(Math.cos(angle) * radius, 0.03 + rng() * 0.05, Math.sin(angle) * radius)
    }
    const chaosPos = sampleChaos(rng, 1.05, 0.9, -0.2)
    const o = i * 3
    target[o] = scratch.x
    target[o + 1] = scratch.y
    target[o + 2] = scratch.z
    chaos[o] = chaosPos.x
    chaos[o + 1] = chaosPos.y
    chaos[o + 2] = chaosPos.z
    seed[i] = rng()
    size[i] = range(rng, 3.2, 7.4)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(target.slice(), 3))
  geometry.setAttribute('aTarget', new THREE.BufferAttribute(target, 3))
  geometry.setAttribute('aChaos', new THREE.BufferAttribute(chaos, 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 3, 0), 24)
  return geometry
}

function buildFallingSnow(count: number) {
  const rng = mulberry32(303)
  const origin = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const size = new Float32Array(count)
  const speed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const o = i * 3
    origin[o] = range(rng, -16, 16)
    origin[o + 1] = range(rng, 0, 18)
    origin[o + 2] = range(rng, -14, 18)
    seed[i] = rng()
    size[i] = range(rng, 5, 18)
    speed[i] = range(rng, 0.55, 1.65)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(origin.slice(), 3))
  geometry.setAttribute('aOrigin', new THREE.BufferAttribute(origin, 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 8, 2), 30)
  return geometry
}

export const POLAROID_GRID = { columns: 8, rows: 4, cell: 320 }

let cachedTree: TreeData | null = null

export function getTreeData() {
  if (!cachedTree) cachedTree = createTreeData()
  return cachedTree
}

function createTreeData(): TreeData {
  const quality = getQuality()
  const chrome = buildBaubles(quality.chrome, 11, CHROME, 0.12, 0.94, 0.22)
  const jewel = buildBaubles(quality.jewel, 19, JEWEL, 0.1, 0.9, 0.24)
  const paper = buildGifts(quality.paperGifts, 29, PAPER, false)
  const metal = buildGifts(quality.metalGifts, 31, METAL_GIFT, true)
  const ribbons = createDual(paper.ribbons.count + metal.ribbons.count)
  const ribbonSources = [paper.ribbons, metal.ribbons]
  let ribbonOffset = 0
  for (const source of ribbonSources) {
    ribbons.chaosPos.set(source.chaosPos, ribbonOffset * 3)
    ribbons.targetPos.set(source.targetPos, ribbonOffset * 3)
    ribbons.chaosQuat.set(source.chaosQuat, ribbonOffset * 4)
    ribbons.targetQuat.set(source.targetQuat, ribbonOffset * 4)
    ribbons.scale.set(source.scale, ribbonOffset * 3)
    ribbons.seed.set(source.seed, ribbonOffset)
    ribbons.color.set(source.color, ribbonOffset * 3)
    ribbons.lift.set(source.lift, ribbonOffset)
    ribbonOffset += source.count
  }
  const polaroids = buildPolaroids(quality.polaroids)
  const starRng = mulberry32(404)
  return {
    foliage: buildFoliage(quality.foliage),
    settledSnow: buildSettledSnow(quality.settledSnow),
    fallingSnow: buildFallingSnow(quality.fallingSnow),
    chrome,
    jewel,
    snowCaps: buildCaps([chrome, jewel]),
    paperGifts: paper.gifts,
    metalGifts: metal.gifts,
    ribbons,
    lights: buildLights(quality.lights),
    polaroids: polaroids.data,
    photoUv: polaroids.uv,
    clumps: buildClumps(quality.clumps),
    starChaos: sampleChaos(starRng, 0.8, 1, 1.4),
    starTarget: new THREE.Vector3(0, TREE_Y0 + TREE_HEIGHT + 0.42, 0),
    starChaosQuat: randomQuaternion(mulberry32(405)),
    starTargetQuat: new THREE.Quaternion(),
  }
}
