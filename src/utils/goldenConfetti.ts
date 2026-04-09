/** 埋下时间胶囊成功：金色碎屑（canvas-confetti） */

export async function playGoldenCapsuleConfetti(
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
  let y = 0.42
  if (anchor && typeof anchor.getBoundingClientRect === 'function') {
    const r = anchor.getBoundingClientRect()
    x = (r.left + r.width / 2) / window.innerWidth
    y = (r.top + r.height / 2) / window.innerHeight
  }
  void confetti({
    particleCount: 88,
    spread: 72,
    startVelocity: 38,
    origin: { x, y },
    colors: [
      '#fbbf24',
      '#fcd34d',
      '#fde68a',
      '#f59e0b',
      '#fff7ed',
      '#d97706',
    ],
    ticks: 160,
    scalar: 1.05,
    gravity: 0.95,
  })
}
