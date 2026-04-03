/** 绿叶粒子：动态加载 canvas-confetti，未安装依赖时静默跳过 */

export async function playLeafConfetti(
  anchor?: HTMLElement | null,
): Promise<void> {
  let confetti: (opts?: Record<string, unknown>) => void
  try {
    /** 经 unknown 断言：库实际签名为 Promise<undefined>|null 等，与自写 ConfettiFn 不重叠 */
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
  let y = 0.35
  if (anchor && typeof anchor.getBoundingClientRect === 'function') {
    const r = anchor.getBoundingClientRect()
    x = (r.left + r.width / 2) / window.innerWidth
    y = (r.top + r.height / 2) / window.innerHeight
  }
  void confetti({
    particleCount: 72,
    spread: 64,
    startVelocity: 28,
    origin: { x, y },
    colors: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#166534'],
    ticks: 120,
    scalar: 0.9,
  })
}
