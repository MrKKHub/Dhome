<script setup lang="ts">
import { computed, ref } from 'vue'
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
import { useRouter } from 'vue-router'
import PostCard from '@/components/PostCard.vue'
import { usePostStore } from '@/store/postStore'

type CenterTab = '我的发布' | '我的收藏' | '草稿箱'

interface DraftItem {
  id: number
  title: string
  content: string
  updatedAt: string
}

const router = useRouter()
const store = usePostStore()
const activeTab = ref<CenterTab>('我的发布')

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

const myPosts = computed(() =>
  store.posts.filter((item) => item.nickname === '你自己'),
)
const myFavorites = computed(() =>
  store.posts.filter((item) => item.favorited),
)

const totalLikes = computed(() =>
  myPosts.value.reduce((sum, item) => sum + item.likes, 0),
)

const settings = [
  { icon: UserRound, label: '账号与安全', desc: '手机号、密码、设备管理' },
  { icon: Bell, label: '消息通知', desc: '评论、点赞、私信提醒' },
  { icon: WalletCards, label: '隐私设置', desc: '动态可见范围、黑名单' },
  { icon: ShieldCheck, label: '社区规范', desc: '举报与反馈、帮助中心' },
]

const centerTabs: CenterTab[] = ['我的发布', '我的收藏', '草稿箱']

const openPost = (id: number) => router.push(`/detail/${id}`)
const setCenterTab = (tab: CenterTab) => {
  activeTab.value = tab
}

const removeDraft = (id: number) => {
  draftList.value = draftList.value.filter((item) => item.id !== id)
  showToast('草稿已删除')
}

const handleLogout = async () => {
  try {
    await showConfirmDialog({
      title: '退出登录',
      message: '退出后将返回首页，是否继续？',
      confirmButtonText: '退出',
      cancelButtonText: '取消',
    })
    showToast('已退出（演示态）')
    router.push('/')
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <section class="space-y-3 animate-fade-in">
    <div class="rounded-2xl border border-slate-100/50 bg-white p-4 shadow-ambient">
      <div class="mb-3 flex items-center gap-3">
        <img
          src="https://api.dicebear.com/9.x/notionists/svg?seed=You"
          alt="you"
          class="h-14 w-14 rounded-full border border-slate-100"
        />
        <div>
          <h2 class="text-[17px] font-semibold leading-snug text-slate-900">你自己</h2>
          <p class="text-[12px] text-slate-400">UID: 1024 2048 · Lv.6 创作者</p>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-xl bg-slate-50 py-2">
          <p class="text-[17px] font-semibold text-slate-900">36</p>
          <p class="text-[12px] text-slate-400">关注</p>
        </div>
        <div class="rounded-xl bg-slate-50 py-2">
          <p class="text-[17px] font-semibold text-slate-900">128</p>
          <p class="text-[12px] text-slate-400">粉丝</p>
        </div>
        <div class="rounded-xl bg-slate-50 py-2">
          <p class="text-[17px] font-semibold text-slate-900">{{ totalLikes }}</p>
          <p class="text-[12px] text-slate-400">我的获赞</p>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-100/50 bg-white p-2 shadow-ambient">
      <button
        v-for="item in settings"
        :key="item.label"
        type="button"
        class="mb-2 flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-left transition-all duration-200 last:mb-0 active:scale-[0.97]"
      >
        <div class="flex items-center gap-2">
          <component :is="item.icon" class="h-4 w-4 text-slate-500" />
          <div>
            <p class="text-[14px] font-semibold text-slate-800">{{ item.label }}</p>
            <p class="text-[12px] text-slate-400">{{ item.desc }}</p>
          </div>
        </div>
        <ChevronRight class="h-4 w-4 text-slate-400" />
      </button>
    </div>

    <div class="rounded-2xl border border-slate-100/50 bg-white p-3 shadow-ambient">
      <div class="mb-3 flex rounded-full bg-slate-100 p-1">
        <button
          v-for="tab in centerTabs"
          :key="tab"
          type="button"
          class="flex-1 rounded-full px-3 py-2 text-[13px] transition-all duration-200 active:scale-[0.97]"
          :class="
            activeTab === tab
              ? 'bg-white font-semibold text-slate-900 shadow-sm'
              : 'text-slate-500'
          "
          @click="setCenterTab(tab)"
        >
          {{ tab }}
        </button>
      </div>

      <template v-if="activeTab === '我的发布'">
        <div v-if="myPosts.length">
          <PostCard
            v-for="post in myPosts"
            :key="post.id"
            :post="post"
            @like="store.toggleLike"
            @favorite="store.toggleFavorite"
            @open="openPost"
            @comment="openPost"
          />
        </div>
        <div
          v-else
          class="rounded-xl bg-slate-100 py-8 text-center text-[13px] text-slate-500"
        >
          你还没有发布内容，去发布第一条动态吧。
        </div>
      </template>

      <template v-else-if="activeTab === '我的收藏'">
        <div v-if="myFavorites.length">
          <PostCard
            v-for="post in myFavorites"
            :key="post.id"
            :post="post"
            @like="store.toggleLike"
            @favorite="store.toggleFavorite"
            @open="openPost"
            @comment="openPost"
          />
        </div>
        <div
          v-else
          class="rounded-xl bg-slate-100 py-8 text-center text-[13px] text-slate-500"
        >
          暂无收藏内容，看到喜欢的先收藏起来。
        </div>
      </template>

      <template v-else>
        <div v-if="draftList.length" class="space-y-2">
          <div
            v-for="draft in draftList"
            :key="draft.id"
            class="rounded-xl bg-slate-50 p-3"
          >
            <div class="mb-2 flex items-center justify-between">
              <p class="text-[15px] font-semibold text-slate-800">{{ draft.title }}</p>
              <span class="text-[12px] text-slate-400">{{ draft.updatedAt }}</span>
            </div>
            <p class="mb-3 text-[14px] leading-relaxed text-slate-600">{{ draft.content }}</p>
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
                class="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-[12px] text-slate-600 transition-all duration-200 active:scale-[0.97]"
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
          class="rounded-xl bg-slate-100 py-8 text-center text-[13px] text-slate-500"
        >
          草稿箱为空，灵感来了随时记下来。
        </div>
      </template>
    </div>

    <button
      type="button"
      class="inline-flex w-full items-center justify-center gap-1 rounded-full bg-white py-2 text-[14px] text-red-500 shadow-ambient transition-all duration-200 active:scale-[0.97]"
      @click="handleLogout"
    >
      <LogOut class="h-4 w-4" />
      退出登录
    </button>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1 rounded-full bg-white py-2 text-[13px] text-slate-600 shadow-ambient transition-all duration-200 active:scale-[0.97]"
      >
        <Heart class="h-4 w-4 text-liked" />
        点赞通知
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1 rounded-full bg-white py-2 text-[13px] text-slate-600 shadow-ambient transition-all duration-200 active:scale-[0.97]"
      >
        <Bell class="h-4 w-4 text-brand" />
        系统消息
      </button>
    </div>
  </section>
</template>
