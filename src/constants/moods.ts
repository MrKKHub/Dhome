export const MOOD_OPTIONS = [
  '浮躁',
  '小确幸',
  'emo',
  '平静',
  '期待',
  '疲惫',
] as const

export type PostMood = (typeof MOOD_OPTIONS)[number]

/** 心情标签：Tailwind 调色 + dark: 变体，避免硬编码 hex */
export const MOOD_BADGE_CLASS: Record<PostMood, string> = {
  浮躁:
    'bg-orange-100/95 text-orange-900 dark:bg-orange-950/45 dark:text-orange-100',
  小确幸:
    'bg-amber-100/95 text-amber-900 dark:bg-amber-950/45 dark:text-amber-100',
  emo: 'bg-violet-100/95 text-violet-900 dark:bg-violet-950/45 dark:text-violet-100',
  平静:
    'bg-emerald-100/95 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-100',
  期待: 'bg-pink-100/95 text-pink-900 dark:bg-pink-950/45 dark:text-pink-100',
  疲惫:
    'bg-stone-200/90 text-stone-800 dark:bg-stone-800/55 dark:text-stone-200',
}

/** 与发布/卡片一致的心情标签色；未知文案时退回中性色 */
export function resolveMoodBadgeClass(mood: string): string {
  const key = mood.trim() as PostMood
  if (MOOD_OPTIONS.includes(key)) {
    return MOOD_BADGE_CLASS[key]
  }
  return 'bg-apricot/90 text-warmInk/80 dark:bg-slate-700/60 dark:text-warmInk/90'
}

/** html2canvas 克隆文档里 Tailwind 可能不全，心情标签用内联色保证可见 */
export const MOOD_BADGE_POSTER_STYLE: Record<
  PostMood,
  { backgroundColor: string; color: string }
> = {
  浮躁: { backgroundColor: '#ffe8dc', color: '#a85a3c' },
  小确幸: { backgroundColor: '#fff4e0', color: '#9a7b2c' },
  emo: { backgroundColor: '#ede9ff', color: '#5c5299' },
  平静: { backgroundColor: '#e8f3ee', color: '#3d7565' },
  期待: { backgroundColor: '#fff0f5', color: '#a85a7a' },
  疲惫: { backgroundColor: '#eeeae6', color: '#6b5e58' },
}

/**
 * 卡片主底色（低饱和、可 transition-colors 平滑过渡）
 * 参考：平静偏灰绿感、开心偏奶油黄、忧郁偏雾蓝
 */
export const MOOD_CARD_SURFACE_COLOR: Record<PostMood, string> = {
  浮躁: '#FFF5F0',
  小确幸: '#FFFBF0',
  emo: '#EEF6FF',
  平静: '#F6F8F7',
  期待: '#FFF8F6',
  疲惫: '#F5F3EF',
}

/** 深色模式下卡片主底色（与浅色同情绪倾向、压暗） */
export const MOOD_CARD_SURFACE_COLOR_DARK: Record<PostMood, string> = {
  浮躁: '#2a2220',
  小确幸: '#2a2820',
  emo: '#22242e',
  平静: '#222825',
  期待: '#2a2225',
  疲惫: '#252422',
}

/**
 * 卡片内极淡水彩晕染层（两团模糊色块，模拟棉麻纸上的水彩）
 * 每项为 [右上主晕染 class, 左下辅晕染 class]；深色下略压低透明度
 */
export const MOOD_WATERCOLOR_LAYERS: Record<PostMood, [string, string]> = {
  浮躁: [
    'absolute -right-8 -top-6 h-36 w-36 rounded-full bg-gradient-to-bl from-orange-200/45 via-orange-100/25 to-transparent blur-3xl dark:opacity-45',
    'absolute -bottom-4 -left-6 h-28 w-28 rounded-full bg-gradient-to-tr from-apricot/40 to-transparent blur-2xl dark:opacity-45',
  ],
  小确幸: [
    'absolute -right-6 top-2 h-40 w-40 rounded-full bg-gradient-to-bl from-amber-200/50 via-amber-100/30 to-transparent blur-3xl dark:opacity-45',
    'absolute bottom-20 -left-8 h-32 w-32 rounded-full bg-gradient-to-tr from-amber-100/35 to-transparent blur-3xl dark:opacity-45',
  ],
  emo: [
    'absolute -right-4 top-8 h-36 w-36 rounded-full bg-gradient-to-bl from-violet-200/45 via-violet-100/25 to-transparent blur-3xl dark:opacity-45',
    'absolute -bottom-2 left-1/4 h-24 w-40 rounded-full bg-gradient-to-t from-violet-100/30 to-transparent blur-2xl dark:opacity-45',
  ],
  平静: [
    'absolute -right-10 top-0 h-44 w-44 rounded-full bg-gradient-to-bl from-emerald-200/35 via-emerald-100/25 to-transparent blur-3xl dark:opacity-45',
    'absolute -left-6 bottom-12 h-28 w-28 rounded-full bg-emerald-200/30 blur-2xl dark:opacity-45',
  ],
  期待: [
    'absolute -right-8 top-4 h-36 w-36 rounded-full bg-gradient-to-bl from-pink-200/40 via-pink-100/25 to-transparent blur-3xl dark:opacity-45',
    'absolute bottom-16 -left-4 h-24 w-24 rounded-full bg-pink-200/30 blur-2xl dark:opacity-45',
  ],
  疲惫: [
    'absolute -right-6 top-6 h-32 w-32 rounded-full bg-gradient-to-bl from-stone-300/40 to-transparent blur-3xl dark:opacity-45',
    'absolute -bottom-4 left-8 h-28 w-28 rounded-full bg-stone-400/35 blur-2xl dark:opacity-45',
  ],
}

const TREE_NICK_PREFIX = [
  '树洞里的',
  '路过的',
  '晚风中的',
  '窗台上的',
  '云朵旁',
  '路灯下',
]

const TREE_NICK_SUFFIX = [
  '小鹿',
  '小耳朵',
  '匿名星',
  '软软猫',
  '一片叶',
  '半杯茶',
  '小月亮',
  '旧信封',
]

export function randomTreeNickname(): string {
  const p = TREE_NICK_PREFIX[Math.floor(Math.random() * TREE_NICK_PREFIX.length)]
  const s = TREE_NICK_SUFFIX[Math.floor(Math.random() * TREE_NICK_SUFFIX.length)]
  return `${p}${s}`
}
