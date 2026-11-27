export const MORPH_BURST = 0.65
export const MORPH_DURATION = 2.3

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

export function scatterAmount(elapsed: number) {
  return elapsed < MORPH_BURST
    ? smooth(elapsed / MORPH_BURST)
    : 1 - smooth((elapsed - MORPH_BURST) / (MORPH_DURATION - MORPH_BURST))
}
