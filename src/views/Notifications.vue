<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, CheckCheck } from 'lucide-vue-next'
import {
  formatNotificationText,
  useNotificationStore,
} from '@/store/notificationStore'
import { useUserStore } from '@/store/userStore'
import { useAppToast } from '@/composables/useAppToast'
import { resolveAvatarUrl } from '@/utils/resolveAvatarUrl'

const router = useRouter()
const userStore = useUserStore()
const notif = useNotificationStore()
const toast = useAppToast()

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    router.replace({ path: '/login', query: { redirect: '/notifications' } })
    return
  }
  const ok = await notif.fetchList()
  if (!ok) {
    toast.fail('加载通知失败')
  }
})

const onMarkAll = async () => {
  if (notif.unreadCount === 0) {
    toast.info('暂无未读')
    return
  }
  const ok = await notif.markAllRead()
  if (ok) {
    toast.success('已全部标为已读')
  } else {
    toast.fail('操作失败，请稍后再试')
  }
}

const formatTime = (iso: string) => {
  if (!iso || !iso.includes('T')) {
    return iso
  }
  const t = Date.parse(iso)
  if (Number.isNaN(t)) {
    return iso
  }
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  return `${d} 天前`
}
</script>

<template>
  <section class="animate-fade-in space-y-3">
    <div
      class="flex items-center justify-between rounded-[24px] border border-[#F0E8E0]/80 bg-white/95 px-4 py-3 shadow-warm backdrop-blur-sm"
    >
      <div class="flex items-center gap-2">
        <Bell class="h-5 w-5 text-brand" />
        <h2 class="text-[17px] font-semibold text-warmInk">消息通知</h2>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full bg-apricot/70 px-3 py-1.5 text-[12px] font-medium text-warmInk/80 transition-all active:scale-[0.97] disabled:opacity-50"
        :disabled="notif.markingRead || notif.loading"
        @click="onMarkAll"
      >
        <CheckCheck class="h-3.5 w-3.5" />
        全部已读
      </button>
    </div>

    <div
      v-if="notif.loading"
      class="rounded-[24px] bg-apricot/50 py-12 text-center text-[14px] text-warmInk/45"
    >
      加载中…
    </div>

    <ul v-else-if="notif.items.length" class="space-y-2">
      <li
        v-for="n in notif.items"
        :key="n.id"
        class="flex gap-3 rounded-[22px] border border-[#F0E8E0]/70 bg-white/95 p-3 shadow-warm backdrop-blur-sm"
        :class="n.isRead ? 'opacity-75' : ''"
      >
        <img
          :src="resolveAvatarUrl(n.sender.avatar, n.sender.nickname)"
          alt=""
          class="h-11 w-11 shrink-0 rounded-full border border-[#F0E8E0] object-cover"
        />
        <div class="min-w-0 flex-1">
          <p class="text-[14px] leading-relaxed text-warmInk">
            {{ formatNotificationText(n) }}
          </p>
          <p class="mt-1 text-[11px] text-warmInk/40">
            {{ formatTime(n.createdAt) }}
          </p>
        </div>
        <span
          v-if="!n.isRead"
          class="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand"
          aria-hidden="true"
        />
      </li>
    </ul>

    <div
      v-else
      class="rounded-[24px] bg-apricot/50 py-14 text-center text-[14px] text-warmInk/45"
    >
      暂无通知，去树洞逛逛吧～
    </div>
  </section>
</template>
