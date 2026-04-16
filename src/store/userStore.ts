import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import request from '@/api/request'
import { formDataUploadAxiosConfig } from '@/api/formDataUploadConfig'
import {
  ACCESS_TOKEN_STORAGE_KEY,
  USER_INFO_STORAGE_KEY,
} from '@/constants/authStorage'

export interface UserInfo {
  id: string
  email: string
  nickname: string
  /** 后端存相对路径，如 /uploads/avatars/xxx.jpg */
  avatar?: string | null
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  nickname: string
}

const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordReg = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/

function readStoredSession(): { token: string; user: UserInfo } | null {
  try {
    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
    const raw = localStorage.getItem(USER_INFO_STORAGE_KEY)
    if (!token || !raw) {
      return null
    }
    const user = JSON.parse(raw) as UserInfo
    if (!user?.id || !user?.email) {
      return null
    }
    return { token, user }
  } catch {
    return null
  }
}

function persistSession(token: string, user: UserInfo) {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
  localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(user))
}

function clearSessionStorage() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_INFO_STORAGE_KEY)
}

function axiosErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) {
    return fallback
  }
  const data = err.response?.data as
    | { message?: string | string[] }
    | undefined
  const m = data?.message
  if (Array.isArray(m)) {
    return m[0] ?? fallback
  }
  if (typeof m === 'string' && m.trim()) {
    return m
  }
  return fallback
}

type AuthResult = { ok: true; message: string } | { ok: false; message: string }

