import * as THREE from 'three'

export type DualBuffers = {
  count: number
  chaosPos: Float32Array
  targetPos: Float32Array
  chaosQuat: Float32Array
  targetQuat: Float32Array
  scale: Float32Array
  seed: Float32Array
  color: Float32Array
  lift: Float32Array
}

export function createDual(count: number): DualBuffers {
  return {
    count,
    chaosPos: new Float32Array(count * 3),
    targetPos: new Float32Array(count * 3),
    chaosQuat: new Float32Array(count * 4),
    targetQuat: new Float32Array(count * 4),
    scale: new Float32Array(count * 3),
    seed: new Float32Array(count),
    color: new Float32Array(count * 3),
    lift: new Float32Array(count),
  }
}

const colorScratch = new THREE.Color()

export function writeVec3(buffer: Float32Array, index: number, v: THREE.Vector3) {
  const o = index * 3
  buffer[o] = v.x
  buffer[o + 1] = v.y
  buffer[o + 2] = v.z
}

export function writeQuat(buffer: Float32Array, index: number, q: THREE.Quaternion) {
  const o = index * 4
  buffer[o] = q.x
  buffer[o + 1] = q.y
  buffer[o + 2] = q.z
  buffer[o + 3] = q.w
}

export function writeColor(buffer: Float32Array, index: number, hex: string) {
  colorScratch.set(hex)
  const o = index * 3
  buffer[o] = colorScratch.r
  buffer[o + 1] = colorScratch.g
  buffer[o + 2] = colorScratch.b
}

export function writeScale(buffer: Float32Array, index: number, x: number, y: number, z: number) {
  const o = index * 3
  buffer[o] = x
  buffer[o + 1] = y
  buffer[o + 2] = z
}

const _qa = new THREE.Quaternion()
const _qb = new THREE.Quaternion()
const _qm = new THREE.Quaternion()
const _obj = new THREE.Object3D()
const _up = new THREE.Vector3()
const _radial = new THREE.Vector3()
const _paint = new THREE.Color()

export function paintInstances(mesh: THREE.InstancedMesh, colors: Float32Array) {
  for (let i = 0; i < mesh.count; i++) {
    _paint.fromArray(colors, i * 3)
    mesh.setColorAt(i, _paint)
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

export function writeDualMatrices(
  mesh: THREE.InstancedMesh,
  data: DualBuffers,
  progress: number,
  weight: number,
  time: number,
) {
  const count = data.count
  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const i4 = i * 4
    const seed = data.seed[i]
    const delay = seed * 0.3
    const tLinear = THREE.MathUtils.smoothstep(progress, delay, Math.min(delay + 0.7, 1))
    const t = tLinear * tLinear * (3 - 2 * tLinear)

    let x = THREE.MathUtils.lerp(data.chaosPos[i3], data.targetPos[i3], t)
    let y = THREE.MathUtils.lerp(data.chaosPos[i3 + 1], data.targetPos[i3 + 1], t)
    let z = THREE.MathUtils.lerp(data.chaosPos[i3 + 2], data.targetPos[i3 + 2], t)

    const drift = (1 - t) * (0.15 / Math.max(weight, 0.35))
    if (drift > 0.0001) {
      x += Math.sin(time * 0.42 + seed * 20) * drift
      y += Math.cos(time * 0.31 + seed * 13) * drift
      z += Math.sin(time * 0.27 + seed * 9) * drift * 0.75
    }

    const thrust = Math.sin(Math.PI * t) * THREE.MathUtils.clamp(0.5 / weight, 0.04, 0.78)
    _radial.set(x, 0, z)
    if (_radial.lengthSq() > 1e-6) _radial.normalize()
    else _radial.set(0, 0, 1)
    x += _radial.x * thrust
    y += thrust * 0.38
    z += _radial.z * thrust

    _qa.fromArray(data.chaosQuat, i4)
    _qb.fromArray(data.targetQuat, i4)
    _qm.copy(_qa).slerp(_qb, t)

    const settle = t * t
    const lift = data.lift[i] * settle
    _up.set(0, 1, 0).applyQuaternion(_qm)
    x += _up.x * lift
    y += _up.y * lift
    z += _up.z * lift

    let sx = data.scale[i3]
    let sy = data.scale[i3 + 1]
    let sz = data.scale[i3 + 2]
    if (data.lift[i] > 0) {
      const k = 0.15 + 0.85 * settle
      sx *= k
      sy *= k
      sz *= k
    }

    _obj.position.set(x, y, z)
    _obj.quaternion.copy(_qm)
    _obj.scale.set(sx, sy, sz)
    _obj.updateMatrix()
    mesh.setMatrixAt(i, _obj.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
}
