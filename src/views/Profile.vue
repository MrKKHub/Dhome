<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import {
  Bell,
  ChevronRight,
  FileText,
  Heart,
  LogOut,
  PencilLine,
  ShieldCheck,
  UserRound,
  WalletCards,
} from 'lucide-vue-next'
import { showConfirmDialog, showToast } from 'vant'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import request from '@/api/request'
import PostCard from '@/components/PostCard.vue'
import { useAppToast } from '@/composables/useAppToast'
import { usePostStore } from '@/store/postStore'
import { useUserStore } from '@/store/userStore'
import { compressImageToWebp } from '@/utils/compressImage'
import { resolveAvatarUrl } from '@/utils/resolveAvatarUrl'

type CenterTab = '我的发布' | '我的收藏' | '草稿箱'

interface DraftItem {
  id: number
  title: string
  content: string
  updatedAt: string
}

const router = useRouter()
const store = usePostStore()
const { huggingPostId, favoritingPostId } = storeToRefs(store)
const userStore = useUserStore()
const toast = useAppToast()
const activeTab = ref<CenterTab>('我的发布')
const avatarFileInput = useTemplateRef<HTMLInputElement>('avatarFileInput')

const draftList = ref<DraftItem[]>([
  {
    id: 1,
    title: '春季穿搭灵感合集',
    content: '整理了 8 套通勤和周末都能穿的搭配，还差最后两张细节图。',
    updatedAt: '今天 15:21',
  },
  {
    id: 2,
    title: '我的居家办公桌面改造',
    content: '计划补充灯光参数和桌垫链接，明天发。',
    updatedAt: '昨天 22:08',
  },
])

const myPosts = computed(() => store.posts.filter((item) => item.isMine))
const myFavorites = computed(() =>
  store.posts.filter((item) => item.favorited),
)

const totalLikes = computed(() =>
  myPosts.value.reduce((sum, item) => sum + item.likes, 0),
)

const displayName = computed(() => {
  const u = userStore.userInfo
  return u ? u.nickname : '访客'
})

const avatarSrc = computed(() => {
  const u = userStore.userInfo
  return resolveAvatarUrl(u?.avatar, u?.email ?? 'You')
})

const accountLine = computed(() => {
  if (!userStore.isLoggedIn) {
    return '未登录，登录后解锁完整能力'
  }
  const u = userStore.userInfo
  const acc = u ? u.email : ''
  return acc ? `邮箱 ${acc}` : '邮箱'
})

const settings: Array<{
  icon: typeof UserRound
  label: string
  desc: string
  action?: 'notifications'
}> = [
  { icon: UserRound, label: '账号与安全', desc: '手机号、密码、设备管理' },
  {
    icon: Bell,
    label: '消息通知',
    desc: '评论、点赞、关注提醒',
    action: 'notifications',
  },
  { icon: WalletCards, label: '隐私设置', desc: '动态可见范围、黑名单' },
  { icon: ShieldCheck, label: '社区规范', desc: '举报与反馈、帮助中心' },
]

const centerTabs: CenterTab[] = ['我的发布', '我的收藏']

const followerCount = ref(0)
const followingCount = ref(0)
const postsLast7DaysCount = ref(0)
const moodLast7Days = ref<Array<{ mood: string; count: number }>>([])

async function loadProfileCounts() {
  const id = userStore.userInfo?.id
  if (!id) {
    followerCount.value = 0
    followingCount.value = 0
    postsLast7DaysCount.value = 0
    moodLast7Days.value = []
    return
  }
  try {
    const res = await request.get<{
      followerCount?: number
      followingCount?: number
      postsLast7DaysCount?: number
      moodLast7Days?: Array<{ mood: string; count: number }>
    }>(`/user/profile/${id}`)
    followerCount.value = res.data?.followerCount ?? 0
    followingCount.value = res.data?.followingCount ?? 0
    postsLast7DaysCount.value = res.data?.postsLast7DaysCount ?? 0
    moodLast7Days.value = Array.isArray(res.data?.moodLast7Days)
      ? res.data!.moodLast7Days!
      : []
  } catch {
    followerCount.value = 0
    followingCount.value = 0
    postsLast7DaysCount.value = 0
    moodLast7Days.value = []
  }
}

const onSettingsRow = (item: (typeof settings)[number]) => {
  if (item.action === 'notifications') {
    if (!userStore.isLoggedIn) {
      router.push('/login?redirect=/notifications')
      return
    }
    router.push('/notifications')
  }
}

onMounted(loadProfileCounts)
watch(
  () => userStore.userInfo?.id,
  () => {
    loadProfileCounts()
  },
)

const openPost = (id: string) => router.push(`/detail/${encodeURIComponent(id)}`)
const setCenterTab = (tab: CenterTab) => {
  activeTab.value = tab
}

const removeDraft = (id: number) => {
  draftList.value = draftList.value.filter((item) => item.id !== id)
  showToast('草稿已删除')
}

