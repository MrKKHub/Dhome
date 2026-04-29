/**
 * 首页顶区落叶：统一为「掌状枫叶」轮廓（贝塞尔闭合，非折线星形）+ 随机绿/黄/暖橙。
 */

/** 枫叶外轮廓 + 主脉（viewBox 0 0 24 24）：上三隆缘、腰侧略收、下接柄意 */
export const MAPLE_LEAF_PATHS = {
  main:
    'M12 22.6 L11.35 19.15 C8.05 18.35 5.35 14.85 6.05 10.95 C6.45 8.35 8.55 6.35 10.75 5.55 C10.15 4.05 10.85 2.55 12 1.95 C13.15 2.55 13.85 4.05 13.25 5.55 C15.45 6.35 17.55 8.35 17.95 10.95 C18.65 14.85 15.95 18.35 12.65 19.15 Z',
  /** 主脉：自上端附近垂至叶基 */
  extra: 'M12 3.2 L12 21.8',
} as const

const PALETTE = {
  green: ['#5E9C6E', '#6BA87A', '#4A8C5C', '#7CB883'],
  yellow: ['#DCCB5E', '#E8D060', '#C4B445', '#F0E080'],
  orange: ['#FF9A4A', '#FFB347', '#E88A3C', '#F4A460'],
} as const

type Tone = keyof typeof PALETTE

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function randomTone(): Tone {
  const tones: Tone[] = ['green', 'yellow', 'orange']
  return pick(tones)
}

/** 同色系略浅，用于渐变终点 */
function soften(hex: string): string {
  const n = hex.replace('#', '')
  if (n.length !== 6) {
    return hex
  }
  const r = Math.min(255, parseInt(n.slice(0, 2), 16) + 28)
  const g = Math.min(255, parseInt(n.slice(2, 4), 16) + 24)
  const b = Math.min(255, parseInt(n.slice(4, 6), 16) + 18)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export type LeafVisualPick = {
  stroke: string
  strokeSoft: string
  /** 呼吸峰值透明度 0.2–0.4 */
  plateauOpacity: number
}

/**
 * 随机配色（绿 / 黄 / 暖橙）+ 峰值透明度；形态固定为枫叶路径 MAPLE_LEAF_PATHS。
 */
export function pickLeafVisual(): LeafVisualPick {
  const tone = randomTone()
  const stroke = pick(PALETTE[tone])
  return {
    stroke,
    strokeSoft: soften(stroke),
    plateauOpacity: Number((0.2 + Math.random() * 0.2).toFixed(2)),
  }
}
