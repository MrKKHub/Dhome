import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import request from '@/api/request'
import type { PostMood } from '@/constants/moods'
import { MOOD_OPTIONS, randomTreeNickname } from '@/constants/moods'

export type { PostMood } from '@/constants/moods'

export interface PostItem {
  id: number
  avatar: string
  nickname: string
  title: string
  content: string
  images: string[]
  mood: PostMood
  liked: boolean
  favorited: boolean
  likes: number
  comments: number
  followsOnly: boolean
  createdAt: string
  /** 当前会话内由本机发布的帖子（用于「我的发布」） */
  isMine?: boolean
}

export interface CommentItem {
  id: number
  postId: number
  nickname: string
  avatar: string
  content: string
  createdAt: string
}

export interface PublishPayload {
  title: string
  content: string
  images: string[]
  mood: PostMood
  followsOnly: boolean
}

/** 后端 /posts 单条结构（兼容 snake_case / 嵌套 user） */
interface PostApiRow {
  id: number | string
  title?: string
  content?: string
  images?: unknown
  mood?: string
  follows_only?: boolean
  followsOnly?: boolean
  nickname?: string
  avatar?: string
  user_nickname?: string
  user_avatar?: string
  created_at?: string
  createdAt?: string
  liked?: boolean
  favorited?: boolean
  likes?: number
  likes_count?: number
  comments?: number
  comments_count?: number
  user?: {
    nickname?: string
    avatar?: string
    avatar_url?: string
  }
}

function apiIdToNumber(id: number | string): number {
  if (typeof id === 'number' && !Number.isNaN(id)) {
    return id
  }
  const s = String(id)
  const n = Number(s)
  if (!Number.isNaN(n) && String(n) === s) {
    return n
  }
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h) || 1
}

function normalizeImages(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string')
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string')
        : []
    } catch {
      return raw ? [raw] : []
    }
  }
  return []
}

function normalizeMood(raw: string | undefined): PostMood {
  if (raw && (MOOD_OPTIONS as readonly string[]).includes(raw)) {
    return raw as PostMood
  }
  return '平静'
}

function mapPostFromApi(raw: PostApiRow, overrides?: Partial<PostItem>): PostItem {
  const nick =
    raw.nickname ??
    raw.user_nickname ??
    raw.user?.nickname ??
    '树洞旅人'
  const avatar =
    raw.avatar ??
    raw.user_avatar ??
    raw.user?.avatar ??
    raw.user?.avatar_url ??
    `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(nick)}`
  const created =
    raw.created_at ?? raw.createdAt ?? new Date().toISOString()
  const createdLabel =
    typeof created === 'string' && created.length <= 20 && !created.includes('T')
      ? created
      : formatRelativeTime(created)

  return {
    id: apiIdToNumber(raw.id),
    avatar,
    nickname: nick,
    title: raw.title ?? '',
    content: raw.content ?? '',
    images: normalizeImages(raw.images),
    mood: normalizeMood(raw.mood),
    liked: raw.liked ?? false,
    favorited: raw.favorited ?? false,
    likes: raw.likes_count ?? raw.likes ?? 0,
    comments: raw.comments_count ?? raw.comments ?? 0,
    followsOnly: raw.follows_only ?? raw.followsOnly ?? false,
    createdAt: createdLabel,
    ...overrides,
  }
}

function formatRelativeTime(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) {
    return '刚刚'
  }
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) {
    return '刚刚'
  }
  if (m < 60) {
    return `${m} 分钟前`
  }
  const h = Math.floor(m / 60)
  if (h < 24) {
    return `${h} 小时前`
  }
  const d = Math.floor(h / 24)
  return `${d} 天前`
}

function unwrapPostsResponse(data: unknown): PostApiRow[] {
  if (Array.isArray(data)) {
    return data as PostApiRow[]
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    const inner = o.posts ?? o.data ?? o.items
    if (Array.isArray(inner)) {
      return inner as PostApiRow[]
    }
  }
  return []
}

const commentsByPostInit: Record<number, CommentItem[]> = {
  1: [
    {
      id: 1,
      postId: 1,
      nickname: '匿名小耳朵',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Azhe',
      content: '我懂那种被色彩轻轻抱住的感觉，像心里也亮了一点。',
      createdAt: '5 分钟前',
    },
    {
      id: 2,
      postId: 1,
      nickname: '路过的晚风',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Momo',
      content: '听起来好温柔，谢谢你愿意分享这份小确幸。',
      createdAt: '2 分钟前',
    },
  ],
  3: [
    {
      id: 3,
      postId: 3,
      nickname: '树洞倾听者',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Orange',
      content: '灯光层次改得好用心，像给房间盖了一层软软的被子。',
      createdAt: '11 分钟前',
    },
  ],
}

