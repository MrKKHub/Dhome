<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { Search, SlidersHorizontal } from 'lucide-vue-next'
import PostCard from '@/components/PostCard.vue'
import { usePostStore } from '@/store/postStore'

const tabs = ['推荐', '关注']
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
const lastTab = ref('推荐')

const postStore = usePostStore()
const { loading: listLoading, finished: listFinished } = storeToRefs(postStore)
const router = useRouter()

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

const openPost = (id: number) => router.push(`/detail/${id}`)
const setFilter = (filter: string) => {
  activeFilter.value = filter
}
const onTabChange = (tab: string) => {
  scrollTopCache.value[activeTab.value] = window.scrollY || 0
  activeTab.value = tab
  postStore.setFeedChannel(tab === '推荐' ? 'recommended' : 'follow')
  postStore.fetchNextPage()
}
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

const handlePageScroll = () => {
  scrollTopCache.value[lastTab.value] = window.scrollY || 0
}

watch(
  () => activeTab.value,
  async (nextTab) => {
    lastTab.value = nextTab
    await nextTick()
    requestAnimationFrame(() => {
      const top = scrollTopCache.value[nextTab] || 0
      window.scrollTo({ top, behavior: 'auto' })
    })
  },
)

onMounted(() => {
  postStore.setFeedChannel('recommended')
  if (postStore.page === 0) {
    postStore.fetchNextPage()
  }
  window.addEventListener('scroll', handlePageScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handlePageScroll)
})
</script>

<template>
  <section class="animate-fade-in">
    <div class="mb-4">
      <h2 class="text-2xl font-bold leading-relaxed text-[#5C4B4B]">情绪树洞</h2>
      <p class="mt-1 text-[13px] leading-relaxed text-[#8B7B7B]">慢一点，让心情有地方落脚</p>
    </div>

    <div
      class="mb-3 rounded-[28px] border border-[#F0E8E0]/80 bg-white/90 p-3 shadow-warm backdrop-blur-sm"
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
                ? 'bg-brand/15 font-medium text-[#C45C3E]'
                : 'bg-[#F5EDE6] text-warmInk/55'
            "
            @click="setFilter(item)"
          >
            {{ item }}
          </button>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-[#F5EDE6] px-3 py-1 text-[12px] text-warmInk/55 transition-all duration-200 active:scale-[0.97]"
          @click="activeSort = activeSort === '最新' ? '最热' : '最新'"
        >
          <SlidersHorizontal class="h-3.5 w-3.5" />
          {{ activeSort }}
        </button>
      </div>
    </div>

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
          <template v-if="currentPosts.length">
            <div class="flex w-full flex-col">
              <PostCard
                v-for="post in currentPosts"
                :key="post.id"
                class="animate-fade-in"
                :post="post"
                @like="postStore.toggleLike"
                @favorite="postStore.toggleFavorite"
                @open="openPost"
                @comment="openPost"
              />
            </div>
          </template>

          <div
            v-else-if="!listLoading"
            class="rounded-[28px] bg-apricot/60 py-10 text-center text-[15px] text-warmInk/50"
          >
            这里还空空的，去写第一条树洞吧。
          </div>
        </div>
      </van-list>
    </van-pull-refresh>
  </section>
</template>
