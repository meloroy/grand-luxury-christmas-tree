import * as THREE from 'three'

type Point = [number, number, number]
type Part = { geometry: THREE.BufferGeometry; color: THREE.Color; weight: number; sampleOnly?: boolean }

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

export function createSantaSleigh() {
  const { parts, add, oval, tube, ring } = sculptor()
  const red = '#ef262f', deepRed = '#bd182b', white = '#fff5e8', skin = '#ffd2af'
  const gold = '#f5ce83', ivory = '#ffe7ad', dark = '#29232a'
  const box = (at: Point, dimensions: Point, color: string, weight = 1) =>
    add(new THREE.BoxGeometry(...dimensions), color, at, [1, 1, 1], 0, weight)

  // A seated, toy-like silhouette: the sack and coat sit behind the low sleigh rail.
  oval([-2.65, 4.6, -0.65], [1.23, 1.58, 1.02], deepRed, -0.3, 0.85)
  tube([[-2.65, 5.65, -0.6], [-2.5, 6.08, -0.63], [-2.25, 6.2, -0.62]], 0.34, red, 0.17)
  ring([-2.48, 5.94, -0.62], 0.27, 0.07, gold)
  oval([-1, 4.75, 0], [1.48, 1.65, 1.12], red, -0.08, 1.2)
  oval([-1.12, 3.2, 0.7], [0.83, 0.65, 0.9], deepRed)
  oval([0.02, 3.12, 0.72], [0.62, 0.57, 0.85], red)
  oval([-0.85, 2.76, 1.05], [0.64, 0.41, 0.85], dark)
  oval([0.22, 2.76, 1.05], [0.54, 0.4, 0.81], dark)
  ring([-1, 3.65, 0], 1.23, 0.2, white, [1.1, 1, 0.82])
  box([-0.92, 4.48, 1.1], [2.55, 0.3, 0.13], dark)
  box([-0.67, 4.48, 1.22], [0.54, 0.48, 0.16], gold, 2)
  box([-0.67, 4.48, 1.32], [0.28, 0.24, 0.045], dark)
  tube([[-2.12, 5.65, 0], [-2.66, 5.0, 0.54], [-2.16, 4.46, 1.02]], 0.49, red, 0.37)
  ring([-2.13, 4.38, 1.03], 0.35, 0.16, white)
  oval([-1.99, 4.09, 1.26], [0.43, 0.42, 0.35], red, 0.2)
  tube([[0.15, 5.76, 0], [0.79, 6.43, 0.05], [1.17, 7.36, 0.08]], 0.48, red, 0.33)
  ring([1.18, 7.4, 0.08], 0.35, 0.16, white)
  oval([1.3, 7.96, 0.1], [0.44, 0.6, 0.34], red, -0.22, 1.6)
  oval([0.96, 7.83, 0.32], [0.23, 0.31, 0.22], red, -0.45, 1.5)

  // Oversized face, soft scalloped beard, smiling eyes and an open smile.
  const headStart = parts.length
  oval([-1, 7.3, 0.15], [1.09, 1.12, 0.9], skin, 0, 0.8)
  add(new THREE.SphereGeometry(1, 24, 18, 0, Math.PI), skin, [-1, 7.3, 0.15], [1.09, 1.12, 0.9], 0, 5)
  parts[parts.length - 1].sampleOnly = true
  for (const side of [-1, 1]) {
    oval([-1 + side * 1.02, 7.22, 0.2], [0.23, 0.34, 0.25], skin)
    oval([-1 + side * 0.68, 7.14, 0.91], [0.29, 0.22, 0.14], '#f3a58e', 0, 2)
  }
  oval([-1, 6.33, 0.64], [1.21, 0.99, 0.68], white, 0, 0.8)
  add(new THREE.SphereGeometry(1, 24, 18, 0, Math.PI), white, [-1, 6.33, 0.64], [1.21, 0.99, 0.68], 0, 3.5)
  parts[parts.length - 1].sampleOnly = true
  for (let i = 0; i < 7; i += 1) {
    const angle = i / 6 * Math.PI
    oval([-1 + Math.cos(angle) * 0.93, 6.66 - Math.sin(angle) * 0.8, 0.98],
      [0.39, 0.44, 0.29], i % 2 ? '#f1e9dc' : white, Math.cos(angle) * 0.2, 1.5)
  }
  oval([-1, 6.95, 1.3], [0.34, 0.24, 0.1], '#7b2430', 0, 6)
  oval([-0.98, 6.83, 1.39], [0.22, 0.095, 0.035], '#fa746b', 0, 5)
  for (const side of [-1, 1]) {
    const eye = -1 + side * 0.4
    tube([[eye - 0.13, 7.49, 1.01], [eye, 7.61, 1.05], [eye + 0.13, 7.49, 1.01]], 0.055, dark, 0.047, 12)
    tube([[-1 + side * 0.21, 7.88, 0.9], [-1 + side * 0.43, 7.98, 0.91], [-1 + side * 0.68, 7.9, 0.82]], 0.09, white, 0.055, 5)
    oval([-1 + side * 0.36, 7.22, 1.24], [0.49, 0.2, 0.18], white, side * 0.25, 2.8)
  }
  oval([-1, 7.3, 1.26], [0.24, 0.19, 0.23], '#f79b6a', 0, 5)
  tube([[-1, 8.15, 0.03], [-1.22, 9.12, 0], [-1.92, 9.66, 0.02], [-2.58, 9.23, 0.05], [-2.8, 8.7, 0.12]], 1.05, red, 0.025)
  ring([-1, 8.17, 0.13], 1.07, 0.23, white, [1.03, 1, 0.85])
  oval([-2.82, 8.63, 0.12], [0.36, 0.39, 0.36], white, 0, 2)
  for (let i = headStart; i < parts.length; i += 1) {
    parts[i].geometry.translate(1, -7.2, -0.1).scale(1.18, 1.08, 1.1).translate(-1, 7.35, 0.1)
  }

  const gift = (at: Point, dimensions: Point, paper: string, ribbon: string) => {
    const [x, y, z] = at, [w, h, d] = dimensions
    box(at, dimensions, paper, 0.9)
    box([x, y, z], [w * 0.18, h + 0.04, d + 0.045], ribbon, 2)
    box([x, y, z], [w + 0.045, h * 0.18, d + 0.055], ribbon, 2)
    const top = y + h / 2
    for (const side of [-1, 1]) tube([[x, top + 0.06, z], [x + side * 0.35, top + 0.38, z], [x + side * 0.52, top + 0.12, z], [x, top + 0.04, z]], 0.075, ribbon, 0.06, 2)
    oval([x, top + 0.1, z], [0.14, 0.12, 0.13], ribbon, 0, 2)
  }
  gift([2.25, 5.1, -0.22], [1.45, 1.65, 1.23], '#16a06b', red)
  gift([1.18, 4.35, 0.93], [1.12, 1.18, 0.85], '#f6ba39', '#168fcb')
  gift([3.05, 4.15, 0.82], [0.92, 1.12, 0.84], red, gold)

  // A red sleigh with a dipping seat rail, ivory-gold scrolls and paired runners.
  const side = new THREE.Shape()
  side.moveTo(-4.02, 3.62)
  side.bezierCurveTo(-4.34, 4.42, -3.0, 4.53, -2.66, 3.52)
  side.bezierCurveTo(-2.05, 1.96, -0.7, 1.93, 0.18, 2.67)
  side.bezierCurveTo(1.0, 3.33, 1.2, 4.06, 2.03, 4.19)
  side.bezierCurveTo(2.77, 4.33, 3.47, 4.3, 3.94, 4.13)
  side.bezierCurveTo(4.73, 3.65, 4.62, 1.42, 3.7, 1.03)
  side.bezierCurveTo(1.88, 0.57, -1.9, 0.62, -3.39, 1.02)
  side.bezierCurveTo(-4.03, 1.42, -3.73, 2.78, -4.02, 3.62)
  const shell = new THREE.ExtrudeGeometry(side, { depth: 2.7, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3, steps: 1, curveSegments: 20 })
  add(shell, red, [0, 0, -1.35], [1, 1, 1], 0, 0.62)
  for (const z of [-1.52, 1.52]) {
    tube([[-3.94, 3.64, z], [-3.72, 4.15, z], [-3.15, 4.1, z], [-2.67, 3.51, z], [-1.93, 2.41, z], [-0.86, 2.29, z], [0.18, 2.75, z], [1.27, 3.94, z], [2.02, 4.2, z], [3.55, 4.2, z]], 0.16, ivory, 0.15, 2.5)
    tube([[-3.43, 1.05, z], [-1.5, 0.78, z], [1.5, 0.78, z], [3.7, 1.07, z]], 0.12, gold, 0.12, 2)
    tube([[-3.95, 0.03, z * 0.8], [-3.85, -0.44, z * 0.8], [-2.5, -0.61, z * 0.8], [1.6, -0.61, z * 0.8], [3.86, -0.38, z * 0.8], [4.62, 0.17, z * 0.8], [4.72, 1.11, z * 0.8], [4.25, 1.65, z * 0.8], [3.89, 1.3, z * 0.8]], 0.17, ivory, 0.13, 2.5)
    for (const x of [-2.55, -0.55, 1.6]) tube([[x, 0.93, z * 0.8], [x - 0.12, 0.35, z * 0.8], [x + 0.2, 0.01, z * 0.8], [x + 0.43, 0.3, z * 0.8], [x + 0.15, 0.53, z * 0.8]], 0.12, gold, 0.1, 2)
    tube([[2.72, 4.19, z], [2.26, 4.21, z], [1.89, 3.96, z], [1.98, 3.55, z], [2.37, 3.51, z], [2.49, 3.8, z], [2.27, 3.91, z]], 0.17, ivory, 0.11, 2.5)
  }
  const star = (x: number, y: number, radius: number, z: number) => {
    const shape = new THREE.Shape()
    for (let i = 0; i < 10; i += 1) {
      const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * 0.43 : radius
      const sx = Math.cos(a) * r, sy = Math.sin(a) * r
      if (i === 0) shape.moveTo(sx, sy)
      else shape.lineTo(sx, sy)
    }
    shape.closePath()
    add(new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false }), white, [x, y, z], [1, 1, 1], 0, 5)
  }
  for (const z of [-1.52, 1.52]) {
    star(-3.15, 2.75, 0.3, z)
    star(-1.83, 1.66, 0.22, z)
    star(-0.1, 1.6, 0.28, z)
    star(1.55, 2.51, 0.32, z)
    star(3.35, 2.65, 0.24, z)
  }
  return parts
}

export function fillSanta(count: number, positions: Float32Array, colors: Float32Array) {
  sample(createSantaSleigh(), count, positions, colors)
}
