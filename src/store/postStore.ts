import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { showToast } from 'vant'
import request from '@/api/request'
import type { PostMood } from '@/constants/moods'
import { MOOD_OPTIONS } from '@/constants/moods'
import { useUserStore } from '@/store/userStore'
import { resolveAvatarUrl } from '@/utils/resolveAvatarUrl'

export type { PostMood } from '@/constants/moods'

export interface PostItem {
  /** 后端 Post UUID */
  id: string
  /** 已解析、可直接用于 img src（与资料页 resolveAvatarUrl 一致） */
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
  /** 作者用户 id（数字字符串），用于关注等；匿名帖接口不返回 */
  authorId?: string
  /** 森林匿名帖 */
  isAnonymous?: boolean
  /** Lucide 图标键，如 leaf */
  anonymousAvatarKey?: string
  /** 当前用户是否已关注作者（非匿名帖） */
  followingAuthor?: boolean
}

export interface CommentItem {
  id: string
  postId: string
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
  /** 森林匿名发布 */
  isAnonymous?: boolean
}

/** 后端 /posts 单条结构（Prisma + author；兼容旧字段） */
interface PostApiRow {
  id: number | string
  authorId?: string | number
  title?: string
  content?: string
  images?: unknown
  mood?: string
  moodTag?: string
  follows_only?: boolean
  followsOnly?: boolean
  isAnonymous?: boolean
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
  hugCount?: number
  comments?: number
  comments_count?: number
  commentCount?: number
  collectionCount?: number
  anonymousName?: string
  anonymousAvatar?: string
  isMine?: boolean
  followingAuthor?: boolean
  author?: {
    id?: string | number
    nickname?: string
    avatar?: string | null
    avatar_url?: string
  }
  user?: {
    nickname?: string
    avatar?: string
    avatar_url?: string
  }
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
  const sid =
    raw.id != null && String(raw.id).trim() !== '' ? String(raw.id) : ''
  const created =
    raw.created_at ?? raw.createdAt ?? new Date().toISOString()
  const createdLabel =
    typeof created === 'string' && created.length <= 20 && !created.includes('T')
      ? created
      : formatRelativeTime(created)

  if (raw.isAnonymous) {
    const anName = raw.anonymousName?.trim() || '森林访客'
    const anKey = raw.anonymousAvatar?.trim() || 'leaf'
    return {
      id: sid,
      authorId: undefined,
      isAnonymous: true,
      anonymousAvatarKey: anKey,
      nickname: anName,
      avatar: '',
      title: raw.title ?? '',
      content: raw.content ?? '',
      images: normalizeImages(raw.images),
      mood: normalizeMood(raw.mood ?? raw.moodTag),
      liked: raw.liked ?? false,
      favorited: raw.favorited ?? false,
      likes: raw.hugCount ?? raw.likes_count ?? raw.likes ?? 0,
      comments: raw.commentCount ?? raw.comments_count ?? raw.comments ?? 0,
      followsOnly: raw.follows_only ?? raw.followsOnly ?? false,
      createdAt: createdLabel,
      followingAuthor: false,
      ...overrides,
      isMine: raw.isMine ?? overrides?.isMine ?? false,
    }
  }

  const nick =
    raw.author?.nickname ??
    raw.nickname ??
    raw.user_nickname ??
    raw.user?.nickname ??
    '树洞旅人'
  const rawAvatar =
    raw.author?.avatar ??
    raw.avatar ??
    raw.user_avatar ??
    raw.user?.avatar ??
    raw.user?.avatar_url ??
    null
  const trimmed =
    typeof rawAvatar === 'string' && rawAvatar.trim() ? rawAvatar.trim() : null
  const avatar = resolveAvatarUrl(trimmed, nick)

