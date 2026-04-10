<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { LocationQueryValue } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ArrowLeft } from 'lucide-vue-next'
import { showFailToast, showSuccessToast, showToast } from 'vant'
import request from '@/api/request'
import { useUserStore } from '@/store/userStore'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const sending = ref(false)
const submitting = ref(false)
const countdown = ref(0)

let countdownTimer: ReturnType<typeof setInterval> | null = null

const passwordReg = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/
const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function firstQueryString(
  v: LocationQueryValue | LocationQueryValue[] | undefined,
): string | undefined {
  if (v == null) return undefined
  if (Array.isArray(v)) {
    const x = v[0]
    return x == null ? undefined : x
  }
  return v
}

/** 从「账号与安全 → 修改密码」进入时带 mode=change；忘记密码入口不带 */
const isChangePasswordMode = computed(
  () => firstQueryString(route.query.mode) === 'change',
)

const pageTitle = computed(() =>
  isChangePasswordMode.value ? '修改密码' : '找回密码',
)

const submitButtonLabel = computed(() => {
  if (submitting.value) return '保存中…'
  return isChangePasswordMode.value ? '确认修改' : '找回密码并回家'
})

const codeBtnLabel = computed(() =>
  countdown.value > 0 ? `${countdown.value}s 后可重发` : '发送验证码',
)

const codeBtnDisabled = computed(
  () => sending.value || countdown.value > 0 || submitting.value,
)

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function startCountdown(seconds: number) {
  stopCountdown()
  countdown.value = seconds
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      stopCountdown()
      countdown.value = 0
    }
  }, 1000)
}

watch(
  () => route.query.email,
  (q) => {
    if (typeof q === 'string' && q.trim()) {
      try {
        email.value = decodeURIComponent(q.trim())
      } catch {
        email.value = q.trim()
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  stopCountdown()
})

function axiosErrMessage(err: unknown, fb: string): string {
  if (!axios.isAxiosError(err)) return fb
  const data = err.response?.data as { message?: string | string[] } | undefined
  const m = data?.message
  if (Array.isArray(m)) return m[0] ?? fb
  if (typeof m === 'string' && m.trim()) return m.trim()
  return fb
}

async function sendCode() {
  const e = email.value.trim().toLowerCase()
  if (!e) {
    showToast('请填写邮箱')
    return
  }
  if (!emailReg.test(e)) {
    showToast('请输入有效的邮箱地址')
    return
  }
  if (sending.value) return
  sending.value = true
  try {
    await request.post('/auth/send-reset-code', { email: e })
    showSuccessToast('验证码已发送，请查收邮箱')
    startCountdown(60)
  } catch (err) {
    showFailToast(axiosErrMessage(err, '发送失败'))
  } finally {
    sending.value = false
  }
}

async function submit() {
  const e = email.value.trim().toLowerCase()
  const c = code.value.trim()
  const p1 = newPassword.value
  const p2 = confirmPassword.value

  if (!emailReg.test(e)) {
    showToast('请输入有效的邮箱地址')
    return
  }
  if (!/^\d{6}$/.test(c)) {
    showToast('请输入 6 位数字验证码')
    return
  }
  if (!passwordReg.test(p1)) {
    showToast('密码需至少 6 位，且同时包含字母与数字')
    return
  }
  if (p1 !== p2) {
    showToast('两次输入的密码不一致')
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    await request.post('/auth/verify-and-reset', {
      email: e,
      code: c,
      newPassword: p1,
    })
    showSuccessToast('密码已更新，请使用新密码登录')
    router.replace('/login')
  } catch (err) {
    showFailToast(axiosErrMessage(err, '重置失败'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="reset-root relative -mx-4 -mt-4 min-h-[100dvh] px-4 pb-10 pt-6">
    <div class="mb-5 flex items-center justify-between">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-2 text-[12px] text-warmInk/55 shadow-warm backdrop-blur-sm transition-all active:scale-[0.98]"
        @click="router.back()"
      >
        <ArrowLeft class="h-4 w-4" />
        返回
      </button>
    </div>

    <div class="mb-6">
      <h1 class="text-[1.35rem] font-bold text-warmInk">{{ pageTitle }}</h1>
      <p class="mt-2 text-[13px] leading-relaxed text-warmInk/50">
        我们会向你的邮箱发送一封温柔的信，里面藏着时空密钥。
      </p>
    </div>

    <div
      class="rounded-[32px] border border-[#F5E6DC]/80 bg-white/50 p-4 shadow-warm backdrop-blur-md"
    >
      <div class="space-y-3">
        <van-field
          v-model="email"
          label="邮箱"
          placeholder="name@example.com"
          maxlength="80"
          type="email"
          autocomplete="email"
          class="reset-field rounded-2xl"
          :readonly="userStore.isLoggedIn && !!userStore.userInfo?.email"
        />

        <div class="flex gap-2">
          <van-field
            v-model="code"
            type="digit"
            maxlength="6"
            label="验证码"
            placeholder="6 位数字"
            class="reset-field flex-1 rounded-2xl"
          />
          <button
            type="button"
            class="mt-1.5 shrink-0 self-start rounded-full bg-white/70 px-3 py-2 text-[11px] font-medium text-[#E07A5F] shadow-inner transition-all active:scale-[0.98] disabled:opacity-50"
            :disabled="codeBtnDisabled"
            @click="sendCode"
          >
            {{ sending ? '发送中…' : codeBtnLabel }}
          </button>
        </div>

        <van-field
          v-model="newPassword"
          type="password"
          label="新密码"
          placeholder="至少 6 位，含字母与数字"
          class="reset-field rounded-2xl"
          autocomplete="new-password"
        />
        <van-field
          v-model="confirmPassword"
          type="password"
          label="确认密码"
          placeholder="再输入一次"
          class="reset-field rounded-2xl"
          autocomplete="new-password"
        />
      </div>

      <button
        type="button"
        class="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#FFAC81] to-[#FF928B] text-[15px] font-semibold text-white shadow-warm transition-all active:scale-[0.98] disabled:opacity-75"
        :disabled="submitting"
        @click="submit"
      >
        {{ submitButtonLabel }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.reset-root {
  background-color: #fdfbf7;
}

:deep(.reset-field.van-field) {
  padding: 10px 14px;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  box-shadow: inset 0 2px 10px rgba(74, 62, 62, 0.06);
}

:deep(.reset-field .van-field__label) {
  width: 3.25rem;
  color: rgba(74, 62, 62, 0.55);
  font-size: 13px;
}

:deep(.reset-field .van-field__control) {
  color: #4a3e3e;
  font-size: 15px;
}

:deep(.reset-field::after) {
  display: none;
}
</style>