export const useUserStore = defineStore('user', () => {
  const session = readStoredSession()
  const isLoggedIn = ref(!!session)
  const token = ref(session?.token ?? '')
  const userInfo = ref<UserInfo | null>(session?.user ?? null)
  const loading = ref(false)
  const uploadingAvatar = ref(false)

  const validatePasswordStrength = (password: string) => passwordReg.test(password)

  const login = async (payload: LoginPayload): Promise<AuthResult> => {
    if (loading.value) {
      return { ok: false, message: '稍等一下，小门正在打开…' }
    }
    const email = payload.email.trim().toLowerCase()
    if (!emailReg.test(email)) {
      return { ok: false, message: '请输入有效的邮箱地址' }
    }
    if (!validatePasswordStrength(payload.password)) {
      return { ok: false, message: '密码需至少 6 位，且同时包含字母与数字' }
    }

    loading.value = true
    try {
      const res = await request.post<{
        access_token: string
        user: UserInfo
      }>('/auth/login', {
        email,
        password: payload.password,
      })

      const access_token = res.data?.access_token
      const user = res.data?.user
      if (!access_token || !user?.id) {
        return { ok: false, message: '登录响应异常，请稍后再试' }
      }

      token.value = access_token
      userInfo.value = user
      isLoggedIn.value = true
      persistSession(access_token, user)
      return { ok: true, message: '欢迎回家' }
    } catch (e) {
      return {
        ok: false,
        message: axiosErrorMessage(e, '登录失败，请稍后再试'),
      }
    } finally {
      loading.value = false
    }
  }

  const register = async (payload: RegisterPayload): Promise<AuthResult> => {
    if (loading.value) {
      return { ok: false, message: '稍等一下，小门正在打开…' }
    }
    const email = payload.email.trim().toLowerCase()
    const nickname = payload.nickname.trim()
    if (!emailReg.test(email)) {
      return { ok: false, message: '请输入有效的邮箱地址' }
    }
    if (!validatePasswordStrength(payload.password)) {
      return { ok: false, message: '密码需至少 6 位，且同时包含字母与数字' }
    }
    if (!nickname) {
      return { ok: false, message: '给自己起一个温柔的昵称吧' }
    }

    loading.value = true
    try {
      const res = await request.post<{
        access_token: string
        user: UserInfo
      }>('/auth/register', {
        email,
        password: payload.password,
        nickname,
      })

      const access_token = res.data?.access_token
      const user = res.data?.user
      if (!access_token || !user?.id) {
        return { ok: false, message: '注册响应异常，请稍后再试' }
      }

      token.value = access_token
      userInfo.value = user
      isLoggedIn.value = true
      persistSession(access_token, user)
      return { ok: true, message: '欢迎成为树洞的一员' }
    } catch (e) {
      return {
        ok: false,
        message: axiosErrorMessage(e, '注册失败，请稍后再试'),
      }
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    isLoggedIn.value = false
    token.value = ''
    userInfo.value = null
    clearSessionStorage()
  }

  /**
   * 用 GET /user/profile/:id 等接口返回的公开字段刷新本地会话（昵称、头像）。
   * 解决：服务端已更新头像，但 Pinia/localStorage 仍为登录时的旧值，导致仅「我的」顶栏与列表不一致。
   */
  const mergeFromProfileSummary = (summary: {
    id: string
    nickname?: string
    avatar?: string | null
  }) => {
    if (!userInfo.value || !token.value) {
      return
    }
    if (String(summary.id) !== String(userInfo.value.id)) {
      return
    }
    const cur = userInfo.value
    const nextNickname =
      typeof summary.nickname === 'string' && summary.nickname.trim()
        ? summary.nickname.trim()
        : cur.nickname
    const next: UserInfo = {
      id: cur.id,
      email: cur.email,
      nickname: nextNickname,
      avatar: summary.avatar !== undefined ? summary.avatar : cur.avatar,
    }
    userInfo.value = next
    persistSession(token.value, next)
  }

  /** 上传头像：成功后合并用户信息并写回 localStorage */
  const uploadAvatar = async (file: File): Promise<AuthResult> => {
    if (!token.value || !userInfo.value) {
      return { ok: false, message: '请先登录后再更换头像' }
    }
    if (uploadingAvatar.value) {
      return { ok: false, message: '请稍候…' }
    }
    uploadingAvatar.value = true
    try {
      const body = new FormData()
      body.append('file', file)
      console.log('[uploadAvatar] FormData', {
        name: file.name,
        size: file.size,
        type: file.type || 'no-type',
      })
      const res = await request.post<{
        id: string
        email: string
        nickname: string
        avatar: string | null
      }>('/user/upload-avatar', body, formDataUploadAxiosConfig({ timeout: 120_000 }))

      const u = res.data
      if (!u?.id) {
        return { ok: false, message: '上传响应异常，请稍后再试' }
      }
      const next: UserInfo = {
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        avatar: u.avatar,
      }
      userInfo.value = next
      persistSession(token.value, next)
      return { ok: true, message: '头像已更新' }
    } catch (e) {
      if (axios.isAxiosError(e)) {
        console.error('[uploadAvatar] 失败', {
          status: e.response?.status,
          data: e.response?.data,
          message: e.message,
        })
      }
      return {
        ok: false,
        message: axiosErrorMessage(e, '头像上传失败，请稍后再试'),
      }
    } finally {
      uploadingAvatar.value = false
    }
  }

  /** 从推荐库选择头像：写入后端 avatar 并同步本地会话 */
  const updateProfileAvatar = async (avatarUrl: string): Promise<AuthResult> => {
    if (!token.value || !userInfo.value) {
      return { ok: false, message: '请先登录后再更换头像' }
    }
    const trimmed = avatarUrl.trim()
    if (!trimmed) {
      return { ok: false, message: '请选择头像' }
    }
    try {
      const res = await request.post<{
        id: string
        email: string
        nickname: string
        avatar: string | null
      }>('/user/update-profile', { avatar: trimmed })

      const u = res.data
      if (!u?.id) {
        return { ok: false, message: '更新响应异常，请稍后再试' }
      }
      const next: UserInfo = {
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        avatar: u.avatar,
      }
      userInfo.value = next
      persistSession(token.value, next)
      return { ok: true, message: '头像已更新' }
    } catch (e) {
      return {
        ok: false,
        message: axiosErrorMessage(e, '头像更新失败，请稍后再试'),
      }
    }
  }

  return {
    isLoggedIn,
    token,
    userInfo,
    loading,
    uploadingAvatar,
    validatePasswordStrength,
    login,
    register,
    logout,
    uploadAvatar,
    updateProfileAvatar,
    mergeFromProfileSummary,
  }
})
