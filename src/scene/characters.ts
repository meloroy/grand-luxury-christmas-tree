import * as THREE from 'three'

type Point = [number, number, number]
type Part = { geometry: THREE.BufferGeometry; color: THREE.Color; weight: number }

function sculptor() {
  const parts: Part[] = []
  const add = (geometry: THREE.BufferGeometry, color: string, at: Point, scale: Point = [1, 1, 1], tilt = 0, weight = 1) => {
    geometry.scale(...scale)
    geometry.rotateZ(tilt)
    geometry.translate(...at)
    parts.push({ geometry, color: new THREE.Color(color), weight })
  }
  const oval = (at: Point, scale: Point, color: string, tilt = 0, weight = 1) =>
    add(new THREE.SphereGeometry(1, 20, 14), color, at, scale, tilt, weight)
  const tube = (points: Point[], radius: number, color: string, endRadius = radius, weight = 1) => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal')
    const segments = 32
    const geometry = new THREE.TubeGeometry(curve, segments, radius, 8, false)
    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    const center = new THREE.Vector3()
    for (let row = 0; row <= segments; row += 1) {
      const t = row / segments
      curve.getPointAt(t, center)
      const taper = THREE.MathUtils.lerp(1, endRadius / radius, t)
      for (let side = 0; side <= 8; side += 1) {
        const index = row * 9 + side
        position.setXYZ(index,
          center.x + (position.getX(index) - center.x) * taper,
          center.y + (position.getY(index) - center.y) * taper,
          center.z + (position.getZ(index) - center.z) * taper)
      }
    }
    geometry.computeVertexNormals()
    add(geometry, color, [0, 0, 0], [1, 1, 1], 0, weight)
  }
  const ring = (at: Point, radius: number, thickness: number, color: string, scale: Point = [1, 1, 1]) => {
    const geometry = new THREE.TorusGeometry(radius, thickness, 8, 40)
    geometry.rotateX(Math.PI / 2)
    add(geometry, color, at, scale)
  }
  return { parts, add, oval, tube, ring }
}

