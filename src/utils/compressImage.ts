/**
 * 等比缩放到最大宽度，导出 WebP。
 * 头像可传较小 maxWidth；正文配图在 upload 中使用较大 maxWidth（如 1600）。
 */
export function compressImageToWebp(
  file: File,
  maxWidth = 400,
  quality = 0.8,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let w = img.naturalWidth || img.width
      let h = img.naturalHeight || img.height
      if (w <= 0 || h <= 0) {
        reject(new Error('无效图片尺寸'))
        return
      }
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w)
        w = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 不可用'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (b) => {
          if (b) resolve(b)
          else reject(new Error('导出失败'))
        },
        'image/webp',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}
