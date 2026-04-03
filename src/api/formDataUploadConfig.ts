import type { AxiosRequestConfig } from 'axios'

/**
 * multipart 上传专用：禁止手写 Content-Type，否则移动端会丢失 boundary 导致失败。
 * 通过 transformRequest 移除可能由 axios 默认带入的 Content-Type，交给浏览器自动带 boundary。
 */
export function formDataUploadAxiosConfig(
  extra?: Omit<AxiosRequestConfig, 'transformRequest'>,
): AxiosRequestConfig {
  return {
    ...extra,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    transformRequest: [
      (data, headers) => {
        if (data instanceof FormData) {
          // AxiosHeaders 或普通对象均尝试删除
          const h = headers as { delete?: (k: string) => void } & Record<string, unknown>
          if (typeof h.delete === 'function') {
            h.delete('Content-Type')
          } else {
            delete (headers as Record<string, unknown>)['Content-Type']
          }
        }
        return data
      },
    ],
  }
}
