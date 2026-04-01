import { ref } from 'vue'
import { defineStore } from 'pinia'
import { randomTreeNickname } from '@/constants/moods'

export interface UserInfo {
  id: number
  /** 手机号或邮箱 */
  account: string
  nickname: string
}

interface AuthPayload {
  account: string
  password?: string
  code?: string
}

const phoneReg = /^1\d{10}$/
const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordReg = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/

const HEALING_REGISTER_NAMES = [
  '路过风的一片云',
  '深夜里的猫铃铛',
  '窗台上的半盏茶',
  '柔软的小苔藓',
  '不说话的月亮',
  '雨停后的青苔',
]

function validateAccount(account: string): boolean {
  const t = account.trim()
  return phoneReg.test(t) || emailReg.test(t)
}

function pickRegisterNickname(): string {
  return Math.random() > 0.45
    ? HEALING_REGISTER_NAMES[Math.floor(Math.random() * HEALING_REGISTER_NAMES.length)]
    : randomTreeNickname()
}

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(false)
  const token = ref('')
  const userInfo = ref<UserInfo | null>(null)
  const loading = ref(false)

  const validatePasswordStrength = (password: string) => passwordReg.test(password)

  const login = async (payload: AuthPayload) => {
    if (loading.value) {
      return { ok: false, message: '稍等一下，小门正在打开…' }
    }
    const account = payload.account.trim()
    if (!validateAccount(account)) {
      return { ok: false, message: '哎呀，这串好像走丢了，再核对一下？' }
    }
    const hasPassword = payload.password != null && payload.password !== ''
    if (hasPassword) {
      if (!validatePasswordStrength(payload.password!)) {
        return { ok: false, message: '密码太短啦，它需要更多保护感。' }
      }
    } else {
      if (!payload.code || payload.code.trim().length < 4) {
        return { ok: false, message: '验证码好像迷路了，再输一次看看？' }
      }
    }

    loading.value = true
    try {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1000)
      })

      token.value = `mock-token-${Date.now()}`
      userInfo.value = {
        id: Date.now(),
        account,
        nickname: phoneReg.test(account)
          ? `树洞居民·${account.slice(-4)}`
          : account.split('@')[0]?.slice(0, 8) || '树洞居民',
      }
      isLoggedIn.value = true
      return { ok: true, message: '欢迎回家' }
    } catch {
      return { ok: false, message: '门轴卡了一下，请再试一次。' }
    } finally {
      loading.value = false
    }
  }

  const register = async (payload: Required<AuthPayload>) => {
    if (loading.value) {
      return { ok: false, message: '稍等一下，小门正在打开…' }
    }
    const account = payload.account.trim()
    if (!validateAccount(account)) {
      return { ok: false, message: '哎呀，这串好像走丢了，再核对一下？' }
    }
    if (!validatePasswordStrength(payload.password)) {
      return { ok: false, message: '密码太短啦，它需要更多保护感。' }
    }
    if (payload.code.trim().length < 4) {
      return { ok: false, message: '验证码好像迷路了，再输一次看看？' }
    }

    loading.value = true
    try {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1000)
      })

      token.value = `mock-token-${Date.now()}`
      userInfo.value = {
        id: Date.now(),
        account,
        nickname: pickRegisterNickname(),
      }
      isLoggedIn.value = true
      return { ok: true, message: '欢迎成为树洞的一员' }
    } catch {
      return { ok: false, message: '门轴卡了一下，请再试一次。' }
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    isLoggedIn.value = false
    token.value = ''
    userInfo.value = null
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
