export type QualityTier = 'phone' | 'tablet' | 'desktop'

export type QualityProfile = {
  tier: QualityTier
  dprMax: number
  multisampling: number
  bloomLevels: number
  foliage: number
  settledSnow: number
  fallingSnow: number
  chrome: number
  jewel: number
  paperGifts: number
  metalGifts: number
  lights: number
  polaroids: number
  clumps: number
  sphereWidthSegments: number
  sphereHeightSegments: number
}

const PROFILES: Record<QualityTier, QualityProfile> = {
  phone: {
    tier: 'phone',
    dprMax: 1.25,
    multisampling: 0,
    bloomLevels: 5,
    foliage: 7000,
    settledSnow: 560,
    fallingSnow: 360,
    chrome: 42,
    jewel: 30,
    paperGifts: 10,
    metalGifts: 4,
    lights: 96,
    polaroids: 16,
    clumps: 24,
    sphereWidthSegments: 14,
    sphereHeightSegments: 10,
  },
  tablet: {
    tier: 'tablet',
    dprMax: 1.5,
    multisampling: 0,
    bloomLevels: 6,
    foliage: 10000,
    settledSnow: 860,
    fallingSnow: 560,
    chrome: 60,
    jewel: 44,
    paperGifts: 12,
    metalGifts: 5,
    lights: 140,
    polaroids: 24,
    clumps: 36,
    sphereWidthSegments: 18,
    sphereHeightSegments: 12,
  },
  desktop: {
    tier: 'desktop',
    dprMax: 1.6,
    multisampling: 4,
    bloomLevels: 8,
    foliage: 14500,
    settledSnow: 1300,
    fallingSnow: 820,
    chrome: 84,
    jewel: 62,
    paperGifts: 16,
    metalGifts: 6,
    lights: 200,
    polaroids: 32,
    clumps: 52,
    sphereWidthSegments: 22,
    sphereHeightSegments: 16,
  },
}

function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'desktop'
  const shortSide = Math.min(window.innerWidth, window.innerHeight)
  const touch = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches
  if (shortSide <= 540) return 'phone'
  if (touch && shortSide <= 900) return 'tablet'
  return 'desktop'
}

let profile: QualityProfile | null = null

export function getQuality() {
  if (!profile) profile = PROFILES[detectTier()]
  return profile
}

/** Distance and fov that keep the formed tree inside the viewport. Desktop stays at radius 20. */
export function fitView(width: number, height: number) {
  const aspect = width / Math.max(height, 1)
  const portrait = aspect < 0.95
  const shortLandscape = height < 520 && aspect > 1.15
  const fov = portrait ? 50 : shortLandscape ? 42 : 40
  const half = Math.tan((fov * Math.PI) / 360)
  const fitHalfWidth = portrait ? 5.6 : 6.6
  const needed = fitHalfWidth / (half * Math.max(aspect, 0.32))
  const radius = Math.min(40, Math.max(20, needed))
  return { fov, radius }
}