  const aid =
    raw.author?.id != null
      ? String(raw.author.id)
      : raw.authorId != null
        ? String(raw.authorId)
        : undefined
  return {
    id: sid,
    authorId: aid,
    avatar,
    nickname: nick,
    title: raw.title ?? '',
    content: raw.content ?? '',
    images: normalizeImages(raw.images),
    mood: normalizeMood(raw.mood ?? raw.moodTag),
    liked: raw.liked ?? false,
    favorited: raw.favorited ?? false,
    likes: raw.hugCount ?? raw.likes_count ?? raw.likes ?? 0,
    comments: raw.commentCount ?? raw.comments_count ?? raw.comments ?? 0,
    followsOnly: raw.follows_only ?? raw.followsOnly ?? false,
    createdAt: createdLabel,
    isAnonymous: false,
    followingAuthor: raw.followingAuthor ?? false,
    ...overrides,
    isMine: raw.isMine ?? overrides?.isMine ?? false,
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

export const usePostStore = defineStore('post', () => {
  const posts = ref<PostItem[]>([])
  const feedChannel = ref<'recommended' | 'follow'>('recommended')
  const page = ref(0)
  const pageSize = ref(10)
  const finished = ref(false)
  const loading = ref(false)
  /** 与 van-list 的 v-model:loading 解耦：List 会先置 loading=true 再触发 load，不能用 loading 做互斥 */
  const listFetchInFlight = ref(false)
  const commentsByPost = ref<Record<string, CommentItem[]>>({})
  const huggingPostId = ref<string | null>(null)
  const favoritingPostId = ref<string | null>(null)
  const followTogglingAuthorId = ref<string | null>(null)

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
    const uid = useUserStore().userInfo?.id ?? null
    posts.value = rows.map((row) => {
      const aid = row.authorId ?? row.author?.id
      return mapPostFromApi(row, {
        isMine:
          row.isMine ??
          (uid != null && aid != null && String(aid) === uid),
      })
    })
  }

  /**
   * POST /posts：创建心情，并把返回（或本地拼装）插入列表头部
   */
  const addPost = async (data: PublishPayload) => {
    const remoteImages = data.images.filter(
      (u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim()),
    )
    const body = {
      title: data.title,
      content: data.content,
      images: remoteImages,
      moodTag: data.mood,
      mood: data.mood,
      isAnonymous: data.isAnonymous ?? false,
    }
    const res = await request.post<PostApiRow>('/posts', body)
    const row = res.data
    if (!row || row.id == null || row.id === '') {
      throw new Error('发布接口未返回帖子数据')
    }
    const item = mapPostFromApi(row, {
      isMine: true,
      followsOnly: data.followsOnly,
    })
    if (!item.id) {
      throw new Error('发布接口未返回有效帖子 id')
    }
    posts.value.unshift(item)
  }

  const toggleLike = async (id: string) => {
    const u = useUserStore()
    if (!u.isLoggedIn) {
      showToast('登录后才能拥抱')
      return
    }
    if (huggingPostId.value) {
      return
    }
    const target = posts.value.find((item) => item.id === id)
    if (!target) {
      return
    }
    const prevLiked = target.liked
    const prevCount = target.likes
    target.liked = !prevLiked
    target.likes += target.liked ? 1 : -1
    huggingPostId.value = id
    try {
      const res = await request.post<{
        success: boolean
        hugCount: number
        liked: boolean
      }>(`/posts/${encodeURIComponent(id)}/hug`)
      if (res.data?.success) {
        target.likes = res.data.hugCount
        target.liked = res.data.liked
        showToast(res.data.liked ? '已送出拥抱' : '已取消拥抱')
      }
    } catch (e) {
      target.liked = prevLiked
      target.likes = prevCount
      const msg = axios.isAxiosError(e) && e.response?.status === 401
        ? '请先登录'
        : '操作失败，请稍后再试'
      showToast(msg)
    } finally {
      huggingPostId.value = null
    }
  }

  const toggleFavorite = async (id: string) => {
    const u = useUserStore()
    if (!u.isLoggedIn) {
      showToast('登录后才能收藏')
      return
    }
    if (favoritingPostId.value) {
      return
    }
    const target = posts.value.find((item) => item.id === id)
    if (!target) {
      return
    }
    const prevFav = target.favorited
    target.favorited = !prevFav
    favoritingPostId.value = id
    try {
      const res = await request.post<{
        success: boolean
        collectionCount: number
        favorited: boolean
      }>(`/posts/${encodeURIComponent(id)}/collect`)
      if (res.data?.success) {
        target.favorited = res.data.favorited
        showToast(res.data.favorited ? '已收藏' : '已取消收藏')
      }
    } catch (e) {
      target.favorited = prevFav
      const msg = axios.isAxiosError(e) && e.response?.status === 401
        ? '请先登录'
        : '操作失败，请稍后再试'
      showToast(msg)
    } finally {
      favoritingPostId.value = null
    }
  }

  const publishPost = async (payload: PublishPayload) => {
    await addPost(payload)
    if (feedChannel.value === 'recommended') {
      finished.value = false
    }
  }

  const getPostById = (id: string) =>
    posts.value.find((item) => item.id === id) ?? null

  const getCommentsByPost = (postId: string) =>
    commentsByPost.value[postId] ?? []

  const fetchComments = async (postId: string) => {
    try {
      const res = await request.get<{
        success: boolean
        comments: Array<{
          id: string
          content: string
          createdAt: string
          author: { nickname: string; avatar: string | null }
        }>
      }>(`/posts/${encodeURIComponent(postId)}/comments`)
      if (!res.data?.success || !Array.isArray(res.data.comments)) {
        return
      }
      commentsByPost.value[postId] = res.data.comments.map((c) => ({
        id: c.id,
        postId,
        nickname: c.author.nickname,
        avatar: resolveAvatarUrl(c.author.avatar, c.author.nickname),
        content: c.content,
        createdAt:
          typeof c.createdAt === 'string' && c.createdAt.includes('T')
            ? formatRelativeTime(c.createdAt)
            : String(c.createdAt),
      }))
    } catch {
      commentsByPost.value[postId] = []
    }
  }

  const addComment = async (
    postId: string,
    content: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    const trimmed = content.trim()
    if (!trimmed) {
      return { ok: false, message: '写一点点再发送吧' }
    }
    const u = useUserStore()
    if (!u.isLoggedIn) {
      showToast('登录后才能留言')
      return { ok: false, message: '未登录' }
    }
    try {
      const res = await request.post<{
        success: boolean
        commentCount: number
        comment: {
          id: string
          content: string
          createdAt: string
          author: { nickname: string; avatar: string | null }
        }
      }>('/comments', { postId, content: trimmed })
      const d = res.data
      if (!d?.success || !d.comment) {
        return { ok: false, message: '发送失败' }
      }
      const c = d.comment
      const iso =
        typeof c.createdAt === 'string' && c.createdAt.includes('T')
          ? c.createdAt
          : new Date().toISOString()
      const item: CommentItem = {
        id: c.id,
        postId,
        nickname: c.author.nickname,
        avatar: resolveAvatarUrl(c.author.avatar, c.author.nickname),
        content: c.content,
        createdAt: formatRelativeTime(iso),
      }
      const list = commentsByPost.value[postId] ?? []
      commentsByPost.value[postId] = [item, ...list]
      const target = posts.value.find((p) => p.id === postId)
      if (target) {
        target.comments = d.commentCount
      }
      return { ok: true }
    } catch (e) {
      const msg =
        axios.isAxiosError(e) && e.response?.status === 401
          ? '请先登录'
          : '发送失败，请稍后再试'
      showToast(msg)
      return { ok: false, message: msg }
    }
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
    } catch {
      // 避免接口失败时 van-list 一直认为未 finished 而反复触发 @load
      finished.value = true
    } finally {
      loading.value = false
      listFetchInFlight.value = false
    }
  }

  const refreshFeed = async () => {
    try {
      await fetchPosts()
      page.value = 0
      finished.value = false
      listFetchInFlight.value = false
      await fetchNextPage()
    } catch {
      finished.value = true
    }
  }

  /** 随机拾起一条他人心情（需登录，GET /posts/random） */
  const fetchRandomPickup = async (): Promise<PostItem> => {
    const res = await request.get<PostApiRow>('/posts/random')
    const row = res.data
    if (!row || row.id == null || row.id === '') {
      throw new Error('随机心情数据为空')
    }
    const uid = useUserStore().userInfo?.id ?? null
    return mapPostFromApi(row, {
      isMine:
        row.isMine ??
        (uid != null &&
          String(row.authorId ?? row.author?.id ?? '') === String(uid)),
    })
  }

  /**
   * 绿叶关注：POST /follow/:id，可选 postId 供后端匿名路径禁区校验
   * @returns 关注态是否为 true；失败或取消为 false；未登录等为 null
   */
  const toggleFollowOnPost = async (
    authorId: string,
    postId: string,
  ): Promise<boolean | null> => {
    const u = useUserStore()
    if (!u.isLoggedIn) {
      showToast('登录后再种下思念吧')
      return null
    }
    if (!authorId || followTogglingAuthorId.value) {
      return null
    }
    followTogglingAuthorId.value = authorId
    try {
      const res = await request.post<{
        success?: boolean
        isFollowing?: boolean
      }>(`/follow/${encodeURIComponent(authorId)}`, { postId })
      const following = !!res.data?.isFollowing
      for (const p of posts.value) {
        if (p.authorId === authorId) {
          p.followingAuthor = following
        }
      }
      showToast(
        following
          ? '已与这位森林伙伴建立连接'
          : '已松开这片叶子的手',
      )
      return following
    } catch (e) {
      const msg =
        axios.isAxiosError(e) && e.response?.status === 401
          ? '请先登录'
          : axios.isAxiosError(e) && e.response?.status === 403
            ? String(
                (e.response?.data as { message?: string })?.message ||
                  '暂时无法关注',
              )
            : '操作失败，请稍后再试'
      showToast(msg)
      return null
    } finally {
      followTogglingAuthorId.value = null
    }
  }

  /** 本地资料头像更新后，同步首页/详情里「我的帖子」展示，避免等重新拉列表 */
  const patchMineAvatarDisplay = (displayUrl: string) => {
    for (const p of posts.value) {
      if (p.isMine && !p.isAnonymous) {
        p.avatar = displayUrl
      }
    }
  }

  return {
    huggingPostId,
    favoritingPostId,
    followTogglingAuthorId,
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
    fetchComments,
    addComment,
    setFeedChannel,
    fetchNextPage,
    refreshFeed,
    fetchRandomPickup,
    patchMineAvatarDisplay,
    toggleFollowOnPost,
  }
})
