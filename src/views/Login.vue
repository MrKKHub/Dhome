<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { useUserStore } from '@/store/userStore'

type AuthTab = 'login' | 'register'
type LoginMethod = 'password' | 'code'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeTab = ref<AuthTab>('login')
const loginMethod = ref<LoginMethod>('password')
const account = ref('')
const nickname = ref('')
const password = ref('')
const code = ref('')
const errorTip = ref('')
const pageLeaving = ref(false)
const passwordFocused = ref(false)
const codeSending = ref(false)
const codeBtnText = ref('发送验证码')

const tilt = ref({ x: 0, y: 0 })

const bubbleTransform = computed(() => ({
  transform: `translate3d(${tilt.value.x}px, ${tilt.value.y}px, 0)`,
  transition: 'transform 0.35s ease-out',
}))

const isLoading = computed(() => userStore.loading)
const redirectPath = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/',
)

const touchError = (message: string) => {
  errorTip.value = message
  setTimeout(() => {
    errorTip.value = ''
  }, 520)
}

const fadeNavigate = (path: string) => {
  pageLeaving.value = true
  setTimeout(() => {
    router.replace(path)
  }, 450)
}

const mockSendCode = async () => {
  const t = account.value.trim()
  if (!t) {
    touchError('先写下你的邮箱，好吗？')
    return
  }
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
  if (!ok) {
    touchError('请输入有效的邮箱地址')
    return
  }
  if (codeSending.value) {
    return
  }
  codeSending.value = true
  codeBtnText.value = '正在传递温暖...'
  await new Promise<void>((r) => setTimeout(r, 1600))
  codeSending.value = false
  codeBtnText.value = '发送验证码'
  showToast('一缕暖风已出发～')
}

const submitAuth = async () => {
  if (activeTab.value === 'login') {
    if (loginMethod.value === 'code') {
      const msg = '验证码登录暂未接入，请使用密码登录'
      touchError(msg)
      showToast(msg)
      return
    }

    const result = await userStore.login({
      email: account.value.trim(),
      password: password.value,
    })

    if (!result.ok) {
      touchError(result.message)
      showToast(result.message)
      return
    }
    showSuccessToast({ message: '欢迎回家', duration: 700 })
    fadeNavigate(redirectPath.value)
    return
  }

  const result = await userStore.register({
    email: account.value.trim(),
    password: password.value,
    nickname: nickname.value.trim(),
  })
  if (!result.ok) {
    touchError(result.message)
    showToast(result.message)
    return
  }

  try {
    await showConfirmDialog({
      title: '欢迎来到树洞',
      message: '现在，有什么小小的心情想要放进树洞里吗？',
      confirmButtonText: '去写一条',
      cancelButtonText: '稍后再说',
      confirmButtonColor: '#FF928B',
      cancelButtonColor: '#9ca3af',
    })
    fadeNavigate('/publish')
  } catch {
    fadeNavigate(redirectPath.value)
  }
}

const onPasswordFocus = () => {
  passwordFocused.value = true
}
const onPasswordBlur = () => {
  passwordFocused.value = false
}

let orientationHandler: ((e: DeviceOrientationEvent) => void) | undefined

onMounted(() => {
  const onOrient = (e: DeviceOrientationEvent) => {
    const g = e.gamma != null ? e.gamma : 0
    const b = (e.beta != null ? e.beta : 0) - 90
    tilt.value = {
      x: Math.max(-14, Math.min(14, g * 0.22)),
      y: Math.max(-10, Math.min(10, b * 0.16)),
    }
  }
  orientationHandler = onOrient
  window.addEventListener('deviceorientation', onOrient)
})

onUnmounted(() => {
  if (orientationHandler) {
    window.removeEventListener('deviceorientation', orientationHandler)
  }
})
</script>

