/*
 * @Author: huashikai huashikai@huitongjt.com
 * @Date: 2026-04-01 16:50:09
 * @LastEditors: huashikai huashikai@huitongjt.com
 * @LastEditTime: 2026-04-01 17:15:03
 * @FilePath: /dhome/src/api/request.ts
 * @Description: 这是默认设置,请设置`customMade`,打开 koroFileHeader 查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import axios from 'axios'
import { ACCESS_TOKEN_STORAGE_KEY } from '@/constants/authStorage'

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api'

const request = axios.create({
  baseURL,
  timeout: 15000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // FormData 必须由浏览器带 multipart boundary；去掉可能被默认带入的 Content-Type
  if (config.data instanceof FormData) {
    const h = config.headers
    if (h && typeof h.delete === 'function') {
      h.delete('Content-Type')
    } else if (h && 'Content-Type' in h) {
      delete (h as Record<string, unknown>)['Content-Type']
    }
  }
  return config
})

export default request
