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
  /** 触发者用户 ID（与 sender.id 对齐，便于列表项与跳转） */
  sourceId: number
  /** 关联内容 ID：动态类为 postId；关注类一般为 null */
  targetId: string | null
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

/** 列表接口行（可能不含 sourceId/targetId，入库前补齐） */
type NotificationListRow = Omit<NotificationItem, 'sourceId' | 'targetId'> & {
  sourceId?: number
  targetId?: string | null
}

/** 将接口行规范为带 sourceId / targetId 的列表项 */
function normalizeNotificationItem(raw: NotificationListRow): NotificationItem {
  const sender = raw.sender ?? { id: 0, nickname: '', avatar: null }
  return {
    ...raw,
    sender,
    sourceId: raw.sourceId ?? sender.id,
    targetId: raw.targetId ?? raw.postId ?? null,
  }
}

export const useNotificationStore = defineStore('notification', () => {
  const items = ref<NotificationItem[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const markingRead = ref(false)
  /** 单条标记已读进行中，防重复提交 */
  const markingOneReadId = ref<string | null>(null)

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
          items.value = d.items.map((x) =>
            normalizeNotificationItem(x as NotificationListRow),
          )
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

  /**
   * 单条已读：PATCH /notifications/:id/read
   * 已读项直接成功，不请求接口；成功后同步 unreadCount 供底栏红点使用
   */
  const markOneRead = async (notificationId: string): Promise<boolean> => {
    const id = notificationId.trim()
    if (!id) {
      return false
    }
    const idx = items.value.findIndex((x) => x.id === id)
    const current = idx >= 0 ? items.value[idx] : null
    if (current?.isRead) {
      return true
    }
    if (markingOneReadId.value === id) {
      return false
    }
    markingOneReadId.value = id
    try {
      const res = await request.patch<{
        success?: boolean
        unreadCount?: number
      }>(`/notifications/${encodeURIComponent(id)}/read`)
      if (res.data?.success === false) {
        return false
      }
      if (idx >= 0) {
        items.value[idx] = { ...items.value[idx], isRead: true }
      }
      if (typeof res.data?.unreadCount === 'number') {
        unreadCount.value = res.data.unreadCount
      } else {
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
      return true
    } catch {
      return false
    } finally {
      markingOneReadId.value = null
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
    markOneRead,
  }
})