const triggerAvatarPick = () => {
  if (!userStore.isLoggedIn) {
    router.push('/login?redirect=/profile')
    return
  }
  avatarFileInput.value?.click()
}

const onAvatarFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !userStore.isLoggedIn) return
  let toSend = file
  try {
    const blob = await compressImageToWebp(file, 400, 0.8)
    toSend = new File([blob], 'avatar.webp', { type: 'image/webp' })
  } catch {
    toSend = file
  }
  const r = await userStore.uploadAvatar(toSend)
  if (r.ok) {
    toast.success(r.message)
  } else {
    toast.fail(r.message)
  }
  if (r.ok) {
    const u = userStore.userInfo
    if (u) {
      store.patchMineAvatarDisplay(resolveAvatarUrl(u.avatar, u.email))
    }
  }
  if (!r.ok && r.message.includes('登录')) {
    router.push('/login?redirect=/profile')
  }
}

const handleLogout = async () => {
  if (!userStore.isLoggedIn) {
    router.push('/login?redirect=/profile')
    return
  }
  try {
    await showConfirmDialog({
      title: '退出登录',
      message: '退出后将返回首页，是否继续？',
      confirmButtonText: '退出',
      cancelButtonText: '取消',
    })
    userStore.logout()
    showToast('已退出登录')
    router.push('/')
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <!-- 整页随主区域滚动；Tab 内列表单独 profile-tab-inner-scroll 限高，避免长列表撑破屏 -->
  <section class="space-y-3 animate-fade-in">
    <div
      class="rounded-[28px] border border-[#F0E8E0]/80 bg-white/95 p-4 shadow-warm backdrop-blur-sm"
    >
      <div class="mb-3 flex items-center gap-3">
        <input
          ref="avatarFileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onAvatarFileChange"
        />
        <button
          type="button"
          class="relative shrink-0 rounded-full border border-[#F0E8E0] transition-transform duration-200 active:scale-[0.94] disabled:pointer-events-none"
          :disabled="userStore.uploadingAvatar"
          aria-label="更换头像"
          @click="triggerAvatarPick"
        >
          <img
            :src="avatarSrc"
            alt="头像"
            class="h-14 w-14 rounded-full object-cover"
          />
          <span
            v-if="userStore.uploadingAvatar"
            class="absolute inset-0 flex items-center justify-center rounded-full bg-warmInk/25 text-[10px] font-medium text-white"
          >
            …
          </span>
        </button>
        <div>
          <h2 class="text-[17px] font-semibold leading-snug text-warmInk">
            {{ displayName }}
          </h2>
          <p class="text-[12px] text-warmInk/45">
            {{ accountLine }}
          </p>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-xl bg-apricot/60 py-2">
          <p class="text-[17px] font-semibold text-warmInk">{{ followingCount }}</p>
          <p class="text-[12px] text-warmInk/40">关注</p>
        </div>
        <div class="rounded-xl bg-apricot/60 py-2">
          <p class="text-[17px] font-semibold text-warmInk">{{ followerCount }}</p>
          <p class="text-[12px] text-warmInk/40">粉丝</p>
        </div>
        <div class="rounded-xl bg-apricot/60 py-2">
          <p class="text-[17px] font-semibold text-warmInk">{{ totalLikes }}</p>
          <p class="text-[12px] text-warmInk/40">拥抱</p>
        </div>
      </div>
    </div>

    <div
      v-if="userStore.isLoggedIn"
      class="rounded-[28px] border border-[#F0E8E0]/80 bg-white/95 p-4 shadow-warm backdrop-blur-sm"
    >
      <h3 class="mb-2 text-[15px] font-semibold text-warmInk">本周心情统计</h3>
      <p class="mb-3 text-[12px] text-warmInk/45">
        近 7 天你共记录了 {{ postsLast7DaysCount }} 条心情。
      </p>
      <ul v-if="moodLast7Days.length" class="space-y-2">
        <li
          v-for="row in moodLast7Days"
          :key="row.mood"
          class="flex items-center justify-between rounded-xl bg-apricot/50 px-3 py-2 text-[13px]"
        >
          <span class="font-medium text-warmInk">{{ row.mood }}</span>
          <span class="tabular-nums text-warmInk/55">{{ row.count }} 次</span>
        </li>
      </ul>
      <p v-else class="text-[13px] text-warmInk/40">本周还没有新记录，去发一条树洞吧。</p>
    </div>

    <div
      class="rounded-[28px] border border-[#F0E8E0]/80 bg-white/95 p-2 shadow-warm backdrop-blur-sm"
    >
      <button
        v-for="item in settings"
        :key="item.label"
        type="button"
        class="mb-2 flex w-full items-center justify-between rounded-2xl bg-apricot/50 px-3 py-3 text-left transition-all duration-200 last:mb-0 active:scale-[0.97]"
        @click="onSettingsRow(item)"
      >
        <div class="flex items-center gap-2">
          <component :is="item.icon" class="h-4 w-4 text-warmInk/45" />
          <div>
            <p class="text-[14px] font-semibold text-warmInk">{{ item.label }}</p>
            <p class="text-[12px] text-warmInk/40">{{ item.desc }}</p>
          </div>
        </div>
        <ChevronRight class="h-4 w-4 text-warmInk/35" />
      </button>
    </div>

    <div
      class="rounded-[28px] border border-[#F0E8E0]/80 bg-white/95 p-3 shadow-warm backdrop-blur-sm"
    >
      <div class="mb-3 flex rounded-full bg-apricot/80 p-1">
        <button
          v-for="tab in centerTabs"
          :key="tab"
          type="button"
          class="flex-1 rounded-full px-3 py-2 text-[13px] transition-all duration-200 active:scale-[0.97]"
          :class="
            activeTab === tab
              ? 'bg-white font-semibold text-warmInk shadow-sm'
              : 'text-warmInk/45'
          "
          @click="setCenterTab(tab)"
        >
          {{ tab }}
        </button>
      </div>

      <!-- v-show 保留三块 DOM，切换 Tab 时各自滚动位置互不影响 -->
      <div>
        <div
          v-show="activeTab === '我的发布'"
          class="profile-local-scroll profile-tab-inner-scroll rounded-2xl"
        >
          <div v-if="myPosts.length" class="space-y-5 pb-2">
            <PostCard
              v-for="post in myPosts"
              :key="post.id"
              :post="post"
              :hug-disabled="huggingPostId === post.id"
              :favorite-disabled="favoritingPostId === post.id"
              @favorite="store.toggleFavorite"
              @open="openPost"
              @comment="openPost"
            />
          </div>
          <div
            v-else
            class="profile-scroll-empty rounded-2xl bg-apricot/60 text-[13px] text-warmInk/50"
          >
            你还没有发布内容，去发布第一条动态吧。
          </div>
        </div>

        <div
          v-show="activeTab === '我的收藏'"
          class="profile-local-scroll profile-tab-inner-scroll rounded-2xl"
        >
          <div v-if="myFavorites.length" class="space-y-5 pb-2">
            <PostCard
              v-for="post in myFavorites"
              :key="post.id"
              :post="post"
              :hug-disabled="huggingPostId === post.id"
              :favorite-disabled="favoritingPostId === post.id"
              @favorite="store.toggleFavorite"
              @open="openPost"
              @comment="openPost"
            />
          </div>
          <div
            v-else
            class="profile-scroll-empty rounded-2xl bg-apricot/60 text-[13px] text-warmInk/50"
          >
            暂无收藏内容，看到喜欢的先收藏起来。
          </div>
        </div>

        <div
          v-show="activeTab === '草稿箱'"
          class="profile-local-scroll profile-tab-inner-scroll rounded-2xl"
        >
          <div v-if="draftList.length" class="space-y-2 pb-2">
            <div
              v-for="draft in draftList"
              :key="draft.id"
              class="rounded-2xl bg-apricot/50 p-3"
            >
              <div class="mb-2 flex items-center justify-between">
                <p class="text-[15px] font-semibold text-warmInk">{{ draft.title }}</p>
                <span class="text-[12px] text-warmInk/40">{{ draft.updatedAt }}</span>
              </div>
              <p class="mb-3 text-[14px] leading-relaxed text-warmInk/75">{{ draft.content }}</p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-[12px] text-brand transition-all duration-200 active:scale-[0.97]"
                >
                  <PencilLine class="h-3.5 w-3.5" />
                  继续编辑
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full bg-[#E8E0DA] px-3 py-1 text-[12px] text-warmInk/65 transition-all duration-200 active:scale-[0.97]"
                  @click="removeDraft(draft.id)"
                >
                  <FileText class="h-3.5 w-3.5" />
                  删除草稿
                </button>
              </div>
            </div>
          </div>
          <div
            v-else
            class="profile-scroll-empty rounded-2xl bg-apricot/60 text-[13px] text-warmInk/50"
          >
            草稿箱为空，灵感来了随时记下来。
          </div>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="inline-flex w-full items-center justify-center gap-1 rounded-full bg-white/95 py-2 text-[14px] text-red-500 shadow-warm transition-all duration-200 active:scale-[0.97]"
      @click="handleLogout"
    >
      <LogOut class="h-4 w-4" />
      {{ userStore.isLoggedIn ? '退出登录' : '前往登录' }}
    </button>

    <!-- <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1 rounded-full bg-white/95 py-2 text-[13px] text-warmInk/60 shadow-warm transition-all duration-200 active:scale-[0.97]"
      >
        <Heart class="h-4 w-4 text-liked" />
        点赞通知
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1 rounded-full bg-white/95 py-2 text-[13px] text-warmInk/60 shadow-warm transition-all duration-200 active:scale-[0.97]"
      >
        <Bell class="h-4 w-4 text-brand" />
        系统消息
      </button>
    </div> -->
  </section>
</template>
