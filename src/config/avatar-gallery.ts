/**
 * 官方推荐头像（DiceBear 9.x）：notionists / fun-emoji / adventurer-neutral。
 * 与 dhome-server/src/config/avatar-presets.ts 条目需保持一致，供注册默认池与后端校验。
 */
export const PRESET_AVATAR_URLS = [
  'https://api.dicebear.com/9.x/notionists/svg?seed=Aiden',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Cleo',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Eden',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Finn',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Iris',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Juno',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Kai',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=apple',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=ball',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=cat',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=dove',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=leaf',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=moon',
  'https://api.dicebear.com/9.x/fun-emoji/svg?seed=star',
  'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Aneka',
  'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Basil',
  'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Chris',
  'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Dylan',
  'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Emery',
  'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Flo',
] as const

export const PRESET_AVATAR_URL_SET: ReadonlySet<string> = new Set(PRESET_AVATAR_URLS)

/** 是否为推荐库内固定 URL，或同域名同系列的合法 DiceBear SVG（兼容历史库存） */
export function isPresetGalleryAvatarUrl(path: string | null | undefined): boolean {
  if (path == null) return false
  const t = String(path).trim()
  if (!t) return false
  if (PRESET_AVATAR_URL_SET.has(t)) return true
  try {
    const u = new URL(t)
    if (u.protocol !== 'https:' || u.hostname !== 'api.dicebear.com') return false
    return /^\/9\.x\/(notionists|fun-emoji|adventurer-neutral)\/svg$/i.test(
      u.pathname,
    )
  } catch {
    return false
  }
}
