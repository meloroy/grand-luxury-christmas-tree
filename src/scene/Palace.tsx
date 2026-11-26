import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getTreeData } from './buildTree'
import { PEDESTAL_TOP } from './constants'
import { frameMotion } from './motion'

function createStarGeometry() {
  const shape = new THREE.Shape()
  const points = 5
  const outer = 0.72
  const inner = 0.3
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.028,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 1,
  })
  geometry.center()
  return geometry
}

function createDustTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.clearRect(0, 0, 512, 512)
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const radius = Math.random() * 1.8 + 0.3
    ctx.fillStyle = `rgba(236, 242, 246, ${0.15 + Math.random() * 0.55})`
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function Palace() {
  const dust = useMemo(() => createDustTexture(), [])
  return (
    <>
      <SceneLights />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <circleGeometry args={[13, 64]} />
        <meshStandardMaterial color="#050c0a" roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[7.2, 80]} />
        <meshPhysicalMaterial
          color="#0b1915"
          metalness={0.38}
          roughness={0.38}
          clearcoat={0.45}
          clearcoatRoughness={0.42}
          envMapIntensity={0.32}
        />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[2.15, 2.55, 0.4, 64]} />
        <meshPhysicalMaterial color="#0c1c17" metalness={0.62} roughness={0.32} envMapIntensity={0.7} />
      </mesh>
      <mesh position={[0, PEDESTAL_TOP, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.16, 0.025, 12, 80]} />
        <meshPhysicalMaterial color="#d5dee8" metalness={1} roughness={0.22} />
      </mesh>
      {dust && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, PEDESTAL_TOP + 0.01, 0]}>
          <circleGeometry args={[2.05, 48]} />
          <meshStandardMaterial map={dust} transparent opacity={0.55} roughness={1} color="#f4f7fa" />
        </mesh>
      )}
      <Trunk />
      <Star />
    </>
  )
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.18} color="#b7c6d2" />
      <directionalLight position={[7, 16, 6]} intensity={1.25} color="#f4f7fb" />
      <directionalLight position={[-6, 7, -4]} intensity={0.35} color="#9eb4c4" />
      <pointLight position={[0, 3.8, 1.1]} intensity={6} distance={11} decay={2} color="#e7f1f8" />
      <pointLight position={[0, 6.3, -0.3]} intensity={3.2} distance={6.5} decay={2} color="#d5e6f2" />
      <pointLight position={[0, 1.8, 0.2]} intensity={1.4} distance={4.5} decay={2} color="#145c48" />
    </>
  )
}

function Trunk() {
  const ref = useRef<THREE.Mesh>(null)
  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.12, 0.24, 0.7, 12)
    geo.translate(0, 0.35, 0)
    return geo
  }, [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#141c19',
        roughness: 0.86,
        metalness: 0.06,
        transparent: true,
        opacity: 1,
      }),
    [],
  )

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const t = frameMotion.needle
    const scale = 0.04 + 0.96 * THREE.MathUtils.smoothstep(t, 0.1, 0.8)
    mesh.scale.set(scale, scale, scale)
    material.opacity = THREE.MathUtils.smoothstep(t, 0.05, 0.55)
  })

  return <mesh ref={ref} geometry={geometry} material={material} position={[0, PEDESTAL_TOP, 0]} />
}

function Star() {
  const group = useRef<THREE.Group>(null)
  const data = useMemo(() => getTreeData(), [])
  const geometry = useMemo(() => createStarGeometry(), [])
  const spin = useMemo(() => new THREE.Quaternion(), [])
  const metal = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#d7e1ea',
        metalness: 1,
        roughness: 0.18,
        clearcoat: 0.7,
        clearcoatRoughness: 0.16,
        envMapIntensity: 1.25,
        emissive: '#c9d7e4',
        emissiveIntensity: 0.28,
      }),
    [],
  )
  const core = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#05080a',
        emissive: '#eef3f8',
        emissiveIntensity: 1.35,
        toneMapped: false,
      }),
    [],
  )

  useFrame(({ clock }) => {
    const node = group.current
    if (!node) return
    const progress = frameMotion.star
    const linear = THREE.MathUtils.smoothstep(progress, 0.04, 0.9)
    const t = linear * linear * (3 - 2 * linear)
    const thrust = Math.sin(Math.PI * t) * 0.5
    node.position.lerpVectors(data.starChaos, data.starTarget, t)
    node.position.y += thrust
    const drift = (1 - t) * 0.18
    node.position.x += Math.sin(clock.elapsedTime * 0.45) * drift
    node.position.z += Math.cos(clock.elapsedTime * 0.37) * drift
    spin.copy(data.starChaosQuat).slerp(data.starTargetQuat, t)
    node.quaternion.copy(spin)
    core.emissiveIntensity = 1.25 + Math.sin(clock.elapsedTime * 1.5) * 0.18
  })

  return (
    <group ref={group} scale={1.35}>
      <mesh geometry={geometry} material={metal} />
      <mesh material={core}>
        <sphereGeometry args={[0.07, 16, 12]} />
      </mesh>
    </group>
  )
}
