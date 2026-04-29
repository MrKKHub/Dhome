<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { Search, SlidersHorizontal } from 'lucide-vue-next'
import { closeToast, showToast } from 'vant'
import HomeLeafBreeze, { type HomeLeafBreezeSeed } from '@/components/HomeLeafBreeze.vue'
import { pickLeafVisual } from '@/utils/leafPicker'
import PickupMoodModal from '@/components/PickupMoodModal.vue'
import PostCard from '@/components/PostCard.vue'
import PostListSkeleton from '@/components/PostListSkeleton.vue'
import { usePostStore, type PostItem } from '@/store/postStore'
import { useUserStore } from '@/store/userStore'

/**
 * 首页顶区枫叶漂移动画总开关。
 * `false`：不挂载落叶层、不生成种子、不监听 resize 测量高度，其余首页逻辑与样式不变。
 * 需要恢复时改为 `true` 即可。
 */
const ENABLE_HOME_LEAF_BREEZE = false

// const tabs = ['推荐', '关注']
const activeTab = ref('推荐')
const activeFilter = ref('全部')
const activeSort = ref('最新')
const filterOptions = ['全部', '有图', '长文']
const keyword = ref('')
const refreshing = ref(false)
const scrollTopCache = ref<Record<string, number>>({
  推荐: 0,
  关注: 0,
})
/** 首页列表区独立滚动，高度见 style.css `.home-feed-scroll-area` */
const feedScrollEl = ref<HTMLElement | null>(null)
/** 落叶层下缘：搜索+筛选卡片底部，用于 fixed 落叶区高度 */
const leafZoneEndRef = ref<HTMLElement | null>(null)
const breezeZoneHeightPx = ref(220)
/** 顶区落叶种子（仅当 ENABLE_HOME_LEAF_BREEZE 为 true 时填充） */
const leafSeedsBehind = ref<HomeLeafBreezeSeed[]>([])
const leafSeedsFront = ref<HomeLeafBreezeSeed[]>([])

/** 叶子悬浮球：列表滚动中为 true，停止滚动 300ms 后恢复（防抖判断“停止”） */
const isScrolling = ref(false)
let scrollStopTimer: ReturnType<typeof setTimeout> | null = null

const postStore = usePostStore()
const userStore = useUserStore()
const {
  loading: listLoading,
  finished: listFinished,
  huggingPostId,
  favoritingPostId,
} = storeToRefs(postStore)
const router = useRouter()
const leafGradientId = useId()

/** 随机拾起心情弹窗：与原先「捡起一片心情」入口一致，由 postStore.fetchRandomPickup 拉取 */
const pickupOpen = ref(false)
const pickupLoading = ref(false)
const pickupPost = ref<PostItem | null>(null)

const showSkeleton = computed(
  () => postStore.posts.length === 0 && postStore.loading,
)

const currentPosts = computed(() => {
  let list = postStore.visibleFeedPosts

  list = list.filter((item) => {
    if (!keyword.value.trim()) {
      return true
    }
    const key = keyword.value.trim().toLowerCase()
    return (
      item.title.toLowerCase().includes(key) ||
      item.content.toLowerCase().includes(key) ||
      item.nickname.toLowerCase().includes(key)
    )
  })

  if (activeFilter.value === '有图') {
    list = list.filter((item) => item.images.length > 0)
  } else if (activeFilter.value === '长文') {
    list = list.filter((item) => item.content.length >= 45)
  }

  if (activeSort.value === '最热') {
    list = [...list].sort((a, b) => b.likes + b.comments - (a.likes + a.comments))
  }
  return list
})

const openPost = (id: string) => router.push(`/detail/${encodeURIComponent(id)}`)

const axiosMessage = (e: unknown, fallback: string): string => {
  if (!axios.isAxiosError(e)) {
    return fallback
  }
  const data = e.response?.data as { message?: string | string[] } | undefined
  const m = data?.message
  if (Array.isArray(m) && m[0]) {
    return m[0]
  }
  if (typeof m === 'string' && m.trim()) {
    return m
  }
  return fallback
}

/**
 * 拾起一片心情：校验登录 → 打开弹窗 → 调用 store 内封装好的随机帖接口（非裸 axios，保持与历史逻辑一致）
 */
