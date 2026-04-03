import { createApp } from 'vue'
import './style.css'
import 'vant/lib/index.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from '@/router'

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

app.use(createPinia())
app.use(router)
app.mount('#app')
