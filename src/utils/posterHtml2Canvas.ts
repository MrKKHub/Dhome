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
 * 在克隆后的海报根节点内移除跨域 http(s) 图（无 CORS 时 allowTaint:false 下易整画布空白）。
 * 仅处理 `clonedRoot`，避免误删 iframe 内其它节点；`clonedRoot` 缺省时退回 `document.body`。
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
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      return
    }
    try {
      const u = new URL(src, origin || 'http://localhost')
      if (origin && u.origin !== origin) {
        img.remove()
      }
    } catch {
      img.remove()
    }
  })
}
