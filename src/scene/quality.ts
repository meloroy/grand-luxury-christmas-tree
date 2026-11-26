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
    bloomIntensity: 0.55,
    bloomThreshold: 0.46,
    particles: 16000,
    ribbons: 2200,
    ground: 4000,
    falling: 480,
    stars: 900,
    ornaments: 12,
    particleSize: 0.074,
  },
  phone: {
    tier: 'phone',
    dprMax: 1.15,
    multisampling: 0,
    bloomLevels: 4,
    bloomIntensity: 0.5,
    bloomThreshold: 0.48,
    particles: 14000,
    ribbons: 1800,
    ground: 4000,
    falling: 420,
    stars: 800,
    ornaments: 10,
    particleSize: 0.08,
  },
  tablet: {
    tier: 'tablet',
    dprMax: 1.35,
    multisampling: 0,
    bloomLevels: 5,
    bloomIntensity: 0.68,
    bloomThreshold: 0.42,
    particles: 28000,
    ribbons: 4200,
    ground: 8000,
    falling: 900,
    stars: 1400,
    ornaments: 18,
    particleSize: 0.058,
  },
  desktop: {
    tier: 'desktop',
    dprMax: 1.5,
    multisampling: 0,
    bloomLevels: 6,
    bloomIntensity: 0.82,
    bloomThreshold: 0.38,
    particles: 50000,
    ribbons: 8000,
    ground: 15000,
    falling: 1600,
    stars: 2000,
    ornaments: 24,
    particleSize: 0.046,
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
