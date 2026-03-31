import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface UserInfo {
  id: number
  phone: string
  nickname: string
}

interface AuthPayload {
  phone: string
  password?: string
  code?: string
}

const phoneReg = /^1\d{10}$/
const passwordReg = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(false)
  const token = ref('')
  const userInfo = ref<UserInfo | null>(null)
  const loading = ref(false)

  const validatePhone = (phone: string) => phoneReg.test(phone)
  const validatePassword = (password: string) => passwordReg.test(password)

  const login = async (payload: AuthPayload) => {
    if (loading.value) {
      return { ok: false, message: '请求处理中，请稍后' }
    }
    const phone = payload.phone.trim()
    if (!validatePhone(phone)) {
      return { ok: false, message: '请输入有效手机号' }
    }
    if (payload.password && !validatePassword(payload.password)) {
      return { ok: false, message: '密码至少 6 位且包含数字和字母' }
    }
    if (payload.code && payload.code.trim().length < 4) {
      return { ok: false, message: '验证码格式不正确' }
    }

    loading.value = true
    try {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1000)
      })

      token.value = `mock-token-${Date.now()}`
      userInfo.value = {
        id: Date.now(),
        phone,
        nickname: `用户${phone.slice(-4)}`,
      }
      isLoggedIn.value = true
      return { ok: true, message: '登录成功' }
    } catch {
      return { ok: false, message: '登录失败，请稍后重试' }
    } finally {
      loading.value = false
    }
  }

  const register = async (payload: Required<AuthPayload>) => {
    if (loading.value) {
      return { ok: false, message: '请求处理中，请稍后' }
    }
    const phone = payload.phone.trim()
    if (!validatePhone(phone)) {
      return { ok: false, message: '请输入有效手机号' }
    }
    if (!validatePassword(payload.password)) {
      return { ok: false, message: '密码至少 6 位且包含数字和字母' }
    }
    if (payload.code.trim().length < 4) {
      return { ok: false, message: '请输入有效验证码' }
    }

    loading.value = true
    try {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 1000)
      })

      token.value = `mock-token-${Date.now()}`
      userInfo.value = {
        id: Date.now(),
        phone,
        nickname: `新用户${phone.slice(-4)}`,
      }
      isLoggedIn.value = true
      return { ok: true, message: '注册成功' }
    } catch {
      return { ok: false, message: '注册失败，请稍后重试' }
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
    validatePhone,
    validatePassword,
    login,
    register,
    logout,
  }
})
