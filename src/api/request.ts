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

const request = axios.create({
  baseURL: 'http://localhost:3006',
  timeout: 15000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default request