function random(n: number) {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

/** Sample real 3D surfaces, retaining small facial details and depth lighting. */
function sample(parts: Part[], count: number, positions: Float32Array, colors: Float32Array) {
  const faces: { part: Part; a: number; b: number; c: number; end: number }[] = []
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const edge = new THREE.Vector3(), cross = new THREE.Vector3()
  let area = 0
  for (const part of parts) {
    const attribute = part.geometry.getAttribute('position')
    const indices = part.geometry.index
    const length = indices?.count ?? attribute.count
    for (let i = 0; i < length; i += 3) {
      const ia = indices ? indices.getX(i) : i
      const ib = indices ? indices.getX(i + 1) : i + 1
      const ic = indices ? indices.getX(i + 2) : i + 2
      a.fromBufferAttribute(attribute, ia)
      b.fromBufferAttribute(attribute, ib)
      c.fromBufferAttribute(attribute, ic)
      edge.subVectors(b, a)
      cross.subVectors(c, a).cross(edge)
      const size = cross.length() * 0.5 * part.weight
      if (size < 1e-10) continue
      area += size
      faces.push({ part, a: ia, b: ib, c: ic, end: area })
    }
  }
  const normal = new THREE.Vector3()
  const light = new THREE.Vector3(-0.4, 0.65, 0.8).normalize()
  for (let i = 0; i < count; i += 1) {
    // Stratification prevents narrow antler branches disappearing at phone counts.
    const pick = ((i + random(i + 41)) / count) * area
    let lo = 0, hi = faces.length - 1
    while (lo < hi) {
      const middle = (lo + hi) >>> 1
      if (faces[middle].end < pick) lo = middle + 1
      else hi = middle
    }
    const face = faces[lo]
    const position = face.part.geometry.getAttribute('position')
    const normals = face.part.geometry.getAttribute('normal')
    const root = Math.sqrt(random(i + 73))
    const u = 1 - root, v = root * (1 - random(i + 97)), w = 1 - u - v
    a.fromBufferAttribute(position, face.a)
    b.fromBufferAttribute(position, face.b)
    c.fromBufferAttribute(position, face.c)
    const o = i * 3
    positions[o] = a.x * u + b.x * v + c.x * w
    positions[o + 1] = a.y * u + b.y * v + c.y * w
    positions[o + 2] = a.z * u + b.z * v + c.z * w
    a.fromBufferAttribute(normals, face.a)
    b.fromBufferAttribute(normals, face.b)
    c.fromBufferAttribute(normals, face.c)
    normal.copy(a).multiplyScalar(u).addScaledVector(b, v).addScaledVector(c, w).normalize()
    const shade = (0.52 + Math.max(0, normal.dot(light)) * 0.48) * (0.85 + random(i + 11) * 0.15)
    colors[o] = face.part.color.r * shade
    colors[o + 1] = face.part.color.g * shade
    colors[o + 2] = face.part.color.b * shade
  }
  for (const part of parts) part.geometry.dispose()
}

export function fillElk(count: number, positions: Float32Array, colors: Float32Array) {
  const { parts, oval, tube, ring } = sculptor()
  const fur = '#c59357', shadow = '#926037', cream = '#f0d9a7', gold = '#e8c77c'
  oval([-0.3, 3.7, 0], [2.45, 1.15, 0.85], fur, -0.04)
  oval([1.25, 4.05, 0], [0.95, 1.35, 0.8], fur, -0.22)
  oval([-1.8, 3.65, 0], [0.95, 1.2, 0.85], shadow, 0.2)
  tube([[1.15, 4.1, 0], [1.75, 5.15, 0], [2.05, 6.35, 0]], 0.7, fur, 0.38)
  oval([1.72, 5.05, 0.48], [0.36, 0.9, 0.28], cream, -0.28)
  oval([2.2, 6.75, 0], [0.66, 0.83, 0.48], fur, 0.35)
  oval([2.73, 6.42, 0.08], [0.77, 0.34, 0.37], fur, -0.2)
  oval([3.3, 6.3, 0.1], [0.21, 0.22, 0.28], '#563e2b', 0, 2)
  for (const side of [-1, 1]) {
    oval([1.75, 7.25, side * 0.39], [0.23, 0.63, 0.14], fur, 0.65 * side)
    oval([1.76, 7.3, side * 0.49], [0.12, 0.4, 0.045], cream, 0.65 * side)
    oval([2.38, 6.85, side * 0.445], [0.13, 0.13, 0.055], cream, 0, 5)
    oval([2.4, 6.85, side * 0.49], [0.08, 0.09, 0.04], '#241d17', 0, 7)
    oval([2.42, 6.89, side * 0.525], [0.025, 0.028, 0.015], '#fff2cb', 0, 9)
    const z = side * 0.42
    tube([[2.05, 7.25, z], [1.6 + side * 0.25, 8.3, z], [1.25 + side * 0.5, 9.6, z], [1.55 + side * 0.65, 11.05, z]], 0.095, gold, 0.02, 3)
    tube([[1.7 + side * 0.25, 8.3, z], [0.8 + side * 0.3, 8.8, z], [0.45 + side * 0.3, 9.45, z]], 0.068, gold, 0.012, 3)
    tube([[1.3 + side * 0.45, 9.25, z], [2.25 + side * 0.45, 9.65, z], [2.65 + side * 0.45, 10.35, z]], 0.06, gold, 0.012, 3)
    tube([[1.35 + side * 0.55, 10, z], [0.8 + side * 0.55, 10.6, z], [0.72 + side * 0.55, 11.2, z]], 0.045, gold, 0.009, 3)
    const limbZ = side * 0.57
    tube([[1.15, 3.5, limbZ], [1.25 + side * 0.13, 1.8, limbZ], [1.55 + side * 0.22, -0.65, limbZ]], 0.24, fur, 0.09)
    tube([[-1.7, 3.65, limbZ], [-2.05, 2.3, limbZ], [-1.5 + side * 0.22, 1.05, limbZ], [-1.8 + side * 0.32, -0.65, limbZ]], 0.29, shadow, 0.095)
    oval([1.61 + side * 0.22, -0.8, limbZ + 0.04], [0.24, 0.23, 0.21], '#5c4129')
    oval([-1.74 + side * 0.32, -0.8, limbZ + 0.04], [0.25, 0.23, 0.22], '#5c4129')
  }
  tube([[-2.5, 4, 0], [-3, 4.4, 0], [-3.22, 4.38, 0]], 0.22, cream, 0.025)
  ring([1.9, 5.8, 0], 0.48, 0.11, '#326c53', [1, 1, 0.86])
  oval([1.96, 5.55, 0.57], [0.16, 0.2, 0.16], gold, 0, 3)
  sample(parts, count, positions, colors)
}

export function fillSanta(count: number, positions: Float32Array, colors: Float32Array) {
  const { parts, add, oval, tube, ring } = sculptor()
  const red = '#cf3c42', deepRed = '#9f2634', white = '#eee7d7', skin = '#edb58f', gold = '#d9b565'
  oval([0, 2.8, 0], [1.7, 2.15, 1.1], red)
  oval([-0.68, 0.15, 0], [0.54, 0.88, 0.62], deepRed)
  oval([0.68, 0.15, 0], [0.54, 0.88, 0.62], deepRed)
  for (const side of [-1, 1]) {
    oval([side * 0.72, -0.65, 0.25], [0.64, 0.47, 0.91], '#302e32')
    ring([side * 0.69, -0.25, 0], 0.49, 0.12, white, [1, 1, 1.1])
  }
  ring([0, 0.95, 0], 1.3, 0.2, white, [1.15, 1, 0.77])
  ring([0, 2.05, 0], 1.58, 0.14, '#3f3030', [1, 1.2, 0.67])
  add(new THREE.BoxGeometry(0.63, 0.4, 0.16), gold, [0, 2.05, 1.15])
  add(new THREE.BoxGeometry(0.33, 0.2, 0.04), '#423432', [0, 2.05, 1.25])
  tube([[-1.3, 4.1, 0], [-2.1, 3.75, 0], [-2.2, 2.85, 0.2]], 0.43, red, 0.3)
  tube([[1.3, 4.1, 0], [2.25, 4.7, 0], [2.45, 5.85, 0.08]], 0.43, red, 0.28)
  ring([-2.2, 2.95, 0.2], 0.3, 0.13, white)
  ring([2.45, 5.9, 0.08], 0.29, 0.13, white)
  oval([-2.2, 2.57, 0.26], [0.35, 0.42, 0.31], deepRed)
  oval([2.45, 6.27, 0.1], [0.34, 0.43, 0.29], red)
  oval([2.13, 6.2, 0.2], [0.17, 0.25, 0.19], red, -0.5)
  oval([-1.85, 3.4, -0.7], [0.85, 1.4, 0.75], '#83543a', -0.3)
  oval([0, 5.96, 0.04], [1.03, 1.15, 0.85], skin)
  for (const side of [-1, 1]) {
    oval([side * 0.98, 6, 0.08], [0.21, 0.35, 0.24], skin)
    oval([side * 0.64, 5.96, 0.73], [0.26, 0.2, 0.13], '#dc897e')
  }
  const beardProfile = [[0, 0], [0.3, 0.2], [0.7, 0.65], [1.03, 1.2], [1.08, 1.65], [0.79, 1.95], [0, 2.05]]
  add(new THREE.LatheGeometry(beardProfile.map(([x, y]) => new THREE.Vector2(x, y)), 28), white, [0, 3.8, 0.55], [1, 1, 0.63])
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 8) * Math.PI
    oval([Math.cos(angle) * 0.77, 4.85 - Math.sin(angle) * 0.6, 0.95], [0.22, 0.44, 0.15], i % 2 ? '#d6d3cc' : white, Math.cos(angle) * 0.4)
  }
  oval([0, 5.61, 0.98], [0.23, 0.12, 0.08], '#8c4943', 0, 4)
  for (const side of [-1, 1]) {
    oval([side * 0.39, 6.4, 0.81], [0.14, 0.095, 0.045], '#413637', 0, 7)
    oval([side * 0.38, 6.43, 0.855], [0.035, 0.03, 0.015], white, 0, 10)
    tube([[side * 0.15, 6.62, 0.8], [side * 0.4, 6.72, 0.79], [side * 0.66, 6.62, 0.7]], 0.07, white, 0.025, 3)
    tube([[0, 5.9, 1.13], [side * 0.3, 5.78, 1.14], [side * 0.68, 5.89, 0.97]], 0.17, white, 0.025, 3)
  }
  oval([0, 6.05, 0.99], [0.21, 0.18, 0.23], '#e8a17f', 0, 4)
  tube([[0, 7.02, 0], [0.05, 8.05, 0], [0.8, 8.62, 0], [1.48, 8.35, 0], [1.63, 7.85, 0.12]], 1.02, red, 0.025)
  ring([0, 7.02, 0], 1.02, 0.18, white, [1, 1, 0.88])
  oval([1.64, 7.82, 0.12], [0.31, 0.34, 0.31], white, 0, 2)
  for (const y of [3.1, 3.7, 4.25]) oval([0, y, 1.07], [0.085, 0.085, 0.055], gold, 0, 3)
  sample(parts, count, positions, colors)
}