const openPickup = async () => {
  if (!userStore.isLoggedIn || !userStore.token) {
    showToast('登录后，才能拾起他人的心情哦')
    router.push({ path: '/login', query: { redirect: '/' } })
    return
  }
  if (pickupLoading.value) {
    return
  }
  pickupOpen.value = true
  pickupLoading.value = true
  pickupPost.value = null
  // 轻量提示：与弹窗内骨架并存，不占全屏 Loading；结束在 finally 里 closeToast
  showToast({
    message: '正在林间拾起心情叶子...',
    forbidClick: true,
    duration: 0,
  })
  try {
    pickupPost.value = await postStore.fetchRandomPickup()
  } catch (e) {
    pickupOpen.value = false
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      showToast('登录已过期，请重新登录')
      userStore.logout()
      router.push({ path: '/login', query: { redirect: '/' } })
      return
    }
    showToast(axiosMessage(e, '暂时拾不到心情，稍后再试～'))
  } finally {
    pickupLoading.value = false
    closeToast()
  }
}

const closePickup = () => {
  pickupOpen.value = false
  pickupPost.value = null
}

const openPickupDetail = (id: string) => {
  closePickup()
  openPost(id)
}

const setFilter = (filter: string) => {
  activeFilter.value = filter
}
// const onTabChange = (tab: string) => {
//   const el = feedScrollEl.value
//   if (el) {
//     scrollTopCache.value[activeTab.value] = el.scrollTop
//   }
//   activeTab.value = tab
//   postStore.setFeedChannel(tab === '推荐' ? 'recommended' : 'follow')
//   postStore.fetchNextPage()
// }
const onLoad = async () => {
  await postStore.fetchNextPage()
}

const setListLoading = (v: boolean) => {
  listLoading.value = v
}
const onRefresh = async () => {
  refreshing.value = true
  await postStore.refreshFeed()
  refreshing.value = false
}

const handleFeedScroll = () => {
  const el = feedScrollEl.value
  if (el) {
    scrollTopCache.value[activeTab.value] = el.scrollTop
  }
  // 滚动中收起叶子球；防抖 300ms 无新滚动事件则视为停止
  isScrolling.value = true
  if (scrollStopTimer !== null) {
    clearTimeout(scrollStopTimer)
  }
  scrollStopTimer = setTimeout(() => {
    isScrolling.value = false
    scrollStopTimer = null
  }, 300)
}

watch(
  () => activeTab.value,
  async (nextTab) => {
    await nextTick()
    requestAnimationFrame(() => {
      const el = feedScrollEl.value
      if (el) {
        el.scrollTop = scrollTopCache.value[nextTab] || 0
      }
    })
  },
)

const updateBreezeZoneHeight = () => {
  if (!ENABLE_HOME_LEAF_BREEZE) {
    return
  }
  const el = leafZoneEndRef.value
  if (!el) {
    return
  }
  // 视口顶到搜索卡片下缘：与「搜索框下方高度」一致
  breezeZoneHeightPx.value = Math.max(96, Math.ceil(el.getBoundingClientRect().bottom))
}

/**
 * 顶区「四季林间」落叶：固定 5 片；LeafPicker 随机形态与色系；红框内随机位置 + 漂移/呼吸 delay 0–2s。
 * 在 onMounted 调用，保证与首屏布局测量顺序一致。
 */
const buildLeafBreezeSeeds = () => {
  if (!ENABLE_HOME_LEAF_BREEZE) {
    leafSeedsBehind.value = []
    leafSeedsFront.value = []
    return
  }
  const count = 5
  const seeds: HomeLeafBreezeSeed[] = Array.from({ length: count }, (_, i) => {
    const visual = pickLeafVisual()
    return {
      id: `lb-${i}-${Math.random().toString(36).slice(2, 10)}`,
      stroke: visual.stroke,
      strokeSoft: visual.strokeSoft,
      plateauOpacity: visual.plateauOpacity,
      topPct: 6 + Math.random() * 86,
      anchorLeftPct: 4 + Math.random() * 92,
      delayDrift: Math.random() * 2,
      delayBreathe: Math.random() * 2,
      driftDuration: 8 + Math.random() * 4,
      rtl: Math.random() < 0.22,
      zIndex: 1 + Math.floor(Math.random() * 5),
    }
  })
  const nBehind = Math.max(1, Math.floor(count / 2))
  leafSeedsBehind.value = seeds.slice(0, nBehind)
  leafSeedsFront.value = seeds.slice(nBehind)
}

