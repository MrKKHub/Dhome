<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  CircleUserRound,
  Home,
  Plus,
  Sparkles,
  User,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isDetailRoute = computed(() => route.path.startsWith('/detail'))
const hideShellOnAuth = computed(() => route.path === '/login')

const leftTab = { path: '/', icon: Home, label: '树洞' }
const rightTabs = [
  { path: '/detail/1', icon: CircleUserRound, label: '详情' },
  { path: '/profile', icon: User, label: '我的' },
]

const activePath = computed(() => {
  if (route.path.startsWith('/detail')) {
    return '/detail/1'
  }
  return route.path
})

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
</script>

<template>
  <div class="relative min-h-dvh bg-warmCream">
    <header
      v-if="!hideShellOnAuth"
      class="fixed inset-x-0 top-0 z-30 w-full border-b border-[#F0E8E0]/70 bg-white/75 px-4 py-3 backdrop-blur-xl"
    >
      <div class="relative flex min-h-[28px] items-center justify-center">
        <button
          v-if="isDetailRoute"
          type="button"
          class="absolute left-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-[12px] text-warmInk/60 shadow-warm backdrop-blur-md transition-all duration-200 active:scale-[0.97]"
          @click="goBack"
        >
          <ArrowLeft class="h-4 w-4" />
          返回
        </button>
        <div class="flex items-center gap-1.5">
          <Sparkles class="h-4 w-4 text-brand" />
          <h1 class="text-center text-[17px] font-semibold text-warmInk">
            {{ isDetailRoute ? '树洞详情' : 'DHome' }}
          </h1>
        </div>
      </div>
    </header>

    <main :class="hideShellOnAuth ? 'px-4 pb-6 pt-4' : 'px-4 pb-28 pt-16'">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer
      v-if="!hideShellOnAuth"
      class="fixed inset-x-0 bottom-0 z-20 w-full border-t border-[#F0E8E0]/70 bg-white/75 px-2 pb-2 pt-1 backdrop-blur-xl"
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
            class="absolute -top-7 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand via-[#FF9F7A] to-lilac text-white shadow-warm animate-breathe transition-transform duration-200 active:scale-[0.94]"
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
