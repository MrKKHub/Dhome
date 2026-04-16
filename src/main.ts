import { createApp, watch } from 'vue'
import './style.css'
import 'vant/lib/index.css'
import './vant-overrides.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from '@/router'
import { init as initPushService, syncUserLogin } from '@/services/pushService'
import { useUserStore } from '@/store/userStore'
import { useThemeStore } from '@/store/themeStore'

/**
 * 条件加载 vConsole：开发环境默认开启；生产包真机调试可设 VITE_ENABLE_VCONSOLE=true 后重新 build。
 * 便于在微信 / Safari 中查看日志与网络（配合 upload 内 console 输出）。
 */
const enableVConsole =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_VCONSOLE === 'true'

if (enableVConsole) {
  void import('vconsole').then((mod) => {
    const VConsole = mod.default
    new VConsole()
  })
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
/** 首屏前同步主题类到 <html>，避免浅色闪一下 */
useThemeStore().initFromStorage()

const onesignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID?.trim() ?? ''
initPushService({
  appId: onesignalAppId,
  getUserId: () => useUserStore().userInfo?.id ?? null,
})

watch(
  () => useUserStore().userInfo?.id,
  (id) => {
    if (id != null) {
      syncUserLogin(id)
    }
  },
  { immediate: true },
)

app.use(router)
app.mount('#app')

/**
 * PWA：生产环境注册 Service Worker（开发态避免干扰 HMR）。
 * 静态文件来自 public/sw.js，与 manifest、图标路径一致。
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        console.warn('[PWA] Service Worker 注册失败', err)
      })
  })
}