let breezeResizeTimer: ReturnType<typeof setTimeout> | null = null
const onBreezeResize = () => {
  if (!ENABLE_HOME_LEAF_BREEZE) {
    return
  }
  if (breezeResizeTimer !== null) {
    clearTimeout(breezeResizeTimer)
  }
  breezeResizeTimer = setTimeout(() => {
    updateBreezeZoneHeight()
    breezeResizeTimer = null
  }, 120)
}

onMounted(() => {
  if (ENABLE_HOME_LEAF_BREEZE) {
    buildLeafBreezeSeeds()
  }
  postStore.setFeedChannel('recommended')
  if (postStore.page === 0) {
    postStore.fetchNextPage()
  }
  void nextTick().then(() => {
    if (ENABLE_HOME_LEAF_BREEZE) {
      updateBreezeZoneHeight()
    }
    feedScrollEl.value?.addEventListener('scroll', handleFeedScroll, {
      passive: true,
    })
  })
  if (ENABLE_HOME_LEAF_BREEZE) {
    window.addEventListener('resize', onBreezeResize, { passive: true })
  }
})

onUnmounted(() => {
  if (scrollStopTimer !== null) {
    clearTimeout(scrollStopTimer)
    scrollStopTimer = null
  }
  if (breezeResizeTimer !== null) {
    clearTimeout(breezeResizeTimer)
    breezeResizeTimer = null
  }
  if (ENABLE_HOME_LEAF_BREEZE) {
    window.removeEventListener('resize', onBreezeResize)
  }
  feedScrollEl.value?.removeEventListener('scroll', handleFeedScroll)
})
</script>

