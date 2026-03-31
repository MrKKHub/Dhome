<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ShieldCheck } from 'lucide-vue-next'
import { showSuccessToast, showToast } from 'vant'
import { useUserStore } from '@/store/userStore'

type AuthTab = 'login' | 'register'
type LoginMethod = 'password' | 'code'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeTab = ref<AuthTab>('login')
const loginMethod = ref<LoginMethod>('password')
const phone = ref('')
const password = ref('')
const code = ref('')
const errorTip = ref('')

const isLoading = computed(() => userStore.loading)
const redirectPath = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/',
)

const touchError = (message: string) => {
  errorTip.value = message
  setTimeout(() => {
    errorTip.value = ''
  }, 450)
}

const submitAuth = async () => {
  if (activeTab.value === 'login') {
    const result =
      loginMethod.value === 'password'
        ? await userStore.login({
            phone: phone.value,
            password: password.value,
          })
        : await userStore.login({
            phone: phone.value,
            code: code.value,
          })

    if (!result.ok) {
      touchError(result.message)
      showToast(result.message)
      return
    }
    showSuccessToast('登录成功')
    router.replace(redirectPath.value)
    return
  }

  const result = await userStore.register({
    phone: phone.value,
    password: password.value,
    code: code.value,
  })
  if (!result.ok) {
    touchError(result.message)
    showToast(result.message)
    return
  }
  showSuccessToast('注册成功')
  router.replace(redirectPath.value)
}
</script>

<template>
  <section class="relative min-h-[calc(100dvh-64px)] overflow-hidden">
    <div class="mb-4 flex items-center justify-between">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-2 text-[12px] text-slate-500 shadow-ambient backdrop-blur-md transition-all duration-200 active:scale-[0.97]"
        @click="router.back()"
      >
        <ArrowLeft class="h-4 w-4" />
        返回
      </button>
      <div class="inline-flex items-center gap-1 text-[12px] text-slate-400">
        <ShieldCheck class="h-3.5 w-3.5" />
        账号安全保护中
      </div>
    </div>

    <div class="mb-6">
      <h2 class="mb-2 text-2xl font-bold text-slate-900">欢迎回来</h2>
      <p class="text-[13px] text-slate-400">登录或注册后继续你的探索旅程</p>
    </div>

    <div class="rounded-2xl border border-slate-100/60 bg-white p-4 shadow-ambient">
      <div class="mb-4 flex rounded-full bg-slate-100 p-1">
        <button
          type="button"
          class="flex-1 rounded-full py-2 text-[13px] transition-all duration-200 active:scale-[0.97]"
          :class="
            activeTab === 'login'
              ? 'bg-white font-semibold text-slate-900 shadow-sm'
              : 'text-slate-500'
          "
          @click="activeTab = 'login'"
        >
          登录
        </button>
        <button
          type="button"
          class="flex-1 rounded-full py-2 text-[13px] transition-all duration-200 active:scale-[0.97]"
          :class="
            activeTab === 'register'
              ? 'bg-white font-semibold text-slate-900 shadow-sm'
              : 'text-slate-500'
          "
          @click="activeTab = 'register'"
        >
          注册
        </button>
      </div>

      <Transition name="slide-fade" mode="out-in">
        <div :key="activeTab" class="space-y-3">
          <van-field
            v-model="phone"
            type="tel"
            maxlength="11"
            label="手机号"
            placeholder="请输入手机号"
            class="rounded-xl bg-slate-50"
            :class="errorTip ? 'shake ring-1 ring-red-200' : 'focus-within:shadow-blue-50'"
          />

          <template v-if="activeTab === 'login'">
            <div class="flex rounded-full bg-slate-100 p-1">
              <button
                type="button"
                class="flex-1 rounded-full py-1.5 text-[12px] transition-all duration-200 active:scale-[0.97]"
                :class="
                  loginMethod === 'password'
                    ? 'bg-white font-semibold text-slate-900 shadow-sm'
                    : 'text-slate-500'
                "
                @click="loginMethod = 'password'"
              >
                密码登录
              </button>
              <button
                type="button"
                class="flex-1 rounded-full py-1.5 text-[12px] transition-all duration-200 active:scale-[0.97]"
                :class="
                  loginMethod === 'code'
                    ? 'bg-white font-semibold text-slate-900 shadow-sm'
                    : 'text-slate-500'
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
              placeholder="至少6位，包含字母和数字"
              class="rounded-xl bg-slate-50"
              :class="errorTip ? 'shake ring-1 ring-red-200' : 'focus-within:shadow-blue-50'"
            />
            <van-field
              v-else
              v-model="code"
              type="number"
              maxlength="6"
              label="验证码"
              placeholder="请输入验证码"
              class="rounded-xl bg-slate-50"
              :class="errorTip ? 'shake ring-1 ring-red-200' : 'focus-within:shadow-blue-50'"
            />
          </template>

          <template v-else>
            <van-field
              v-model="code"
              type="number"
              maxlength="6"
              label="验证码"
              placeholder="请输入验证码"
              class="rounded-xl bg-slate-50"
              :class="errorTip ? 'shake ring-1 ring-red-200' : 'focus-within:shadow-blue-50'"
            />
            <van-field
              v-model="password"
              type="password"
              label="设置密码"
              placeholder="至少6位，包含字母和数字"
              class="rounded-xl bg-slate-50"
              :class="errorTip ? 'shake ring-1 ring-red-200' : 'focus-within:shadow-blue-50'"
            />
          </template>
        </div>
      </Transition>

      <button
        type="button"
        class="mt-5 h-12 w-full rounded-full bg-brand text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(0,122,255,0.24)] transition-all duration-200 active:scale-[0.97] disabled:opacity-70"
        :disabled="isLoading"
        @click="submitAuth"
      >
        <span v-if="!isLoading">{{ activeTab === 'login' ? '立即登录' : '创建账号' }}</span>
        <span v-else class="inline-flex items-center gap-2">
          <van-loading size="14px" color="#fff" />
          提交中...
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.25s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.shake {
  animation: shake 0.35s ease;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-3px);
  }
  75% {
    transform: translateX(3px);
  }
}
</style>
