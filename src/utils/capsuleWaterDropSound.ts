/**
 * 轻量「水滴」提示音（Web Audio，无静态资源依赖）
 * 需在用户手势之后调用，否则部分浏览器会静音。
 */
export function playCapsuleWaterDropSound(): void {
  if (typeof window === 'undefined') {
    return
  }
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AC) {
    return
  }
  try {
    const ctx = new AC()
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.07)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.18)
    osc.onended = () => {
      void ctx.close()
    }
  } catch {
    /* 忽略自动播放或环境限制 */
  }
}