<template>
  <section
    class="auth-root relative -mx-4 -mt-4 min-h-[100dvh] overflow-hidden px-4 pb-10 pt-6 transition-opacity duration-[450ms] ease-out"
    :class="[pageLeaving ? 'pointer-events-none opacity-0' : 'opacity-100']"
  >
    <!-- 呼吸感渐变背景 -->
    <div class="auth-breath pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

    <!-- 情绪气泡 + 陀螺仪微动 -->
    <div
      class="pointer-events-none absolute inset-0 -z-[5] overflow-hidden"
      :style="bubbleTransform"
      aria-hidden="true"
    >
      <div
        class="bubble absolute left-[6%] top-[18%] h-28 w-28 rounded-full bg-white/35 blur-2xl"
      />
      <div
        class="bubble-delay absolute right-[4%] top-[32%] h-36 w-36 rounded-full bg-brand/25 blur-3xl"
      />
      <div
        class="bubble-slow absolute bottom-[28%] left-[20%] h-24 w-24 rounded-full bg-lilac/25 blur-2xl"
      />
    </div>

    <div class="mb-5 flex items-center justify-between">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-2 text-[12px] text-warmInk/55 shadow-[0_10px_40px_-10px_rgba(255,140,105,0.2)] backdrop-blur-sm transition-all duration-200 active:scale-[0.98]"
        @click="router.back()"
      >
        <ArrowLeft class="h-4 w-4" />
        返回
      </button>
    </div>

    <!-- 小树洞「捂眼睛」 -->
    <div class="mb-5 flex flex-col items-center">
      <div class="relative flex h-16 w-16 items-center justify-center">
        <span
          class="mascot-spring absolute text-[2.75rem] leading-none transition-all duration-500"
          :class="
            passwordFocused
              ? 'scale-75 opacity-0 blur-[2px]'
              : 'scale-100 opacity-100 blur-0'
          "
          aria-hidden="true"
        >
          🌿
        </span>
        <span
          class="mascot-spring absolute text-[2.5rem] leading-none transition-all duration-500"
          :class="
            passwordFocused
              ? 'scale-100 opacity-100'
              : 'scale-90 opacity-0'
          "
          aria-hidden="true"
        >
          🙈
        </span>
      </div>
      <p class="mt-1 text-center text-[11px] text-warmInk/35">输入密码时，我会悄悄转过头</p>
    </div>

    <div class="mb-2">
      <h2 class="text-[1.35rem] font-bold leading-snug text-warmInk">
        欢迎回家，这里只有你的心跳声。
      </h2>
      <p class="mt-2 text-[13px] leading-relaxed text-warmInk/50">
        一个人的小情绪，也值得被温柔接纳。
      </p>
    </div>

    <div
      class="rounded-[32px] border border-soft bg-surface/80 p-4 shadow-[0_10px_40px_-10px_rgba(255,140,105,0.2)] backdrop-blur-md"
    >
      <div class="mb-4 flex rounded-full bg-apricot/60 p-1">
        <button
          type="button"
          class="jelly-tab flex-1 rounded-full py-2.5 text-[13px] transition-all duration-200 active:scale-[0.98]"
          :class="
            activeTab === 'login'
              ? 'bg-surface font-semibold text-warmInk shadow-sm'
              : 'text-warmInk/45'
          "
          @click="activeTab = 'login'"
        >
          登录
        </button>
        <button
          type="button"
          class="jelly-tab flex-1 rounded-full py-2.5 text-[13px] transition-all duration-200 active:scale-[0.98]"
          :class="
            activeTab === 'register'
              ? 'bg-surface font-semibold text-warmInk shadow-sm'
              : 'text-warmInk/45'
          "
          @click="activeTab = 'register'"
        >
          注册
        </button>
      </div>

      <Transition name="jelly-fade" mode="out-in">
        <div :key="activeTab" class="space-y-3">
          <van-field
            v-model="account"
            label="邮箱"
            placeholder="name@example.com"
            maxlength="80"
            type="email"
            autocomplete="email"
            class="auth-field rounded-2xl"
            :class="errorTip ? 'shake ring-1 ring-liked/25' : ''"
          />

          <template v-if="activeTab === 'login'">
            <div class="flex rounded-full bg-apricot/60 p-1">
              <button
                type="button"
                class="flex-1 rounded-full py-2 text-[12px] transition-all duration-200 active:scale-[0.98]"
                :class="
                  loginMethod === 'password'
                    ? 'bg-surface font-semibold text-warmInk shadow-sm'
                    : 'text-warmInk/45'
                "
                @click="loginMethod = 'password'"
              >
                密码登录
              </button>
              <button
                type="button"
                class="flex-1 rounded-full py-2 text-[12px] transition-all duration-200 active:scale-[0.98]"
                :class="
                  loginMethod === 'code'
                    ? 'bg-surface font-semibold text-warmInk shadow-sm'
                    : 'text-warmInk/45'
                "
                @click="loginMethod = 'code'"
              >
                验证码登录
              </button>
            </div>
            <van-field
              v-if="loginMethod === 'password'"
              v-model="password"
              type="password"
              label="密码"
              placeholder="至少 6 位，含字母与数字"
              class="auth-field rounded-2xl"
              autocomplete="current-password"
              :class="errorTip ? 'shake ring-1 ring-liked/25' : ''"
              @focus="onPasswordFocus"
              @blur="onPasswordBlur"
            />
            <template v-else>
              <div class="flex gap-2">
                <van-field
                  v-model="code"
                  type="digit"
                  maxlength="6"
                  label="验证码"
                  placeholder="验证码"
                  class="auth-field flex-1 rounded-2xl"
                  :class="errorTip ? 'shake ring-1 ring-liked/25' : ''"
                />
                <button
                  type="button"
                  class="mt-1.5 shrink-0 self-start rounded-full bg-surface px-3 py-2 text-[11px] font-medium text-brand shadow-inner transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                  :disabled="codeSending"
                  @click="mockSendCode"
                >
                  {{ codeBtnText }}
                </button>
              </div>
            </template>
          </template>

          <template v-else>
            <van-field
              v-model="nickname"
              label="昵称"
              placeholder="树洞里怎么称呼你"
              maxlength="32"
              class="auth-field rounded-2xl"
              :class="errorTip ? 'shake ring-1 ring-liked/25' : ''"
            />
            <van-field
              v-model="password"
              type="password"
              label="密码"
              placeholder="至少 6 位，含字母与数字"
              class="auth-field rounded-2xl"
              autocomplete="new-password"
              :class="errorTip ? 'shake ring-1 ring-liked/25' : ''"
              @focus="onPasswordFocus"
              @blur="onPasswordBlur"
            />
          </template>
        </div>
      </Transition>

      <button
        type="button"
        class="relative mt-6 flex h-12 w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-brand to-brand/90 text-[15px] font-semibold text-white shadow-[0_10px_40px_-10px_rgba(255,140,105,0.35)] transition-all duration-200 active:scale-[0.98] disabled:opacity-75"
        :disabled="isLoading"
        @click="submitAuth"
      >
        <span
          v-if="!isLoading"
          class="relative z-[1]"
        >{{ activeTab === 'login' ? '轻轻推门' : '住进树洞' }}</span>
        <span
          v-else
          class="relative z-[1] flex h-6 w-6 items-center justify-center"
          aria-hidden="true"
        >
          <span class="warm-ring" />
        </span>
      </button>

      <p
        v-if="activeTab === 'login'"
        class="mt-4 text-center text-[12px] text-warmInk/42"
      >
        <button
          type="button"
          class="text-brand/90 underline decoration-brand/35 underline-offset-2 transition-colors active:opacity-80"
          @click="router.push('/reset-password')"
        >
          忘记密码？
        </button>
      </p>
    </div>
  </section>
