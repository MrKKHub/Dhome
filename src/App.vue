<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, House, PlusSquare, CircleUserRound, User } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const isDetailRoute = computed(() => route.path.startsWith('/detail'))
const hideShellOnAuth = computed(() => route.path === '/login')

const tabs = [
  { path: '/', icon: House, label: '首页' },
  { path: '/publish', icon: PlusSquare, label: '发布' },
  { path: '/detail/1', icon: CircleUserRound, label: '详情' },
  { path: '/profile', icon: User, label: '我的' },
]

const activePath = computed(() => {
  if (route.path.startsWith('/detail')) {
    return '/detail/1'
  }
  return route.path
})

const switchTab = (path: string) => {
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
  <div class="relative min-h-dvh bg-[#F8F9FB]">
    <header
      v-if="!hideShellOnAuth"
      class="fixed left-1/2 top-0 z-30 w-full max-w-[375px] -translate-x-1/2 border-b border-slate-100/50 bg-white/80 px-4 py-3 backdrop-blur-md"
    >
      <div class="relative flex min-h-[28px] items-center justify-center">
        <button
          v-if="isDetailRoute"
          type="button"
          class="absolute left-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-[12px] text-slate-500 shadow-ambient transition-all duration-200 active:scale-[0.97]"
          @click="goBack"
        >
          <ArrowLeft class="h-4 w-4" />
          返回
        </button>
        <h1 class="text-center text-[17px] font-semibold text-slate-900">
          {{ isDetailRoute ? '详情' : 'DHome' }}
        </h1>
      </div>
    </header>

    <main :class="hideShellOnAuth ? 'px-4 pb-6 pt-4' : 'px-4 pb-24 pt-16'">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer
      v-if="!hideShellOnAuth"
      class="fixed bottom-0 left-1/2 z-20 w-full max-w-[375px] -translate-x-1/2 border-t border-slate-100/50 bg-white/80 px-3 py-2 backdrop-blur-md"
    >
      <nav class="grid grid-cols-4 gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.path"
          type="button"
          class="flex flex-col items-center gap-1 rounded-2xl py-2 transition-all duration-200 active:scale-[0.97]"
          :class="
            activePath === tab.path
              ? 'bg-brand/10 text-brand'
              : 'text-slate-400 hover:text-slate-600'
          "
          @click="switchTab(tab.path)"
        >
          <component :is="tab.icon" class="h-5 w-5" />
          <span class="text-[12px]">{{ tab.label }}</span>
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
