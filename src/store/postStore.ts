import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { showToast } from 'vant'
import request from '@/api/request'
import type { PostMood } from '@/constants/moods'
import { MOOD_OPTIONS } from '@/constants/moods'
import { useUserStore } from '@/store/userStore'
import {
  resolveAvatarUrl,
  resolvePublicUploadUrl,
} from '@/utils/resolveAvatarUrl'

export type { PostMood } from '@/constants/moods'

/** POST /posts 成功后供发布页「共鸣时刻」展示的元信息 */
export type PublishResonanceMeta = {
  resonanceCount: number
  moodTag: string
}

/** 长河打捞：统一解析 Nest 响应里的 message，供 Toast 展示 */
function parseNestMessage(data: unknown): string | undefined {
  if (data == null || typeof data !== 'object') {
    return undefined
  }
  const raw = (data as { message?: unknown }).message
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim()
  }
  if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].trim()) {
    return raw[0].trim()
  }
  return undefined
}

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
  /** 森林匿名展示名（海报、卡片等） */
  anonymousName?: string
  /** Lucide 图标键，如 leaf */
  anonymousAvatarKey?: string
  /** 当前用户是否已关注作者（非匿名帖） */
  followingAuthor?: boolean
  /** 作者账号注册时间 ISO8601，非匿名帖用于「时光勋章」入住天数 */
  authorRegisteredAt?: string
  /** 时间胶囊 */
  isCapsule?: boolean
  /** 解锁时间 ISO（用于倒计时） */
  unlockAtIso?: string | null
  /** 接口标明当前用户视角下是否仍锁定 */
  capsuleLocked?: boolean
  /** 与 capsuleLocked 语义一致，便于模板以 isLocked 阅读 */
  isLocked?: boolean
  /** 时间胶囊：作者已手动拆封 */
  isOpened?: boolean
  /** 是否进入时光长河（打捞池） */
  isPublic?: boolean
  /** 来自长河打捞的匿名展示条 */
  isRiverCatch?: boolean
  posterSourceContent?: string
  posterSourceImages?: string[]
}

/** GET /user/:id/profile 聚合页（与轻量 /user/profile/:id 区分） */
export interface UserProfilePagePayload {
  success?: boolean
  id?: string
  nickname?: string
  avatar?: string | null
  /** 个人主页顶栏自定义背景（相对路径或完整 URL） */
  profileBackground?: string | null
  bio?: string | null
  followerCount?: number
  followingCount?: number
  isFollowedByViewer?: boolean
  isViewerSelf?: boolean
  moodLast7Days?: Array<{ mood: string; count: number }>
  moodPosts?: PostApiRow[]
  capsulePosts?: PostApiRow[]
  /** 账号注册时间 ISO8601，个人主页「时光勋章」 */
  registeredAt?: string
  registered_at?: string
}

/** 时光长河随机打捞结果（HTTP 层在 store 内消化，由页面弹 Vant Toast） */
export type SalvageRiverCapsuleResult =
  | { ok: true; item: PostItem }
  | { ok: false; item: null; message: string; emptyPool: boolean }

export interface CommentItem {
  id: string
  postId: string
  nickname: string
  avatar: string
  content: string
  createdAt: string
  parentId?: string | null
  /** 仅一级评论带嵌套；回复本身不再嵌套 */
  replies?: CommentItem[]
}

export interface PublishPayload {
  title: string
  content: string
  images: string[]
  mood: PostMood
  followsOnly: boolean
  /** 森林匿名发布 */
  isAnonymous?: boolean
  /** 时间胶囊 */
  isCapsule?: boolean
  /** ISO8601，仅胶囊帖需要（与 openTime 二选一，快捷预设用） */
  unlockAt?: string | null
  /** YYYY-MM-DD，自定义开启日（优先于 unlockAt） */
  openTime?: string | null
  /** 是否允许进入时光长河；默认 true */
  isPublic?: boolean
}

/** 发送拥抱时的可选参数 */
export type HugSendOptions = {
  isAnonymous?: boolean
  content?: string
}

