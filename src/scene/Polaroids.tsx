import { useMemo } from 'react'
import * as THREE from 'three'
import { createPolaroidAtlas } from '../textures/polaroidAtlas'
import { getTreeData } from './buildTree'
import { WEIGHT } from './constants'
import { Instances } from './Instances'
import { photoFragment, photoVertex } from './shaders'

export function Polaroids() {
  const data = useMemo(() => getTreeData(), [])
  const atlas = useMemo(() => createPolaroidAtlas(), [])

  const card = useMemo(() => new THREE.PlaneGeometry(1, 1.18), [])
  const liner = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(0.86, 0.86)
    geometry.translate(0, 0.1, 0.008)
    return geometry
  }, [])
  const photo = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(0.78, 0.78)
    geometry.translate(0, 0.1, 0.016)
    const count = data.polaroids.count
    const offset = new Float32Array(count * 2)
    const scale = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      offset[i * 2] = data.photoUv[i * 4]
      offset[i * 2 + 1] = data.photoUv[i * 4 + 1]
      scale[i * 2] = data.photoUv[i * 4 + 2]
      scale[i * 2 + 1] = data.photoUv[i * 4 + 3]
    }
    geometry.setAttribute('aUvOffset', new THREE.InstancedBufferAttribute(offset, 2))
    geometry.setAttribute('aUvScale', new THREE.InstancedBufferAttribute(scale, 2))
    return geometry
  }, [data.photoUv, data.polaroids.count])

  const cardMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e6edf2',
        roughness: 0.62,
        metalness: 0.04,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const linerMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#d5dee8',
        metalness: 1,
        roughness: 0.26,
        envMapIntensity: 1.15,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const photoMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uMap: { value: atlas } },
        vertexShader: photoVertex,
        fragmentShader: photoFragment,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [atlas],
  )

  return (
    <>
      <Instances
        geometry={card}
        material={cardMaterial}
        data={data.polaroids}
        motion="polaroid"
        weight={WEIGHT.polaroid}
      />
      <Instances
        geometry={liner}
        material={linerMaterial}
        data={data.polaroids}
        motion="polaroid"
        weight={WEIGHT.polaroid}
      />
      <Instances
        geometry={photo}
        material={photoMaterial}
        data={data.polaroids}
        motion="polaroid"
        weight={WEIGHT.polaroid}
      />
    </>
  )
}
