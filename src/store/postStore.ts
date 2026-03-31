import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export interface PostItem {
  id: number
  avatar: string
  nickname: string
  title: string
  content: string
  images: string[]
  liked: boolean
  favorited: boolean
  likes: number
  comments: number
  followsOnly: boolean
  createdAt: string
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
  followsOnly: boolean
}

const mockPosts: PostItem[] = [
  {
    id: 1,
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Iris',
    nickname: 'Iris',
    title: '周末去城南看展，色彩能量太治愈了',
    content:
      '入口处的光影装置很适合拍人像，建议 16:00 以后去，室内自然光会更柔和。展馆周边咖啡也很不错。',
    images: [
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
    ],
    liked: false,
    favorited: false,
    likes: 96,
    comments: 18,
    followsOnly: false,
    createdAt: '刚刚',
  },
  {
    id: 2,
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Noah',
    nickname: 'Noah',
    title: '晨跑路线升级：江边 5 公里',
    content: '天气转暖后，早晨风很舒服，建议大家补水要跟上。',
    images: [],
    liked: true,
    favorited: false,
    likes: 231,
    comments: 42,
    followsOnly: true,
    createdAt: '12 分钟前',
  },
  {
    id: 3,
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Luna',
    nickname: 'Luna',
    title: '做了一个轻盈奶油风客厅改造',
    content:
      '这次重点做了软装和灯光层次。单盏落地灯 + 暖白射灯就能让空间氛围有明显提升。图片按步骤排了顺序。',
    images: [
      'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505409859467-3a796fd5798e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505692952047-1a78307da8f2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=800&q=80',
    ],
    liked: false,
    favorited: true,
    likes: 543,
    comments: 88,
    followsOnly: true,
    createdAt: '39 分钟前',
  },
  {
    id: 4,
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Kai',
    nickname: 'Kai',
    title: '今晚的云层太电影感了',
    content:
      '随机抓拍了九张，参数都差不多，后期只微调了高光和对比。最后一张是我最喜欢的那张。',
    images: [
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518176258769-f227c798150e?auto=format&fit=crop&w=800&q=80',
    ],
    liked: false,
    favorited: false,
    likes: 112,
    comments: 24,
    followsOnly: false,
    createdAt: '1 小时前',
  },
  {
    id: 5,
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Mia',
    nickname: 'Mia',
    title: '新品甜点试做成功',
    content: '外层是抹茶慕斯，夹心是柚子果冻，口感比预期更清爽。',
    images: [
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
    ],
    liked: true,
    favorited: true,
    likes: 317,
    comments: 65,
    followsOnly: false,
    createdAt: '2 小时前',
  },
]

const extraMockPosts: PostItem[] = Array.from({ length: 18 }).map((_, idx) => {
  const seed = mockPosts[idx % mockPosts.length]
  const id = 100 + idx + 1
  return {
    ...seed,
    id,
    nickname: `${seed.nickname}${idx + 1}`,
    title: `${seed.title} · Vol.${idx + 1}`,
    createdAt: `${idx + 3} 小时前`,
    liked: false,
    favorited: false,
    likes: Math.max(12, seed.likes - idx * 3),
    comments: Math.max(2, seed.comments - idx),
  }
})

export const usePostStore = defineStore('post', () => {
  const posts = ref<PostItem[]>([...mockPosts, ...extraMockPosts])
  const feedChannel = ref<'recommended' | 'follow'>('recommended')
  const page = ref(0)
  const pageSize = ref(10)
  const finished = ref(false)
  const loading = ref(false)
  /** 与 van-list 的 v-model:loading 解耦：List 会先置 loading=true 再触发 load，不能用 loading 做互斥 */
  const listFetchInFlight = ref(false)
  const commentsByPost = ref<Record<number, CommentItem[]>>({
    1: [
      {
        id: 1,
        postId: 1,
        nickname: '阿哲',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Azhe',
        content: '这个展看起来很棒，周末也去看看！',
        createdAt: '5 分钟前',
      },
      {
        id: 2,
        postId: 1,
        nickname: 'Momo',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Momo',
        content: '配色真的太舒服了，感谢推荐。',
        createdAt: '2 分钟前',
      },
    ],
    3: [
      {
        id: 3,
        postId: 3,
        nickname: '橘子汽水',
        avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Orange',
        content: '客厅改造前后对比太明显了！',
        createdAt: '11 分钟前',
      },
    ],
  })

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

  const publishPost = (payload: PublishPayload) => {
    const nextId = posts.value[0] ? posts.value[0].id + 1 : 1
    posts.value.unshift({
      id: nextId,
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=You',
      nickname: '你自己',
      title: payload.title,
      content: payload.content,
      images: payload.images,
      liked: false,
      favorited: false,
      likes: 0,
      comments: 0,
      followsOnly: payload.followsOnly,
      createdAt: '刚刚',
    })
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

    const nextId = Object.values(commentsByPost.value)
      .flat()
      .reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1

    const nextComment: CommentItem = {
      id: nextId,
      postId,
      nickname: '你自己',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=You',
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
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 800)
      })

      const total = feedSource.value.length
      const nextPage = page.value + 1
      const loadedCount = nextPage * pageSize.value
      page.value = nextPage
      finished.value = loadedCount >= total
    } finally {
      loading.value = false
      listFetchInFlight.value = false
    }
  }

  const refreshFeed = async () => {
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
