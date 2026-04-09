/** 抱抱心形粒子：从按钮位置喷出（canvas-confetti；无依赖时静默跳过） */

export async function playHugHeartConfetti(
  anchor?: HTMLElement | null,
): Promise<void> {
  let confetti: (opts?: Record<string, unknown>) => void
  try {
    const mod = (await import('canvas-confetti')) as unknown as {
      default?: (opts?: Record<string, unknown>) => void
    }
    const fn = mod.default
    if (typeof fn !== 'function') {
      return
    }
    confetti = fn
  } catch {
    return
  }
  let x = 0.5
  let y = 0.55
  if (anchor && typeof anchor.getBoundingClientRect === 'function') {
    const r = anchor.getBoundingClientRect()
    x = (r.left + r.width / 2) / window.innerWidth
    y = (r.top + r.height / 2) / window.innerHeight
  }
  const pink = ['#fda4af', '#fb7185', '#f43f5e', '#fecdd3', '#ffe4e6', '#fda5d5']
  const opts: Record<string, unknown> = {
    particleCount: 56,
    spread: 78,
    startVelocity: 36,
    origin: { x, y },
    colors: pink,
    ticks: 140,
    scalar: 1.05,
  }
  try {
    void confetti({ ...opts, shapes: ['heart'] })
  } catch {
    void confetti(opts)
  }
}
