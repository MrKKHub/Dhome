import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import request from '@/api/request'
import {
  ACCESS_TOKEN_STORAGE_KEY,
  USER_INFO_STORAGE_KEY,
} from '@/constants/authStorage'

export interface UserInfo {
  id: string
  email: string
  nickname: string
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

  return {
    isLoggedIn,
    token,
    userInfo,
    loading,
    validatePasswordStrength,
    login,
    register,
    logout,
  }
})
