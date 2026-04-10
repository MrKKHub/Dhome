export const MOOD_OPTIONS = [
  '浮躁',
  '小确幸',
  'emo',
  '平静',
  '期待',
  '疲惫',
] as const

export type PostMood = (typeof MOOD_OPTIONS)[number]

/** 心情标签展示色（暖色低饱和） */
export const MOOD_BADGE_CLASS: Record<PostMood, string> = {
  浮躁: 'bg-[#FFE8DC] text-[#A85A3C]',
  小确幸: 'bg-[#FFF4E0] text-[#9A7B2C]',
  emo: 'bg-[#EDE9FF] text-[#5C5299]',
  平静: 'bg-[#E8F3EE] text-[#3D7565]',
  期待: 'bg-[#FFF0F5] text-[#A85A7A]',
  疲惫: 'bg-[#EEEAE6] text-[#6B5E58]',
}

/** 与发布/卡片一致的心情标签色；未知文案时退回中性色 */
export function resolveMoodBadgeClass(mood: string): string {
  const key = mood.trim() as PostMood
  if (MOOD_OPTIONS.includes(key)) {
    return MOOD_BADGE_CLASS[key]
  }
  return 'bg-[#F5EDE4]/90 text-[#6B5E58]'
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

/**
 * 卡片内极淡水彩晕染层（两团模糊色块，模拟棉麻纸上的水彩）
 * 每项为 [右上主晕染 class, 左下辅晕染 class]
 */
export const MOOD_WATERCOLOR_LAYERS: Record<PostMood, [string, string]> = {
  浮躁: [
    'absolute -right-8 -top-6 h-36 w-36 rounded-full bg-gradient-to-bl from-[#FFD4C4]/45 via-[#FFE8DC]/25 to-transparent blur-3xl',
    'absolute -bottom-4 -left-6 h-28 w-28 rounded-full bg-gradient-to-tr from-[#E8DDD4]/40 to-transparent blur-2xl',
  ],
  小确幸: [
    'absolute -right-6 top-2 h-40 w-40 rounded-full bg-gradient-to-bl from-[#FFDCC4]/50 via-[#FFF0E0]/30 to-transparent blur-3xl',
    'absolute bottom-20 -left-8 h-32 w-32 rounded-full bg-gradient-to-tr from-[#FFE8D6]/35 to-transparent blur-3xl',
  ],
  emo: [
    'absolute -right-4 top-8 h-36 w-36 rounded-full bg-gradient-to-bl from-[#DDD8F5]/45 via-[#EDE9FF]/25 to-transparent blur-3xl',
    'absolute -bottom-2 left-1/4 h-24 w-40 rounded-full bg-gradient-to-t from-[#E8E4F7]/30 to-transparent blur-2xl',
  ],
  平静: [
    'absolute -right-10 top-0 h-44 w-44 rounded-full bg-gradient-to-bl from-[#C8E8DC]/35 via-[#E8F3EE]/25 to-transparent blur-3xl',
    'absolute -left-6 bottom-12 h-28 w-28 rounded-full bg-[#D4EBE2]/30 blur-2xl',
  ],
  期待: [
    'absolute -right-8 top-4 h-36 w-36 rounded-full bg-gradient-to-bl from-[#F5D4E0]/40 via-[#FFF0F5]/25 to-transparent blur-3xl',
    'absolute bottom-16 -left-4 h-24 w-24 rounded-full bg-[#F0D8E0]/30 blur-2xl',
  ],
  疲惫: [
    'absolute -right-6 top-6 h-32 w-32 rounded-full bg-gradient-to-bl from-[#DDD5CC]/40 to-transparent blur-3xl',
    'absolute -bottom-4 left-8 h-28 w-28 rounded-full bg-[#E5DED6]/35 blur-2xl',
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
