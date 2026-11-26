export const revealCtrl = {
  duration: 3.2,
  t: 1,
  armed: false,
  startedAt: 0,
}

export function requestReveal(duration: number) {
  revealCtrl.duration = duration
  revealCtrl.t = 0
  revealCtrl.armed = true
  revealCtrl.startedAt = 0
}