<template>
  <!-- 勿在包裹 HomeLeafBreeze 的外层使用带 transform 的 animate-fade-in，否则 fixed 落叶会相对错误容器定位并可能不可见 -->
  <section
    class="home-feed-root relative z-0 mx-auto w-full max-w-[min(100%,26rem)] px-1 sm:px-0"
  >
    <HomeLeafBreeze
      v-if="ENABLE_HOME_LEAF_BREEZE && leafSeedsBehind.length"
      layer="behind"
      :zone-height-px="breezeZoneHeightPx"
      :leaves="leafSeedsBehind"
    />

    <div class="relative z-10 mb-4 px-1">
      <h2 class="text-2xl font-bold leading-relaxed text-warmInk">情绪树洞</h2>
      <p class="mt-1 text-[13px] leading-relaxed text-warmInk/55">慢一点，让心情有地方落脚</p>
    </div>

    <HomeLeafBreeze
      v-if="ENABLE_HOME_LEAF_BREEZE && leafSeedsFront.length"
      layer="front"
      :zone-height-px="breezeZoneHeightPx"
      :leaves="leafSeedsFront"
    />

    <div
      ref="leafZoneEndRef"
      class="relative z-20 mb-3 rounded-[28px] border border-card bg-surface p-3 shadow-warm backdrop-blur-sm"
    >
      <div class="mb-2 flex items-center gap-2 rounded-full bg-apricot/70 px-3 py-2">
        <Search class="h-4 w-4 text-warmInk/40" />
        <input
          v-model="keyword"
          class="w-full bg-transparent text-[14px] text-warmInk outline-none placeholder:text-warmInk/35"
          placeholder="搜一搜心情碎片…"
        />
      </div>
      <div class="flex items-center justify-between gap-2">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="item in filterOptions"
            :key="item"
            type="button"
            class="rounded-full px-3 py-1 text-[12px] transition-all duration-200 active:scale-[0.97]"
            :class="
              activeFilter === item
                ? 'bg-brand/15 font-medium text-brand'
                : 'bg-surface-muted text-warmInk/55'
            "
            @click="setFilter(item)"
          >
            {{ item }}
          </button>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1 text-[12px] text-warmInk/55 transition-all duration-200 active:scale-[0.97]"
          @click="activeSort = activeSort === '最新' ? '最热' : '最新'"
        >
          <SlidersHorizontal class="h-3.5 w-3.5" />
          {{ activeSort }}
        </button>
      </div>
    </div>

    <!--
      推荐 / 关注切换：暂时隐藏；逻辑仍保留（activeTab、onTabChange、scrollTopCache 等）。
      恢复展示：取消本注释包裹即可。
    <div class="mb-3 flex rounded-full bg-apricot/80 p-1">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        class="flex-1 rounded-full px-4 py-2 text-[14px] transition-all duration-200 active:scale-[0.97]"
        :class="
          activeTab === tab
            ? 'bg-white font-semibold text-warmInk shadow-sm'
            : 'text-warmInk/50'
        "
        @click="onTabChange(tab)"
      >
        {{ tab }}
      </button>
    </div>
    -->

    <div ref="feedScrollEl" class="home-feed-scroll-area px-1">
      <van-pull-refresh
        v-model="refreshing"
        pulling-text="下拉即可刷新"
        loosing-text="释放后刷新"
        loading-text="刷新中..."
        @refresh="onRefresh"
      >
        <van-list
          :loading="listLoading"
          :finished="listFinished"
          :immediate-check="false"
          @update:loading="setListLoading"
          @load="onLoad"
        >
          <template #loading>
            <div class="flex items-center justify-center gap-2 py-3 text-[12px] text-warmInk/45">
              <van-loading size="14px" color="#FF8C69" />
              正在收集更多心情卡片…
            </div>
          </template>

          <template #finished>
            <div class="py-3 text-center text-[12px] text-warmInk/30">—— 就到这里，也很好 ——</div>
          </template>

          <div class="overscroll-y-contain">
            <PostListSkeleton v-if="showSkeleton" :count="3" />

            <template v-else-if="currentPosts.length">
              <div class="flex w-full flex-col">
                <PostCard
                  v-for="post in currentPosts"
                  :key="post.id"
                  class="animate-fade-in"
                  :post="post"
                  :hug-disabled="huggingPostId === post.id"
                  :favorite-disabled="favoritingPostId === post.id"
                  @favorite="postStore.toggleFavorite"
                  @open="openPost"
                  @comment="openPost"
                />
              </div>
            </template>

            <div
              v-else-if="!listLoading && !showSkeleton"
              class="rounded-[28px] bg-apricot/60 py-10 text-center text-[15px] text-warmInk/50"
            >
              这里还空空的，去写第一条树洞吧。
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>

    <PickupMoodModal
      :open="pickupOpen"
      :loading="pickupLoading"
      :post="pickupPost"
      @close="closePickup"
      @open-detail="openPickupDetail"
    />

    <!-- fixed：高于列表内容；z-index 低于拾起弹窗(60)，避免压住弹层；不与底栏中间「发布」同侧重叠 -->
    <button
      type="button"
      class="leaf-fab"
      :class="{
        'leaf-fab--scrolling': isScrolling,
        'leaf-fab--pickup-loading': pickupLoading && pickupOpen,
      }"
      aria-label="捡起一片心情"
      :disabled="pickupLoading && pickupOpen"
      @click="openPickup"
    >
      <span class="leaf-fab__icon-wrap">
        <svg
          class="leaf-fab__svg"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <defs>
            <linearGradient :id="leafGradientId" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFB347" />
              <stop offset="100%" stop-color="#FFCCB6" />
            </linearGradient>
          </defs>
          <path
            :fill="`url(#${leafGradientId})`"
            d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
          />
          <path
            :fill="`url(#${leafGradientId})`"
            d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
            opacity="0.92"
          />
        </svg>
      </span>
    </button>
  </section>
</template>

<style scoped>
.leaf-fab {
  position: fixed;
  right: 20px;
  bottom: calc(var(--tabbar-height) + 20px);
  z-index: 40;
  display: flex;
  width: 52px;
  height: 52px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  box-shadow:
    0 10px 28px rgba(255, 140, 105, 0.16),
    0 2px 10px rgba(74, 62, 62, 0.06);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.leaf-fab--scrolling {
  opacity: 0.15;
  transform: scale(0.8) translateX(12px);
  pointer-events: none;
}

.leaf-fab:disabled {
  cursor: wait;
  opacity: 1;
}

.leaf-fab__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: leaf-fab-float 2.6s ease-in-out infinite;
}

.leaf-fab--pickup-loading .leaf-fab__icon-wrap {
  animation: leaf-fab-spin 0.85s linear infinite;
}

@keyframes leaf-fab-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-3px);
  }
}

@keyframes leaf-fab-spin {
  to {
    transform: rotate(360deg);
  }
}

.leaf-fab__svg {
  display: block;
}
</style>