export const usePostStore = defineStore('post', () => {
  const posts = ref<PostItem[]>([])
  const feedChannel = ref<'recommended' | 'follow'>('recommended')
  const page = ref(0)
  const pageSize = ref(10)
  const finished = ref(false)
  const loading = ref(false)
  /** 与 van-list 的 v-model:loading 解耦：List 会先置 loading=true 再触发 load，不能用 loading 做互斥 */
  const listFetchInFlight = ref(false)
  const commentsByPost = ref<Record<number, CommentItem[]>>({ ...commentsByPostInit })

  const recommendedPosts = computed(() => posts.value)
  const followPosts = computed(() =>
    posts.value.filter((item) => item.followsOnly),
  )
  const feedSource = computed(() =>
    feedChannel.value === 'recommended' ? recommendedPosts.value : followPosts.value,
  )
  const visibleFeedPosts = computed(() =>
    feedSource.value.slice(0, page.value * pageSize.value),
  )

  /**
   * GET /posts：拉取列表并写入 posts
   */
  const fetchPosts = async () => {
    const res = await request.get<unknown>('/posts')
    const rows = unwrapPostsResponse(res.data)
    posts.value = rows.map((row) => mapPostFromApi(row))
  }

  /**
   * POST /posts：创建心情，并把返回（或本地拼装）插入列表头部
   */
  const addPost = async (data: PublishPayload) => {
    const body = {
      title: data.title,
      content: data.content,
      images: data.images,
      mood: data.mood,
      follows_only: data.followsOnly,
    }
    const res = await request.post<PostApiRow | { data?: PostApiRow }>('/posts', body)
    const raw = res.data
    const row: PostApiRow | undefined =
      raw && typeof raw === 'object' && 'id' in raw
        ? (raw as PostApiRow)
        : (raw as { data?: PostApiRow })?.data

    if (row && row.id != null) {
      posts.value.unshift(
        mapPostFromApi(row, {
          isMine: true,
        }),
      )
      return
    }

    const nick = randomTreeNickname()
    const nextId =
      posts.value.length === 0
        ? 1
        : Math.max(...posts.value.map((p) => p.id)) + 1
    posts.value.unshift({
      id: nextId,
      avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(nick)}`,
      nickname: nick,
      title: data.title,
      content: data.content,
      images: data.images,
      mood: data.mood,
      liked: false,
      favorited: false,
      likes: 0,
      comments: 0,
      followsOnly: data.followsOnly,
      createdAt: '刚刚',
      isMine: true,
    })
  }

  const toggleLike = (id: number) => {
    const target = posts.value.find((item) => item.id === id)
    if (!target) {
      return
    }
    target.liked = !target.liked
    target.likes += target.liked ? 1 : -1
  }

  const toggleFavorite = (id: number) => {
    const target = posts.value.find((item) => item.id === id)
    if (!target) {
      return
    }
    target.favorited = !target.favorited
  }

  const publishPost = async (payload: PublishPayload) => {
    await addPost(payload)
    if (feedChannel.value === 'recommended') {
      finished.value = false
    }
  }

  const getPostById = (id: number) =>
    posts.value.find((item) => item.id === id) ?? null

  const getCommentsByPost = (postId: number) => commentsByPost.value[postId] ?? []

  const addComment = (postId: number, content: string) => {
    const trimmed = content.trim()
    if (!trimmed) {
      return false
    }

    const nextId =
      Object.values(commentsByPost.value)
        .flat()
        .reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1

    const nick = randomTreeNickname()
    const nextComment: CommentItem = {
      id: nextId,
      postId,
      nickname: nick,
      avatar: `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(nick)}`,
      content: trimmed,
      createdAt: '刚刚',
    }

    const list = commentsByPost.value[postId] ?? []
    commentsByPost.value[postId] = [nextComment, ...list]

    const target = posts.value.find((item) => item.id === postId)
    if (target) {
      target.comments += 1
    }
    return true
  }

  const setFeedChannel = (channel: 'recommended' | 'follow') => {
    if (feedChannel.value === channel) {
      return
    }
    feedChannel.value = channel
    page.value = 0
    finished.value = false
  }

  const fetchNextPage = async () => {
    if (listFetchInFlight.value) {
      return
    }
    if (finished.value) {
      loading.value = false
      return
    }
    listFetchInFlight.value = true
    loading.value = true

    try {
      if (posts.value.length === 0) {
        await fetchPosts()
      }

      const total = feedSource.value.length
      const nextPage = page.value + 1
      const loadedCount = nextPage * pageSize.value
      page.value = nextPage
      finished.value = total === 0 || loadedCount >= total
    } finally {
      loading.value = false
      listFetchInFlight.value = false
    }
  }

  const refreshFeed = async () => {
    await fetchPosts()
    page.value = 0
    finished.value = false
    listFetchInFlight.value = false
    await fetchNextPage()
  }

  return {
    posts,
    page,
    pageSize,
    finished,
    loading,
    feedChannel,
    recommendedPosts,
    followPosts,
    visibleFeedPosts,
    fetchPosts,
    addPost,
    toggleLike,
    toggleFavorite,
    publishPost,
    getPostById,
    getCommentsByPost,
    addComment,
    setFeedChannel,
    fetchNextPage,
    refreshFeed,
  }
})
