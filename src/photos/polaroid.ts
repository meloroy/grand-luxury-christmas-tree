import * as THREE from 'three'

export const FOCUS_PHOTO_SCALE = 4.5
export const CAPTION_LIMIT = 36

export function photoAspect(image: unknown) {
  const source = image as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number } | undefined
  const width = source?.naturalWidth || source?.width || 1
  const height = source?.naturalHeight || source?.height || 1
  return width > 0 && height > 0 ? width / height : 1
}

/** Paper grows around the photograph; its pixels and aspect ratio are never cropped. */
export function polaroidLayout(aspect: number) {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1
  const width = Math.min(1.12, 1.32 * ratio), height = width / ratio
  const border = 0.06, bottom = 0.26
  return {
    width, height, frameWidth: width + border * 2, frameHeight: height + border + bottom,
    imageY: (bottom - border) / 2, bottom, thickness: 0.024, clipOverhang: 0.18,
  }
}

export function paperTexture(wood = false) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = wood ? '#b58a56' : '#e8ddc6'
  ctx.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 650; i += 1) {
    const x = (i * 47.13) % 128, y = (i * 73.37) % 128
    ctx.fillStyle = wood ? `rgba(89,52,23,${0.04 + i % 5 * 0.02})` : `rgba(93,72,43,${0.025 + i % 4 * 0.008})`
    ctx.fillRect(x, y, wood ? 0.6 : 0.7, wood ? 8 + i % 24 : 0.7)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function captionTexture(month: string, caption: string, frameWidth: number, bottom: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = Math.max(96, Math.round(512 * (bottom - 0.035) / (frameWidth - 0.04)))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#5d4d39'
  ctx.textBaseline = 'top'
  const size = canvas.height * 0.24
  ctx.font = `${Math.round(size * 0.73)}px "Songti SC", "SimSun", serif`
  ctx.fillText(month, 20, canvas.height * 0.05)
  ctx.fillStyle = '#30271d'
  ctx.font = `600 ${Math.round(size)}px "KaiTi", "STKaiti", "Kaiti SC", serif`
  let line = '', row = 0
  const chars = Array.from(caption.replace(/\s+/g, ' '))
  for (let i = 0; i < chars.length; i += 1) {
    if (ctx.measureText(line + chars[i]).width > 472) {
      ctx.fillText(line, 20, canvas.height * 0.31 + row * size * 1.18)
      line = ''; row += 1
      if (row > 1) break
    }
    line += chars[i]
    if (row === 1 && i < chars.length - 1 && ctx.measureText(line + chars[i + 1] + '…').width > 472) {
      line += '…'; break
    }
  }
  if (row <= 1) ctx.fillText(line, 20, canvas.height * 0.31 + row * size * 1.18)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
