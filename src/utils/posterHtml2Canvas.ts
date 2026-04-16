import { resolvePublicUploadUrl } from '@/utils/resolveAvatarUrl'

/**
 * 将帖子图/头像 URL 转为当前站点下的 `/uploads/...`（若路径属于 uploads），
 * 避免 html2canvas 克隆里「API 域名图」与前端页不同源被 strip 掉或污染画布。
 */
export function normalizeSrcForPosterHtml2Canvas(
  src: string | null | undefined,
): string | null {
  if (src == null) return null
  const raw = String(src).trim()
  if (!raw) return null
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw

  const via = resolvePublicUploadUrl(raw)
  if (via.startsWith('/uploads/')) {
    return via
  }
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw)
      if (u.pathname.startsWith('/uploads/')) {
        return `${u.pathname}${u.search}`
      }
    } catch {
      /* ignore */
    }
  }
  return via || raw
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error ?? new Error('read failed'))
    fr.readAsDataURL(blob)
  })
}

/**
 * 将头像/帖子图拉成 data URL，供心情海报 html2canvas 使用（避免克隆文档里跨域解码失败、整段不绘制）。
 */
export async function resolvePosterRasterDataUrl(
  src: string | null | undefined,
): Promise<string | null> {
  const normalized = normalizeSrcForPosterHtml2Canvas(src)
  if (!normalized) return null
  if (normalized.startsWith('data:') || normalized.startsWith('blob:')) {
    return normalized
  }
  if (typeof window === 'undefined') return normalized
  const fetchUrl = normalized.startsWith('/')
    ? `${window.location.origin}${normalized}`
    : normalized
  try {
    const res = await fetch(fetchUrl, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await blobToDataUrl(blob)
  } catch {
    return null
  }
}

function posterCloneImgShouldStrip(src: string, pageOrigin: string): boolean {
  const s = (src || '').trim()
  if (!s || !/^https?:\/\//i.test(s)) return false
  try {
    const u = new URL(s, pageOrigin || 'http://localhost')
    if (pageOrigin && u.origin === new URL(pageOrigin).origin) return false
    const host = u.hostname.toLowerCase()
    if (host.includes('dicebear.com') || host.includes('dicebear.io')) {
      return false
    }
    if (u.pathname.startsWith('/uploads/')) return false
    return true
  } catch {
    return true
  }
}

/**
 * 心情海报：html2canvas 前等待图片解码，避免截到空白层
 */
export async function waitPosterImagesLoaded(
  el: HTMLElement,
  timeoutPerImg = 4000,
): Promise<void> {
  const imgs = [...el.querySelectorAll('img')] as HTMLImageElement[]
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && (img.naturalWidth > 0 || img.naturalHeight > 0)) {
            resolve()
            return
          }
          const t = window.setTimeout(() => resolve(), timeoutPerImg)
          const done = () => {
            window.clearTimeout(t)
            resolve()
          }
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
        }),
    ),
  )
}

/**
 * 在克隆后的海报根节点内移除「仍可能污染画布」的外站图。
 * 同源、`/uploads/` 相对路径、data/blob、以及 dicebear 头像保留（依赖 img crossOrigin + 对端 CORS）。
 */
export function stripRemoteImagesInHtml2CanvasClone(
  clonedDoc: Document,
  clonedRoot?: HTMLElement | null,
): void {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : ''
  const scope = clonedRoot ?? clonedDoc.body
  if (!scope) return
  scope.querySelectorAll('img').forEach((node) => {
    const img = node as HTMLImageElement
    const src = img.getAttribute('src') || ''
    if (src.startsWith('data:') || src.startsWith('blob:')) return
    if (src.startsWith('/uploads/')) return
    if (!posterCloneImgShouldStrip(src, origin)) return
    img.remove()
  })
}
