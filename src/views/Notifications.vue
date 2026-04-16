<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, CheckCheck } from 'lucide-vue-next'
import axios from 'axios'
import request from '@/api/request'
import MessageItem from '@/components/MessageItem.vue'
import {
  useNotificationStore,
  type NotificationItem,
} from '@/store/notificationStore'
import { useUserStore } from '@/store/userStore'
import { useAppToast } from '@/composables/useAppToast'

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

/** 是否可跳转真实用户主页（匿名通知等 sender 可能为占位 ID） */
const canOpenUserProfile = (msg: NotificationItem) => {
  const uid = msg.sourceId ?? msg.sender?.id
  return typeof uid === 'number' && uid > 0
}

/** 头像：始终进对方个人主页（与整行分发解耦） */
const handleAvatarClick = (msg: NotificationItem) => {
  if (!canOpenUserProfile(msg)) {
    toast.info('无法查看该用户')
    return
  }
  const uid = msg.sourceId ?? msg.sender?.id
  if (uid == null) return
  router.push(`/user/${uid}`)
}

/**
 * 消息分发：关注 -> 用户详情；点赞类/评论 -> 动态详情（与现有路由一致，可用 /user/detail、/post/detail 别名）
 * 点击时标记已读并刷新未读数，供底栏红点同步
 */
const handleMessageClick = async (msg: NotificationItem) => {
  if (!msg.isRead) {
    const ok = await notif.markOneRead(msg.id)
    if (!ok) {
      toast.fail('标记已读失败，请稍后再试')
    }
  }

  const t = (msg.type || '').toUpperCase()
  // 关注
  if (t === 'FOLLOW') {
    if (!canOpenUserProfile(msg)) {
      toast.info('无法查看该用户')
      return
    }
    const uid = msg.sourceId ?? msg.sender?.id
    if (uid == null) return
    router.push(`/user/${uid}`)
    return
  }

  // 互动：拥抱、评论、点赞（后端若扩展 LIKE 可命中）
  if (
    t === 'HUG' ||
    t === 'COMMENT' ||
    t === 'LIKE' ||
    t === 'like'.toUpperCase() ||
    t === 'comment'.toUpperCase()
  ) {
    const pid = (msg.targetId ?? msg.postId ?? '').trim()
    if (!pid) {
      toast.info('该内容暂不可用')
      return
    }
    try {
      await request.get(`/posts/${encodeURIComponent(pid)}`)
      router.push(`/detail/${encodeURIComponent(pid)}`)
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        toast.fail('该动态已消失在树林里')
        return
      }
      toast.fail('暂时无法打开，请稍后再试')
    }
    return
  }

  const pid = (msg.targetId ?? msg.postId ?? '').trim()
  if (pid) {
    try {
      await request.get(`/posts/${encodeURIComponent(pid)}`)
      router.push(`/detail/${encodeURIComponent(pid)}`)
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        toast.fail('该动态已消失在树林里')
        return
      }
      toast.fail('暂时无法打开，请稍后再试')
    }
    return
  }

  if (canOpenUserProfile(msg)) {
    const uid = msg.sourceId ?? msg.sender?.id
    if (uid != null) {
      router.push(`/user/${uid}`)
    }
  }
}
</script>

<template>
  <section class="animate-fade-in space-y-3">
    <div
      class="flex items-center justify-between rounded-[24px] border border-card bg-surface px-4 py-3 shadow-warm backdrop-blur-sm"
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
      <li v-for="n in notif.items" :key="n.id">
        <MessageItem
          :msg="n"
          :time-label="formatTime(n.createdAt)"
          @row-click="handleMessageClick"
          @avatar-click="handleAvatarClick"
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
