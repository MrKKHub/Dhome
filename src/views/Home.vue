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
    <div class="mb-3 rounded-2xl border border-slate-100/50 bg-white p-3 shadow-ambient">
      <div class="mb-2 flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
        <Search class="h-4 w-4 text-slate-400" />
        <input
          v-model="keyword"
          class="w-full bg-transparent text-[14px] text-slate-700 outline-none"
          placeholder="搜索标题、正文、作者"
        />
      </div>
      <div class="flex items-center justify-between gap-2">
        <div class="flex gap-2">
          <button
            v-for="item in filterOptions"
            :key="item"
            type="button"
            class="rounded-full px-3 py-1 text-[12px] transition-all duration-200 active:scale-[0.97]"
            :class="
              activeFilter === item
                ? 'bg-brand/10 text-brand'
                : 'bg-slate-100 text-slate-500'
            "
            @click="setFilter(item)"
          >
            {{ item }}
          </button>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[12px] text-slate-500 transition-all duration-200 active:scale-[0.97]"
          @click="activeSort = activeSort === '最新' ? '最热' : '最新'"
        >
          <SlidersHorizontal class="h-3.5 w-3.5" />
          {{ activeSort }}
        </button>
      </div>
    </div>

    <div class="mb-3 flex rounded-full bg-slate-100 p-1">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        class="flex-1 rounded-full px-4 py-2 text-[14px] transition-all duration-200 active:scale-[0.97]"
        :class="
          activeTab === tab
            ? 'bg-white font-semibold text-slate-900 shadow-sm'
            : 'text-slate-500'
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
          <div class="flex items-center justify-center gap-2 py-3 text-[12px] text-slate-400">
            <van-loading size="14px" />
            正在探索更多内容...
          </div>
        </template>

        <template #finished>
          <div class="py-3 text-center text-[12px] text-slate-300">—— 已到达宇宙尽头 ——</div>
        </template>

        <div class="overscroll-y-contain">
          <template v-if="currentPosts.length">
            <div
              v-for="post in currentPosts"
              :key="post.id"
              class="animate-fade-in"
            >
              <PostCard
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
            class="rounded-2xl bg-slate-100 py-10 text-center text-[15px] text-slate-500"
          >
            当前频道还没有内容，试试去发布一条新动态。
          </div>
        </div>
      </van-list>
    </van-pull-refresh>
  </section>
</template>
