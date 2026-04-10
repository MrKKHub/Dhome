/**
 * 帖子图、头像等上传路径归一化。
 * 开发环境把指向本服务的 `http://host:3006/uploads/...` 转为站点相对 `/uploads/...`，
 * 始终走当前页所在源（含局域网 IP）+ Vite `/uploads` 代理，避免真机访问 localhost:3006 失败或与页面跨源导致 html2canvas 异常。
 */
export function resolvePublicUploadUrl(path: string | null | undefined): string {
  if (path == null || !String(path).trim()) return ''
  const raw = String(path).trim()
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw
  if (/^https?:\/\//i.test(raw)) {
    if (import.meta.env.DEV) {
      try {
        const u = new URL(raw)
        if (u.pathname.startsWith('/uploads/')) {
          return `${u.pathname}${u.search}`
        }
      } catch {
        /* 保留原 URL */
      }
    }
    return raw
  }
  return raw.startsWith('/') ? raw : `/${raw}`
}

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

  const trimmed = path.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    const u = resolvePublicUploadUrl(trimmed)
    if (u.startsWith('http')) return u
    if (u.startsWith('/uploads/')) {
      if (import.meta.env.DEV) return u
      const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
      const origin = base.replace(/\/api\/?$/, '') ?? ''
      if (!origin) return u
      return `${origin}${u}`
    }
    return trimmed
  }

  const pathNorm = resolvePublicUploadUrl(trimmed)
  if (!pathNorm) return fallback
  if (import.meta.env.DEV && pathNorm.startsWith('/uploads/')) {
    return pathNorm
  }
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
  if (!base) return pathNorm
  const origin = base.replace(/\/api\/?$/, '') ?? ''
  if (!origin) return pathNorm
  return `${origin}${pathNorm}`
}
