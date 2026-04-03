import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import request from '@/api/request'

export type NotificationItem = {
  id: string
  type: string
  isRead: boolean
  postId: string | null
  createdAt: string
  sender: { id: number; nickname: string; avatar: string | null }
}

export function formatNotificationText(n: NotificationItem): string {
  const name = n.sender.nickname || '有人'
  if (n.type === 'HUG') {
    return `${name} 给你的帖子送了一个拥抱`
  }
  if (n.type === 'COMMENT') {
    return `${name} 评论了你的帖子`
  }
  if (n.type === 'FOLLOW') {
    return `${name} 关注了你`
  }
  return `${name} 与你产生了互动`
}

export const useNotificationStore = defineStore('notification', () => {
  const items = ref<NotificationItem[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const markingRead = ref(false)

  const fetchList = async (): Promise<boolean> => {
    loading.value = true
    try {
      const res = await request.get<{
        success?: boolean
        items?: NotificationItem[]
        unreadCount?: number
      }>('/notifications')
      if (res.data?.success !== false) {
        const d = res.data ?? {}
        if (Array.isArray(d.items)) {
          items.value = d.items
        }
        if (typeof d.unreadCount === 'number') {
          unreadCount.value = d.unreadCount
        }
        return true
      }
      return false
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        items.value = []
        unreadCount.value = 0
      }
      return false
    } finally {
      loading.value = false
    }
  }

  /** 仅刷新未读数（轻量，用于顶栏红点） */
  const fetchUnreadOnly = async () => {
    try {
      const res = await request.get<{
        unreadCount?: number
      }>('/notifications')
      if (typeof res.data?.unreadCount === 'number') {
        unreadCount.value = res.data.unreadCount
      }
    } catch {
      // 未登录或网络错误时忽略
    }
  }

  const markAllRead = async (): Promise<boolean> => {
    if (markingRead.value) {
      return false
    }
    markingRead.value = true
    try {
      await request.patch('/notifications/read-all')
      unreadCount.value = 0
      items.value = items.value.map((x) => ({ ...x, isRead: true }))
      return true
    } catch {
      return false
    } finally {
      markingRead.value = false
    }
  }

  return {
    items,
    unreadCount,
    loading,
    markingRead,
    fetchList,
    fetchUnreadOnly,
    markAllRead,
  }
})