/** 后端 /posts 单条结构（Prisma + author；兼容旧字段） */
interface PostApiRow {
  id: number | string
  authorId?: string | number | null
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
  isCapsule?: boolean
  unlockAt?: string | null
  capsuleLocked?: boolean
  /** 后端显式返回；缺省时与 capsuleLocked 一致 */
  isLocked?: boolean
  isPublic?: boolean
  isRiverCatch?: boolean
  isOpened?: boolean
  posterSourceContent?: string
  posterSourceImages?: unknown
  authorRegisteredAt?: string
  /** POST /posts 创建成功时附带：近 1 小时同心情他人帖数量 */
  resonanceCount?: number
  author?: {
    id?: string | number
    nickname?: string
    avatar?: string | null
    avatar_url?: string
    createdAt?: string
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

/** 解析作者注册时间：顶栏 authorRegisteredAt、author.createdAt / snake_case；Date.parse 校验，不依赖是否含字符 T */
function pickAuthorRegisteredAt(raw: PostApiRow): string | undefined {
  const candidates: string[] = []
  const push = (v: unknown) => {
    if (typeof v === 'string' && v.trim()) {
      candidates.push(v.trim())
    }
  }
  push(raw.authorRegisteredAt)
  const author = raw.author as
    | { createdAt?: string; created_at?: string }
    | undefined
  push(author?.createdAt)
  push(author?.created_at)
  const snake = (raw as { author_registered_at?: string }).author_registered_at
  push(snake)

  for (const s of candidates) {
    const t = Date.parse(s)
    if (!Number.isNaN(t)) {
      return s
    }
  }
  return undefined
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
    const anName =
      (typeof raw.author?.nickname === 'string' && raw.author.nickname.trim()) ||
      raw.anonymousName?.trim() ||
      '森林访客'
    const anKey = raw.anonymousAvatar?.trim() || 'leaf'
    return {
      id: sid,
      authorId: undefined,
      isAnonymous: true,
      anonymousName: anName,
      anonymousAvatarKey: anKey,
      nickname: anName,
      avatar: '',
      title: raw.title ?? '',
      content: raw.content ?? '',
      images: normalizeImages(raw.images).map(resolvePublicUploadUrl),
      mood: normalizeMood(raw.mood ?? raw.moodTag),
      liked: raw.liked ?? false,
      favorited: raw.favorited ?? false,
      likes: raw.hugCount ?? raw.likes_count ?? raw.likes ?? 0,
      comments: raw.commentCount ?? raw.comments_count ?? raw.comments ?? 0,
      followsOnly: raw.follows_only ?? raw.followsOnly ?? false,
      createdAt: createdLabel,
      followingAuthor: false,
      isCapsule: raw.isCapsule === true,
      unlockAtIso:
        typeof raw.unlockAt === 'string' && raw.unlockAt
          ? raw.unlockAt
          : null,
      capsuleLocked: raw.capsuleLocked === true,
      isLocked:
        raw.isLocked === true ||
        raw.capsuleLocked === true,
      isPublic: raw.isPublic !== false,
      isRiverCatch: raw.isRiverCatch === true,
      isOpened: raw.isCapsule === true ? raw.isOpened === true : undefined,
      posterSourceContent:
        typeof raw.posterSourceContent === 'string'
          ? raw.posterSourceContent
          : undefined,
      posterSourceImages: normalizeImages(raw.posterSourceImages).map(
        resolvePublicUploadUrl,
      ),
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
    raw.authorId != null && raw.authorId !== ''
      ? String(raw.authorId)
      : raw.author?.id != null
        ? String(raw.author.id)
        : undefined
  return {
    id: sid,
    authorId: aid,
    avatar,
    nickname: nick,
    title: raw.title ?? '',
    content: raw.content ?? '',
    images: normalizeImages(raw.images).map(resolvePublicUploadUrl),
    mood: normalizeMood(raw.mood ?? raw.moodTag),
    liked: raw.liked ?? false,
    favorited: raw.favorited ?? false,
    likes: raw.hugCount ?? raw.likes_count ?? raw.likes ?? 0,
    comments: raw.commentCount ?? raw.comments_count ?? raw.comments ?? 0,
    followsOnly: raw.follows_only ?? raw.followsOnly ?? false,
    createdAt: createdLabel,
    isAnonymous: false,
    followingAuthor: raw.followingAuthor ?? false,
    isCapsule: raw.isCapsule === true,
    unlockAtIso:
      typeof raw.unlockAt === 'string' && raw.unlockAt ? raw.unlockAt : null,
    capsuleLocked: raw.capsuleLocked === true,
    isLocked: raw.isLocked === true || raw.capsuleLocked === true,
    isPublic: raw.isPublic !== false,
    isRiverCatch: raw.isRiverCatch === true,
    isOpened: raw.isCapsule === true ? raw.isOpened === true : undefined,
    posterSourceContent:
      typeof raw.posterSourceContent === 'string'
        ? raw.posterSourceContent
        : undefined,
    posterSourceImages: normalizeImages(raw.posterSourceImages).map(
      resolvePublicUploadUrl,
    ),
    ...overrides,
    isMine: raw.isMine ?? overrides?.isMine ?? false,
    /** 帖子字段优先；个人主页映射时可由 overrides 传入资料页 registeredAt 兜底 */
    authorRegisteredAt: (() => {
      const fromRaw = pickAuthorRegisteredAt(raw)
      const ov = overrides?.authorRegisteredAt
      const fromOv =
        typeof ov === 'string' &&
        ov.trim() &&
        !Number.isNaN(Date.parse(ov.trim()))
          ? ov.trim()
          : undefined
      return fromRaw ?? fromOv
    })(),
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
  const addPost = async (
    data: PublishPayload,
  ): Promise<PublishResonanceMeta> => {
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
      isCapsule: data.isCapsule === true,
      openTime: data.openTime?.trim() || undefined,
      unlockAt:
        data.isCapsule === true && data.openTime?.trim()
          ? undefined
          : data.unlockAt ?? undefined,
      isPublic: data.isCapsule ? data.isPublic !== false : undefined,
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
    const rc = row.resonanceCount
    const resonanceCount =
      typeof rc === 'number' && Number.isFinite(rc) && rc >= 0
        ? Math.floor(rc)
        : 0
    const moodTag =
      String(row.moodTag ?? row.mood ?? data.mood ?? '')
        .trim() || String(data.mood)
    return { resonanceCount, moodTag }
  }

  const toggleLike = async (
    id: string,
    hugOpts?: HugSendOptions,
  ): Promise<{
    ok: boolean
    liked?: boolean
    hugAnonymous?: boolean
  }> => {
    const u = useUserStore()
    if (!u.isLoggedIn) {
      showToast('登录后才能拥抱')
      return { ok: false }
    }
    if (huggingPostId.value) {
      return { ok: false }
    }
    const target = posts.value.find((item) => item.id === id)
    if (!target) {
      return { ok: false }
    }
    const prevLiked = target.liked
    const prevCount = target.likes
    target.liked = !prevLiked
    target.likes += target.liked ? 1 : -1
    huggingPostId.value = id
    try {
      const payload =
        !prevLiked && hugOpts
          ? {
              isAnonymous: hugOpts.isAnonymous === true,
              content: hugOpts.content?.trim() || undefined,
            }
          : {}
      const res = await request.post<{
        success: boolean
        hugCount: number
        liked: boolean
      }>(`/posts/${encodeURIComponent(id)}/hug`, payload)
      if (res.data?.success) {
        target.likes = res.data.hugCount
        target.liked = res.data.liked
        if (!res.data.liked) {
          showToast('已取消拥抱')
        } else if (!hugOpts?.isAnonymous) {
          showToast('已送出拥抱')
        }
        return {
          ok: true,
          liked: res.data.liked,
          hugAnonymous: hugOpts?.isAnonymous === true,
        }
      }
      target.liked = prevLiked
      target.likes = prevCount
      showToast('操作失败，请稍后再试')
      return { ok: false }
    } catch (e) {
      target.liked = prevLiked
      target.likes = prevCount
      const msg = axios.isAxiosError(e) && e.response?.status === 401
        ? '请先登录'
        : '操作失败，请稍后再试'
      showToast(msg)
      return { ok: false }
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

  const publishPost = async (
    payload: PublishPayload,
  ): Promise<PublishResonanceMeta> => {
    const meta = await addPost(payload)
    if (feedChannel.value === 'recommended') {
      finished.value = false
    }
    return meta
  }

  const getPostById = (id: string) =>
    posts.value.find((item) => item.id === id) ?? null

  const getCommentsByPost = (postId: string) =>
    commentsByPost.value[postId] ?? []

  const mapCommentFromApi = (
    postId: string,
    c: {
      id: string
      content: string
      createdAt: string
      parentId?: string | null
      author: { nickname: string; avatar: string | null }
      replies?: Array<{
        id: string
        content: string
        createdAt: string
        parentId?: string | null
        author: { nickname: string; avatar: string | null }
      }>
    },
  ): CommentItem => {
    const iso =
      typeof c.createdAt === 'string' && c.createdAt.includes('T')
        ? c.createdAt
        : new Date().toISOString()
    const childReplies = Array.isArray(c.replies)
      ? c.replies.map((r) =>
          mapCommentFromApi(postId, {
            ...r,
            replies: undefined,
          }),
        )
      : []
    return {
      id: c.id,
      postId,
      nickname: c.author.nickname,
      avatar: resolveAvatarUrl(c.author.avatar, c.author.nickname),
      content: c.content,
      createdAt: formatRelativeTime(iso),
      parentId: c.parentId ?? null,
      replies: childReplies.length ? childReplies : undefined,
    }
  }

  const fetchComments = async (postId: string) => {
    try {
      const res = await request.get<{
        success: boolean
        comments: Array<{
          id: string
          content: string
          createdAt: string
          parentId?: string | null
          author: { nickname: string; avatar: string | null }
          replies?: Array<{
            id: string
            content: string
            createdAt: string
            parentId?: string | null
            author: { nickname: string; avatar: string | null }
          }>
        }>
      }>(`/posts/${encodeURIComponent(postId)}/comments`)
      if (!res.data?.success || !Array.isArray(res.data.comments)) {
        return
      }
      commentsByPost.value[postId] = res.data.comments.map((c) =>
        mapCommentFromApi(postId, c),
      )
    } catch {
      commentsByPost.value[postId] = []
    }
  }

  const addComment = async (
    postId: string,
    content: string,
    parentId?: string | null,
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
      const body: { postId: string; content: string; parentId?: string } = {
        postId,
        content: trimmed,
      }
      const pTrim = parentId?.trim()
      if (pTrim) {
        body.parentId = pTrim
      }
      const res = await request.post<{
        success: boolean
        commentCount: number
        comment: {
          id: string
          content: string
          createdAt: string
          parentId?: string | null
          author: { nickname: string; avatar: string | null }
        }
      }>('/comments', body)
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
        parentId: c.parentId ?? null,
      }
      const list = commentsByPost.value[postId] ?? []
      const pKey = c.parentId?.trim()
      if (pKey) {
        const parent = list.find((x) => x.id === pKey)
        if (parent) {
          const prev = parent.replies ?? []
          parent.replies = [...prev, item]
        } else {
          commentsByPost.value[postId] = [item, ...list]
        }
      } else {
        commentsByPost.value[postId] = [item, ...list]
      }
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
  /** 合并单条帖子到 feed，便于详情/长河打捞后仍能 getPostById */
  /**
   * GET /posts/:id：详情页补拉（胶囊馆等场景帖子可能不在 feed 内）
   */
  const fetchPostDetail = async (postId: string): Promise<PostItem | null> => {
    const id = postId.trim()
    if (!id) {
      return null
    }
    try {
      const res = await request.get<PostApiRow>(
        `/posts/${encodeURIComponent(id)}`,
      )
      const row = res.data
      if (!row || row.id == null || String(row.id).trim() === '') {
        return null
      }
      return ingestPostFromApiRow(row)
    } catch {
      return null
    }
  }

  /**
   * PATCH /posts/:id/open：作者手动拆封时间胶囊
   */
  const openCapsuleByAuthor = async (
    postId: string,
  ): Promise<{ ok: true; item: PostItem } | { ok: false; message: string }> => {
    const u = useUserStore()
    if (!u.isLoggedIn) {
      return { ok: false, message: '请先登录' }
    }
    const id = postId.trim()
    if (!id) {
      return { ok: false, message: '帖子无效' }
    }
    try {
      const res = await request.patch<PostApiRow>(
        `/posts/${encodeURIComponent(id)}/open`,
      )
      const row = res.data
      if (!row || row.id == null || String(row.id).trim() === '') {
        return { ok: false, message: '拆封失败' }
      }
      const item = ingestPostFromApiRow(row)
      return { ok: true, item }
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? parseNestMessage(e.response?.data)
        : undefined
      return {
        ok: false,
        message: msg || '拆封失败，请稍后再试',
      }
    }
  }

  /** DELETE /posts/:id：作者软删，无感从 feed 移除 */
  const deletePostByAuthor = async (
    postId: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    const id = postId.trim()
    if (!id) {
      return { ok: false, message: '帖子无效' }
    }
    const u = useUserStore()
    if (!u.isLoggedIn) {
      return { ok: false, message: '请先登录' }
    }
    try {
      await request.delete(`/posts/${encodeURIComponent(id)}`)
      const i = posts.value.findIndex((p) => p.id === id)
      if (i >= 0) {
        posts.value.splice(i, 1)
      }
      if (commentsByPost.value[id]) {
        delete commentsByPost.value[id]
      }
      showToast('心情已清理')
      return { ok: true }
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        return { ok: false, message: '请先登录' }
      }
      const msg = axios.isAxiosError(e)
        ? parseNestMessage(e.response?.data)
        : undefined
      return { ok: false, message: msg || '删除失败，请稍后再试' }
    }
  }

  const ingestPostFromApiRow = (raw: PostApiRow): PostItem => {
    const uid = useUserStore().userInfo?.id ?? null
    const aid = raw.authorId ?? raw.author?.id
    const item = mapPostFromApi(raw, {
      isMine:
        raw.isMine ??
        (uid != null && aid != null && String(aid) === String(uid)),
    })
    const i = posts.value.findIndex((p) => p.id === item.id)
    if (i >= 0) {
      posts.value[i] = { ...posts.value[i], ...item }
    } else {
      posts.value.unshift(item)
    }
    return item
  }

  /** GET /posts/capsules/mine */
  const fetchMyCapsulesList = async (): Promise<PostItem[]> => {
    const res = await request.get<PostApiRow[]>('/posts/capsules/mine')
    const data = Array.isArray(res.data) ? res.data : []
    return data.map((row) => mapPostFromApi(row, { isMine: true }))
  }

  /**
   * GET /posts/capsules/random：写入 store 供详情页使用。
   * 接受任意 HTTP 状态（validateStatus 全放行），把后端 message 带回给页面用白 Toast 展示。
   */
  const salvageRiverCapsule =
    async (): Promise<SalvageRiverCapsuleResult> => {
      try {
        const res = await request.get<PostApiRow | { message?: string }>(
          '/posts/capsules/random',
          { validateStatus: () => true },
        )
        const bodyMsg = parseNestMessage(res.data)

        if (res.status === 200) {
          const row = res.data as PostApiRow
          if (!row || row.id == null || String(row.id).trim() === '') {
            return {
              ok: false,
              item: null,
              message: bodyMsg || '打捞结果为空',
              emptyPool: false,
            }
          }
          return { ok: true, item: ingestPostFromApiRow(row) }
        }

        if (res.status === 404) {
          return {
            ok: false,
            item: null,
            message:
              bodyMsg || '长河里暂时还没有可打捞的公开胶囊',
            emptyPool: true,
          }
        }

        if (res.status === 401) {
          return {
            ok: false,
            item: null,
            message: bodyMsg || '请先登录',
            emptyPool: false,
          }
        }

        return {
          ok: false,
          item: null,
          message: bodyMsg || '打捞失败，请稍后再试',
          emptyPool: false,
        }
      } catch (e) {
        let message = '打捞失败，请稍后再试'
        if (axios.isAxiosError(e)) {
          message =
            parseNestMessage(e.response?.data) ||
            (typeof e.message === 'string' && e.message.trim()
              ? e.message
              : '') ||
            message
        }
        return {
          ok: false,
          item: null,
          message,
          emptyPool: false,
        }
      }
    }

  /**
   * 个人主页：心情帖 + 时间胶囊分栏；不写入全局 feed，避免污染首页列表。
   */
  const fetchUserProfilePage = async (
    userId: string,
  ): Promise<{
    profile: UserProfilePagePayload
    moodPosts: PostItem[]
    capsulePosts: PostItem[]
  } | null> => {
    try {
      const res = await request.get<UserProfilePagePayload>(
        `/user/${encodeURIComponent(userId)}/profile`,
      )
      const d = res.data
      if (!d || d.success === false) {
        return null
      }
      const uid = useUserStore().userInfo?.id ?? null
      const profileRegRaw =
        typeof d.registeredAt === 'string' && d.registeredAt.trim()
          ? d.registeredAt.trim()
          : typeof d.registered_at === 'string' && d.registered_at.trim()
            ? d.registered_at.trim()
            : ''
      const profileRegIso =
        profileRegRaw && !Number.isNaN(Date.parse(profileRegRaw))
          ? profileRegRaw
          : undefined

      const mapList = (rows: PostApiRow[] | undefined): PostItem[] => {
        if (!Array.isArray(rows)) {
          return []
        }
        return rows.map((r) =>
          mapPostFromApi(r, {
            isMine:
              r.isMine ??
              (uid != null &&
                String(r.authorId ?? r.author?.id ?? '') === String(uid)),
            ...(profileRegIso ? { authorRegisteredAt: profileRegIso } : {}),
          }),
        )
      }
      return {
        profile: d,
        moodPosts: mapList(d.moodPosts),
        capsulePosts: mapList(d.capsulePosts),
      }
    } catch {
      return null
    }
  }

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
    fetchUserProfilePage,
    fetchMyCapsulesList,
    salvageRiverCapsule,
    ingestPostFromApiRow,
    fetchPostDetail,
    openCapsuleByAuthor,
    deletePostByAuthor,
    patchMineAvatarDisplay,
    toggleFollowOnPost,
  }
})
