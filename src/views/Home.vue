<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { Search, Shell, SlidersHorizontal } from 'lucide-vue-next'
import { showToast } from 'vant'
import PickupMoodModal from '@/components/PickupMoodModal.vue'
import PostCard from '@/components/PostCard.vue'
import PostListSkeleton from '@/components/PostListSkeleton.vue'
import { usePostStore, type PostItem } from '@/store/postStore'
import { useUserStore } from '@/store/userStore'

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

const postStore = usePostStore()
const userStore = useUserStore()
const {
  loading: listLoading,
  finished: listFinished,
  huggingPostId,
  favoritingPostId,
} = storeToRefs(postStore)
const router = useRouter()

const pickupOpen = ref(false)
const pickupLoading = ref(false)
const pickupPost = ref<PostItem | null>(null)

const showSkeleton = computed(
  () => postStore.posts.length === 0 && postStore.loading,
)

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

const openPickup = async () => {
  if (!userStore.isLoggedIn || !userStore.token) {
    showToast('登录后，才能拾起他人的心情哦')
    router.push({ path: '/login', query: { redirect: '/' } })
    return
  }
  pickupOpen.value = true
  pickupLoading.value = true
  pickupPost.value = null
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
  if (!el) {
    return
  }
  scrollTopCache.value[activeTab.value] = el.scrollTop
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

onMounted(() => {
  postStore.setFeedChannel('recommended')
  if (postStore.page === 0) {
    postStore.fetchNextPage()
  }
  void nextTick().then(() => {
    feedScrollEl.value?.addEventListener('scroll', handleFeedScroll, {
      passive: true,
    })
  })
})

onUnmounted(() => {
  feedScrollEl.value?.removeEventListener('scroll', handleFeedScroll)
})
</script>

<template>
  <section
    class="animate-fade-in home-feed-root mx-auto w-full max-w-[min(100%,26rem)] px-1 sm:px-0"
  >
    <div class="mb-4 px-1">
      <h2 class="text-2xl font-bold leading-relaxed text-warmInk">情绪树洞</h2>
      <p class="mt-1 text-[13px] leading-relaxed text-warmInk/55">慢一点，让心情有地方落脚</p>
    </div>

    <div class="mb-4 px-1">
      <button
        type="button"
        class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-soft bg-surface px-5 py-3 text-[14px] font-medium text-warmInk/80 shadow-warm backdrop-blur-sm transition-all duration-200 active:scale-[0.98]"
        @click="openPickup"
      >
        <Shell class="h-[18px] w-[18px] shrink-0 text-brand" stroke-width="2" />
        捡起一片心情
      </button>
    </div>

    <div
      class="mb-3 rounded-[28px] border border-card bg-surface p-3 shadow-warm backdrop-blur-sm"
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
  </section>
</template>
