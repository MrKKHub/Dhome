<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Bell,
  Home,
  Hourglass,
  Moon,
  Plus,
  Sparkles,
  Sun,
  User,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store/userStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useThemeStore } from '@/store/themeStore'
import FirstVisitWelcome from '@/components/FirstVisitWelcome.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const themeStore = useThemeStore()
const { isDark: isDarkTheme } = storeToRefs(themeStore)

const isDetailRoute = computed(() => route.path.startsWith('/detail'))
const hideShellOnAuth = computed(() => route.path === '/login')

const headerTitle = computed(() => {
  if (route.path.startsWith('/detail')) {
    return '树洞详情'
  }
  if (route.path === '/notifications') {
    return '消息通知'
  }
  if (route.path === '/capsules') {
    return '时光胶囊'
  }
  return 'DHome'
})

const showHeaderBell = computed(
  () =>
    userStore.isLoggedIn &&
    route.path !== '/login' &&
    route.path !== '/notifications',
)

onMounted(() => {
  if (userStore.isLoggedIn) {
    void notificationStore.fetchUnreadOnly()
  }
})

watch(
  () => userStore.isLoggedIn,
  (v) => {
    if (v) {
      void notificationStore.fetchUnreadOnly()
    } else {
      notificationStore.unreadCount = 0
    }
  },
)

router.afterEach((to, from) => {
  if (
    userStore.isLoggedIn &&
    from.path === '/notifications' &&
    to.path !== '/notifications'
  ) {
    void notificationStore.fetchUnreadOnly()
  }
})

const goNotifications = () => {
  router.push('/notifications')
}

const leftTab = { path: '/', icon: Home, label: '树洞' }
const rightTabs = [
  { path: '/capsules', icon: Hourglass, label: '胶囊' },
  { path: '/profile', icon: User, label: '我的' },
]

const activePath = computed(() => route.path)

const goPublish = () => {
  router.push('/publish')
}

const goTab = (path: string) => {
  router.push(path)
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const onToggleTheme = () => {
  themeStore.toggleDarkMode()
}

/** 暂时隐藏顶栏标题左侧装饰图标；恢复展示时改为 true */
const showHeaderTitleLeadIcon = false
</script>

<template>
  <div>
    <!-- 首次访问欢迎层：全屏遮罩，写入 muxin_first_timer 后不再出现 -->
    <FirstVisitWelcome />
    <div class="relative min-h-dvh bg-warmCream">
    <!-- 顶栏复位：与安全区对齐，DHome / 铃铛回到舒适的状态栏区域 -->
    <header
      v-if="!hideShellOnAuth"
      class="app-shell-header fixed inset-x-0 top-0 z-30 w-full border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-xl"
    >
      <div class="relative flex min-h-[28px] items-center justify-center">
        <button
          v-if="isDetailRoute"
          type="button"
          class="absolute left-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full px-3 py-2 text-[12px] text-warmInk/60 shadow-warm backdrop-blur-md transition-all duration-200 active:scale-[0.97] app-shell-pill"
          @click="goBack"
        >
          <ArrowLeft class="h-4 w-4" />
          返回
        </button>
        <div class="flex items-center gap-1.5">
          <Sparkles
            v-if="showHeaderTitleLeadIcon"
            class="h-4 w-4 text-brand"
          />
          <h1 class="text-center text-[17px] font-semibold text-warmInk">
            {{ headerTitle }}
          </h1>
        </div>
        <!-- 深浅色切换在铃铛左侧；未登录时仅显示月亮/太阳 -->
        <div
          class="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-0.5"
        >
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-warmInk/60 transition-all duration-200 hover:scale-110 active:scale-95 active:text-brand"
            :aria-label="isDarkTheme ? '切换为浅色模式' : '切换为深色模式'"
            @click="onToggleTheme"
          >
            <Moon v-if="!isDarkTheme" class="h-5 w-5" stroke-width="2" />
            <Sun v-else class="h-5 w-5" stroke-width="2" />
          </button>
          <button
            v-if="showHeaderBell"
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-warmInk/55 transition-all duration-200 hover:scale-110 active:scale-95 active:text-brand"
            aria-label="消息通知"
            @click="goNotifications"
          >
            <span class="relative inline-flex">
              <Bell class="h-5 w-5" />
              <span
                v-if="notificationStore.unreadCount > 0"
                class="absolute -right-0.5 -top-0.5 min-h-[16px] min-w-[16px] rounded-full bg-liked px-[5px] text-center text-[10px] font-bold leading-4 text-white"
              >
                {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
              </span>
            </span>
          </button>
        </div>
      </div>
    </header>

    <main
      :class="
        hideShellOnAuth
          ? 'px-4 pb-6 pt-4'
          : 'pb-28 pt-16 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]'
      "
    >
      <!-- key：路径变化时强制重建页面组件，避免复用导致生命周期/异步 chunk 异常后出现空白 -->
      <RouterView v-slot="{ Component }">
        <Transition name="fade">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>

    <footer
      v-if="!hideShellOnAuth"
      class="app-shell-footer fixed inset-x-0 bottom-0 z-20 w-full border-t px-2 pb-2 pt-1 backdrop-blur-xl"
    >
      <nav class="grid grid-cols-4 items-end gap-1">
        <button
          type="button"
          class="flex flex-col items-center gap-0.5 rounded-2xl py-2 transition-all duration-200 active:scale-[0.97]"
          :class="
            activePath === leftTab.path
              ? 'text-brand'
              : 'text-warmInk/40 hover:text-warmInk/55'
          "
          @click="goTab(leftTab.path)"
        >
          <component :is="leftTab.icon" class="h-5 w-5" />
          <span class="text-[11px]">{{ leftTab.label }}</span>
        </button>

        <div class="relative flex h-10 justify-center">
          <button
            type="button"
            class="absolute -top-7 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand via-brand/90 to-lilac text-white shadow-warm animate-breathe transition-transform duration-200 active:scale-[0.94]"
            aria-label="发布树洞"
            @click="goPublish"
          >
            <Plus class="h-7 w-7" stroke-width="2.25" />
          </button>
        </div>

        <button
          v-for="tab in rightTabs"
          :key="tab.path"
          type="button"
          class="flex flex-col items-center gap-0.5 rounded-2xl py-2 transition-all duration-200 active:scale-[0.97]"
          :class="
            activePath === tab.path
              ? 'text-brand'
              : 'text-warmInk/40 hover:text-warmInk/55'
          "
          @click="goTab(tab.path)"
        >
          <component :is="tab.icon" class="h-5 w-5" />
          <span class="text-[11px]">{{ tab.label }}</span>
        </button>
      </nav>
    </footer>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