</template>

<style scoped>
.mascot-spring {
  transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}

.auth-root {
  background-color: var(--bg-page);
}

.auth-breath {
  background: linear-gradient(
    145deg,
    var(--bg-page) 0%,
    rgb(var(--tw-apricot) / 0.55) 45%,
    var(--bg-page) 90%
  );
  background-size: 220% 220%;
  animation: breath-sky 10s ease-in-out infinite alternate;
}

@keyframes breath-sky {
  0% {
    background-position: 0% 40%;
  }
  100% {
    background-position: 100% 60%;
  }
}

.bubble {
  animation: float-a 9s ease-in-out infinite;
}

.bubble-delay {
  animation: float-b 11s ease-in-out infinite 1s;
}

.bubble-slow {
  animation: float-c 13s ease-in-out infinite 0.5s;
}

@keyframes float-a {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(8px, -12px) scale(1.05);
  }
}

@keyframes float-b {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-10px, 10px);
  }
}

@keyframes float-c {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(6px, 14px);
  }
}

.jelly-fade-enter-active,
.jelly-fade-leave-active {
  transition: all 0.38s cubic-bezier(0.34, 1.45, 0.64, 1);
}

.jelly-fade-enter-from {
  opacity: 0;
  transform: translateX(14px) scale(0.96);
}

.jelly-fade-leave-to {
  opacity: 0;
  transform: translateX(-12px) scale(0.98);
}

.shake {
  animation: shake-soft 0.42s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@keyframes shake-soft {
  0%,
  100% {
    transform: translateX(0);
  }
  30% {
    transform: translateX(-4px);
  }
  70% {
    transform: translateX(4px);
  }
}

.warm-ring {
  display: block;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 9999px;
  border: 2px solid rgba(255, 248, 220, 0.45);
  border-top-color: rgba(255, 213, 120, 0.95);
  animation: warm-spin 0.85s linear infinite;
}

@keyframes warm-spin {
  to {
    transform: rotate(360deg);
  }
}

:deep(.auth-field.van-field) {
  padding: 10px 14px;
  border-radius: 1rem;
  background: var(--surface-elevated);
  backdrop-filter: blur(8px);
  box-shadow: inset 0 2px 10px rgb(var(--tw-warm-ink) / 0.06);
}

:deep(.auth-field .van-field__label) {
  width: 3.25rem;
  color: rgb(var(--tw-warm-ink) / 0.55);
  font-size: 13px;
}

:deep(.auth-field .van-field__control) {
  color: rgb(var(--tw-warm-ink) / 1);
  font-size: 15px;
}

:deep(.auth-field::after) {
  display: none;
}
</style>
