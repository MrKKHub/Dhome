/**
 * 将后端返回的相对路径（如 /uploads/avatars/xxx.jpg）拼成可请求的绝对 URL。
 * VITE_API_BASE_URL 为 http://host:port/api 时，会去掉末尾 /api 作为静态资源源站。
 */
export function resolveAvatarUrl(
  path: string | null | undefined,
  seedForFallback?: string,
): string {
  const fallback =
    seedForFallback != null && seedForFallback !== ''
      ? `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seedForFallback)}`
      : 'https://api.dicebear.com/9.x/notionists/svg?seed=You'
  if (!path?.trim()) return fallback
  if (/^https?:\/\//i.test(path)) return path
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
  const pathNorm = path.startsWith('/') ? path : `/${path}`
  if (!base) return pathNorm
  const origin = base.replace(/\/api\/?$/, '')
  if (!origin) return pathNorm
  return `${origin}${pathNorm}`
}
