import * as THREE from 'three'
import { BASE_RADIUS, CHAOS_CENTER, CHAOS_RADIUS, TREE_HEIGHT, TREE_Y0 } from './constants'
import type { Rng } from './rng'

const TIERS = [
  { y0: 0.0, y1: 0.4, r0: 1, r1: 0.66 },
  { y0: 0.3, y1: 0.64, r0: 0.8, r1: 0.46 },
  { y0: 0.54, y1: 0.84, r0: 0.56, r1: 0.26 },
  { y0: 0.74, y1: 1, r0: 0.34, r1: 0.02 },
]

export type SurfaceSample = {
  position: THREE.Vector3
  normal: THREE.Vector3
  shell: number
  height: number
}

export function sampleTreeSurface(rng: Rng, minH = 0, maxH = 1, shellPower = 0.55): SurfaceSample {
  const tier = TIERS[Math.floor(rng() * TIERS.length)]
  let yN = 0
  for (let attempt = 0; attempt < 10; attempt++) {
    const along = rng()
    yN = tier.y0 + (tier.y1 - tier.y0) * along
    if (yN >= minH && yN <= maxH) break
  }
  yN = THREE.MathUtils.clamp(yN, minH, maxH)
  const span = Math.max(0.0001, tier.y1 - tier.y0)
  const alongTier = THREE.MathUtils.clamp((yN - tier.y0) / span, 0, 1)
  const rN = THREE.MathUtils.lerp(tier.r0, tier.r1, alongTier)
  const shell = Math.pow(rng(), shellPower)
  const radius = (0.16 + 0.84 * shell) * rN * BASE_RADIUS
  const angle = rng() * Math.PI * 2
  const slope =
    ((tier.r0 - tier.r1) * BASE_RADIUS) / (TREE_HEIGHT * span)
  const normal = new THREE.Vector3(Math.cos(angle), slope * 0.85 + 0.18, Math.sin(angle)).normalize()
  return {
    position: new THREE.Vector3(
      Math.cos(angle) * radius,
      TREE_Y0 + yN * TREE_HEIGHT,
      Math.sin(angle) * radius,
    ),
    normal,
    shell,
    height: yN,
  }
}

export function sampleChaos(rng: Rng, radiusScale = 1, yScale = 1, yBias = 0) {
  const theta = Math.PI * 2 * rng()
  const phi = Math.acos(2 * rng() - 1)
  const radius = CHAOS_RADIUS * radiusScale * Math.cbrt(rng())
  const sinPhi = Math.sin(phi)
  return new THREE.Vector3(
    CHAOS_CENTER.x + radius * sinPhi * Math.cos(theta),
    CHAOS_CENTER.y + radius * Math.cos(phi) * yScale + yBias,
    CHAOS_CENTER.z + radius * sinPhi * Math.sin(theta),
  )
}

export function randomQuaternion(rng: Rng) {
  const u1 = rng()
  const u2 = rng() * Math.PI * 2
  const u3 = rng() * Math.PI * 2
  const sq1 = Math.sqrt(1 - u1)
  const sq2 = Math.sqrt(u1)
  return new THREE.Quaternion(
    sq1 * Math.sin(u2),
    sq1 * Math.cos(u2),
    sq2 * Math.sin(u3),
    sq2 * Math.cos(u3),
  ).normalize()
}

const _outward = new THREE.Vector3()
const _zAxis = new THREE.Vector3(0, 0, 1)

export function outwardQuaternion(position: THREE.Vector3, rng: Rng, tilt = -0.14, roll = 0.2) {
  _outward.set(position.x, 0, position.z)
  if (_outward.lengthSq() < 1e-6) _outward.set(0, 0, 1)
  else _outward.normalize()
  const facing = new THREE.Quaternion().setFromUnitVectors(_zAxis, _outward)
  const tiltQ = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    tilt + (rng() - 0.5) * 0.16,
  )
  const rollQ = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    (rng() - 0.5) * roll * 2,
  )
  return facing.multiply(tiltQ).multiply(rollQ)
}

export function placeSeparated(
  count: number,
  minDist: number,
  sample: () => THREE.Vector3,
) {
  const placed: THREE.Vector3[] = []
  const minSq = minDist * minDist
  let attempts = 0
  while (placed.length < count && attempts < count * 36) {
    attempts++
    const point = sample()
    let clear = true
    for (const other of placed) {
      if (other.distanceToSquared(point) < minSq) {
        clear = false
        break
      }
    }
    if (clear) placed.push(point)
  }
  while (placed.length < count) placed.push(sample())
  return placed
}
