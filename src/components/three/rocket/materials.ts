import { useMemo } from 'react'
import * as THREE from 'three'
import { quality } from '../../../utils/sim'

/** Textura radial suave reutilizada por névoa/drops e halos. */
export function makeSoftRadialTexture(inner: string, outer: string): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, inner)
  grad.addColorStop(1, outer)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Materiais do Ícaro, construídos uma vez. Arte: o foguete é uma garrafa PET
 * artesanal — plástico transparente, água azul, cone preto fosco, aletas de
 * papelão off-white e fita azul. O dourado é acento de marca (nunca fogo).
 */
export function useRocketMaterials() {
  return useMemo(() => {
    const pet = new THREE.MeshPhysicalMaterial({
      color: '#cde8f7',
      transparent: true,
      opacity: 0.85,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 0.9,
      clearcoatRoughness: 0.15,
      envMapIntensity: 0.6,
      side: THREE.FrontSide,
      depthWrite: false,
    })
    const water = new THREE.MeshPhysicalMaterial({
      color: '#2f8fe8',
      transparent: true,
      opacity: 0.9,
      roughness: 0.08,
      metalness: 0,
      emissive: '#1558b8',
      emissiveIntensity: 0.28,
      depthWrite: false,
      envMapIntensity: 0.5,
    })
    const waterSkin = new THREE.MeshStandardMaterial({
      color: '#1f6ec8',
      roughness: 0.2,
      metalness: 0,
      emissive: '#10294e',
      emissiveIntensity: 0.3,
      envMapIntensity: 0.3,
    })
    const tape = new THREE.MeshStandardMaterial({
      color: '#1e52b4',
      roughness: 0.5,
      metalness: 0,
      envMapIntensity: 0.3,
    })
    const blue = new THREE.MeshStandardMaterial({
      color: '#3580d8',
      transparent: true,
      opacity: 0.85,
      roughness: 0.4,
      metalness: 0,
      envMapIntensity: 0.5,
      side: THREE.FrontSide,
      depthWrite: false,
    })
    const cone = new THREE.MeshStandardMaterial({
      color: '#1a1b20',
      roughness: 0.7,
      metalness: 0,
      flatShading: true,
      envMapIntensity: 0.3,
    })
    const fin = new THREE.MeshStandardMaterial({
      color: '#edeff3',
      roughness: 0.85,
      metalness: 0,
      envMapIntensity: 0.25,
    })
    const nozzle = new THREE.MeshStandardMaterial({
      color: '#3c7ecb',
      roughness: 0.55,
      metalness: 0,
      envMapIntensity: 0.4,
    })
    const jet = new THREE.MeshBasicMaterial({
      color: '#dceeff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const mist = new THREE.SpriteMaterial({
      color: '#bfe3ff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: makeSoftRadialTexture('#ffffff', 'rgba(255,255,255,0)'),
    })
    const droplets = new THREE.PointsMaterial({
      color: '#eaf6ff',
      size: 0.05,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    return { pet, water, waterSkin, blue, tape, cone, fin, nozzle, jet, mist, droplets }
  }, [])
}

export type RocketMaterials = ReturnType<typeof useRocketMaterials>

/** Contagem de gotas do jato respeitando o perfil de performance. */
export function dropletCount(): number {
  return quality.isMobile ? 120 : 220
}