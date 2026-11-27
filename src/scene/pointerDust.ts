export function createPointerDust(count: number) {
  return {
    x: new Float32Array(count), y: new Float32Array(count),
    vx: new Float32Array(count), vy: new Float32Array(count),
    age: new Float32Array(count).fill(10), life: new Float32Array(count),
    size: new Float32Array(count), width: new Float32Array(count),
    position: new Float32Array(count * 3), alpha: new Float32Array(count),
    angle: new Float32Array(count), tint: new Float32Array(count),
    cursor: 0, carry: 0, idle: 0, smoothX: 0, smoothY: 0, fresh: true,
  }
}

/** Distance sampling keeps the path continuous at both low and high frame rates. */
export function stepPointerDust(dust: ReturnType<typeof createPointerDust>,
  pointer: { x: number; y: number; active: boolean }, delta: number,
  width: number, height: number, enabled: boolean, random = Math.random) {
  const dt = Math.min(Math.max(delta, 0), 0.1)
  const count = dust.x.length
  for (let i = 0; i < count; i += 1) {
    dust.age[i] = enabled ? dust.age[i] + Math.max(0, Math.min(delta, 1)) : dust.life[i]
  }
  const emit = (x: number, y: number, angle: number, moving: boolean, age = 0) => {
    const i = dust.cursor++ % count
    const direction = random() * Math.PI * 2
    dust.x[i] = x + (random() - 0.5) * (moving ? 0.35 : 1.2)
    dust.y[i] = y + (random() - 0.5) * (moving ? 0.35 : 1.2)
    dust.vx[i] = Math.cos(direction) * 1.5
    dust.vy[i] = Math.sin(direction) * 1.5
    dust.age[i] = age
    dust.life[i] = (moving ? 0.25 : 0.18) + random() * 0.14
    dust.size[i] = moving ? 5.5 + random() * 1.5 : 2.4 + random() * 0.8
    dust.width[i] = moving ? 0.035 : 0.1
    dust.angle[i] = angle
    dust.tint[i] = random()
  }
  if (enabled && pointer.active) {
    if (dust.fresh) {
      dust.smoothX = pointer.x; dust.smoothY = pointer.y
      dust.carry = 0; dust.idle = 0; dust.fresh = false
    }
    const previousX = dust.smoothX, previousY = dust.smoothY
    const ease = 1 - Math.exp(-dt / 0.025)
    dust.smoothX += (pointer.x - dust.smoothX) * ease
    dust.smoothY += (pointer.y - dust.smoothY) * ease
    const dx = dust.smoothX - previousX, dy = dust.smoothY - previousY
    const distance = Math.hypot(dx, dy)
    const spacing = 2.5
    if (distance > 0.05) {
      const angle = Math.atan2(-dy, dx)
      const samples = Math.min(count, Math.floor((dust.carry + distance) / spacing))
      for (let n = 0; n < samples; n += 1) {
        const t = Math.min(1, (spacing - dust.carry + n * spacing) / distance)
        emit(previousX + dx * t, previousY + dy * t, angle, true, (1 - t) * dt)
      }
      dust.carry = (dust.carry + distance) % spacing
      dust.idle = 0
    } else {
      dust.idle += dt
      if (dust.idle >= 0.16) {
        emit(dust.smoothX, dust.smoothY, random() * Math.PI * 2, false)
        dust.idle %= 0.16
      }
    }
  } else {
    dust.fresh = true; dust.carry = 0; dust.idle = 0
  }
  for (let i = 0; i < count; i += 1) {
    if (!enabled || dust.age[i] >= dust.life[i]) { dust.alpha[i] = 0; continue }
    const fade = 1 - dust.age[i] / dust.life[i]
    dust.x[i] += dust.vx[i] * dt; dust.y[i] += dust.vy[i] * dt
    dust.position[i * 3] = dust.x[i] / Math.max(1, width) * 2 - 1
    dust.position[i * 3 + 1] = 1 - dust.y[i] / Math.max(1, height) * 2
    dust.alpha[i] = fade * fade * 0.65
  }
}
