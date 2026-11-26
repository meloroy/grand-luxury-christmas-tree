import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { getTreeData } from './buildTree'
import { WEIGHT } from './constants'
import { Instances } from './Instances'
import { lightFragment, lightVertex } from './shaders'

export function Ornaments() {
  const data = useMemo(() => getTreeData(), [])
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 22, 16), [])
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const clump = useMemo(() => new THREE.IcosahedronGeometry(1, 0), [])
  const lightSphere = useMemo(() => {
    const geometry = new THREE.SphereGeometry(1, 10, 8)
    geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(data.lights.color, 3))
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(data.lights.seed, 1))
    return geometry
  }, [data.lights.color, data.lights.seed])

  const chromeMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        metalness: 1,
        roughness: 0.16,
        clearcoat: 0.55,
        clearcoatRoughness: 0.22,
        envMapIntensity: 1.15,
      }),
    [],
  )
  const jewelMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        metalness: 0.22,
        roughness: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 0.7,
      }),
    [],
  )
  const paperMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.74,
        metalness: 0.04,
      }),
    [],
  )
  const metalGiftMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        metalness: 0.92,
        roughness: 0.24,
        envMapIntensity: 1.05,
      }),
    [],
  )
  const ribbonMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#d5dee6',
        metalness: 1,
        roughness: 0.28,
        envMapIntensity: 1.1,
      }),
    [],
  )
  const capMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e7eef3',
        roughness: 0.92,
        metalness: 0.02,
      }),
    [],
  )
  const clumpMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e4ebf1',
        roughness: 1,
        metalness: 0,
      }),
    [],
  )
  const lightMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: lightVertex,
        fragmentShader: lightFragment,
        toneMapped: false,
      }),
    [],
  )

  useFrame(({ clock }) => {
    lightMaterial.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <>
      <Instances
        geometry={sphere}
        material={chromeMaterial}
        data={data.chrome}
        motion="bauble"
        weight={WEIGHT.bauble}
        colorize
      />
      <Instances
        geometry={sphere}
        material={jewelMaterial}
        data={data.jewel}
        motion="bauble"
        weight={WEIGHT.bauble}
        colorize
      />
      <Instances
        geometry={sphere}
        material={capMaterial}
        data={data.snowCaps}
        motion="bauble"
        weight={WEIGHT.bauble}
      />
      <Instances
        geometry={box}
        material={paperMaterial}
        data={data.paperGifts}
        motion="gift"
        weight={WEIGHT.gift}
        colorize
      />
      <Instances
        geometry={box}
        material={metalGiftMaterial}
        data={data.metalGifts}
        motion="gift"
        weight={WEIGHT.gift}
        colorize
      />
      <Instances geometry={box} material={ribbonMaterial} data={data.ribbons} motion="gift" weight={WEIGHT.gift} />
      <Instances
        geometry={clump}
        material={clumpMaterial}
        data={data.clumps}
        motion="snow"
        weight={WEIGHT.snow}
      />
      <LightField geometry={lightSphere} material={lightMaterial} />
    </>
  )
}

function LightField({ geometry, material }: { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial }) {
  const data = useMemo(() => getTreeData().lights, [])
  return (
    <Instances geometry={geometry} material={material} data={data} motion="light" weight={WEIGHT.light} />
  )
}
