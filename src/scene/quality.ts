export type QualityTier = 'lite' | 'phone' | 'tablet' | 'desktop'

export type QualityProfile = {
  tier: QualityTier
  dprMax: number
  multisampling: number
  bloomLevels: number
  bloomIntensity: number
  bloomThreshold: number
  particles: number
  ribbons: number
  ground: number
  falling: number
  stars: number
  ornaments: number
  particleSize: number
}

const PROFILES: Record<QualityTier, QualityProfile> = {
  lite: {
    tier: 'lite',
    dprMax: 1,
    multisampling: 0,
    bloomLevels: 4,
    bloomIntensity: 0.38,
    bloomThreshold: 0.46,
    particles: 10000,
    ribbons: 900,
    ground: 4000,
    falling: 480,
    stars: 900,
    ornaments: 12,
    particleSize: 0.044,
  },
  phone: {
    tier: 'phone',
    dprMax: 1.15,
    multisampling: 0,
    bloomLevels: 4,
    bloomIntensity: 0.38,
    bloomThreshold: 0.48,
    particles: 10000,
    ribbons: 800,
    ground: 4000,
    falling: 420,
    stars: 800,
    ornaments: 10,
    particleSize: 0.044,
  },
  tablet: {
    tier: 'tablet',
    dprMax: 1.35,
    multisampling: 0,
    bloomLevels: 5,
    bloomIntensity: 0.44,
    bloomThreshold: 0.42,
    particles: 18000,
    ribbons: 1500,
    ground: 6500,
    falling: 480,
    stars: 1400,
    ornaments: 18,
    particleSize: 0.032,
  },
  desktop: {
    tier: 'desktop',
    dprMax: 1.5,
    multisampling: 0,
    bloomLevels: 6,
    bloomIntensity: 0.48,
    bloomThreshold: 0.38,
    particles: 28000,
    ribbons: 2400,
    ground: 9500,
    falling: 700,
    stars: 2000,
    ornaments: 24,
    particleSize: 0.026,
  },
}

function rendererName() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    if (!gl) return ''
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    const lose = gl.getExtension('WEBGL_lose_context')
    lose?.loseContext()
    return name
  } catch {
    return ''
  }
}

function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'desktop'
  if (/swiftshader|llvmpipe|softpipe|software/i.test(rendererName())) return 'lite'
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
