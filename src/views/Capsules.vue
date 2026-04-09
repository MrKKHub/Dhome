<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { showToast } from 'vant'
import PostCard from '@/components/PostCard.vue'
import type { PostItem } from '@/store/postStore'
import { usePostStore } from '@/store/postStore'
import { useUserStore } from '@/store/userStore'
import { playHugHeartConfetti } from '@/utils/hugHeartConfetti'

type CapsuleTab = 'mine' | 'river'

const router = useRouter()
const store = usePostStore()
const userStore = useUserStore()

const tab = ref<CapsuleTab>('mine')
const myCapsules = ref<PostItem[]>([])
const myLoading = ref(false)
const riverCatch = ref<PostItem | null>(null)
const salvaging = ref(false)
const salvageBtnRef = ref<HTMLButtonElement | null>(null)
const rippleActive = ref(false)
/** 曾在长河区打捞但当前无可用胶囊，用于常驻提示（与 Toast 双保险） */
const riverSalvageEmpty = ref(false)

const emptyMine = computed(
  () => !myLoading.value && myCapsules.value.length === 0,
)

async function loadMine() {
  if (!userStore.isLoggedIn) {
    return
  }
  myLoading.value = true
  try {
    myCapsules.value = await store.fetchMyCapsulesList()
  } catch (e) {
    myCapsules.value = []
    const msg =
      axios.isAxiosError(e) && e.response?.status === 401
        ? '请先登录'
        : '加载失败，请稍后再试'
    showToast(msg)
  } finally {
    myLoading.value = false
  }
}

async function doSalvage() {
  if (!userStore.isLoggedIn || salvaging.value) {
    return
  }
  salvaging.value = true
  rippleActive.value = true
  setTimeout(() => {
    rippleActive.value = false
  }, 900)
  try {
    const result = await store.salvageRiverCapsule()
    if (!result.ok) {
      riverCatch.value = null
      riverSalvageEmpty.value = result.emptyPool
      // 白底 Toast：优先展示后端 message，空池略延长便于读完
      showToast({
        message: result.message,
        duration: result.emptyPool ? 3000 : 3200,
      })
      return
    }
    riverSalvageEmpty.value = false
    riverCatch.value = result.item
    void playHugHeartConfetti(salvageBtnRef.value)
    showToast('打捞到一粒来自长河的温暖')
  } catch {
    riverCatch.value = null
    showToast('打捞失败，请稍后再试')
  } finally {
    salvaging.value = false
  }
}

function openDetail(id: string) {
  router.push(`/detail/${encodeURIComponent(id)}`)
}

/** 我的胶囊：未到解锁时间（用于高亮边框，与接口 capsuleLocked 无关） */
function isMyCapsuleSealed(p: PostItem) {
  if (!p.isCapsule || !p.unlockAtIso) {
    return false
  }
  const t = Date.parse(p.unlockAtIso)
  return !Number.isNaN(t) && t > Date.now()
}

onMounted(() => {
  void loadMine()
})

watch(
  () => userStore.isLoggedIn,
  (v) => {
    if (v) {
      void loadMine()
    } else {
      myCapsules.value = []
      riverCatch.value = null
      riverSalvageEmpty.value = false
    }
  },
)

watch(tab, (t) => {
  if (t === 'mine') {
    void loadMine()
  }
})
</script>

<template>
  <section class="animate-fade-in pb-4">
    <div class="mb-4">
      <h2 class="text-2xl font-bold text-warmInk">时光胶囊</h2>
      <p class="mt-1 text-[13px] text-warmInk/45">
        埋下种子的人，与在河里打捞的人，彼此温柔擦肩。
      </p>
    </div>

    <div
      class="mb-4 flex rounded-2xl bg-apricot/50 p-1 ring-1 ring-[#F0E8E0]/80"
    >
      <button
        type="button"
        class="flex-1 rounded-xl py-2.5 text-[14px] font-medium transition-all duration-200 active:scale-[0.99]"
        :class="
          tab === 'mine'
            ? 'bg-white text-warmInk shadow-sm'
            : 'text-warmInk/50'
        "
        @click="tab = 'mine'"
      >
        我的胶囊
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl py-2.5 text-[14px] font-medium transition-all duration-200 active:scale-[0.99]"
        :class="
          tab === 'river'
            ? 'bg-white text-warmInk shadow-sm'
            : 'text-warmInk/50'
        "
        @click="tab = 'river'"
      >
        时光长河
      </button>
    </div>

    <template v-if="tab === 'mine'">
      <p v-if="myLoading" class="py-10 text-center text-[14px] text-warmInk/45">
        正在打开你的胶囊柜…
      </p>
      <p
        v-else-if="emptyMine"
        class="rounded-[24px] border border-dashed border-[#E8DDD4] bg-white/60 py-14 text-center text-[14px] text-warmInk/45"
      >
        还没有胶囊，去发布页埋一颗吧～
      </p>
      <div v-else class="space-y-5">
        <div v-for="p in myCapsules" :key="p.id" class="relative">
          <span
            v-if="p.isCapsule && p.isPublic === false"
            class="absolute right-3 top-3 z-[3] rounded-full bg-warmInk/10 px-2 py-0.5 text-[10px] text-warmInk/55"
          >
            未入长河
          </span>
          <div
            :class="
              isMyCapsuleSealed(p)
                ? 'rounded-[28px] ring-2 ring-amber-200/50 ring-offset-2 ring-offset-warmCream'
                : ''
            "
          >
            <PostCard
              museum-mode
              :post="p"
              :hug-disabled="store.huggingPostId === p.id"
              :favorite-disabled="store.favoritingPostId === p.id"
              @favorite="store.toggleFavorite"
              @comment="(id) => openDetail(id)"
              @open="openDetail"
            />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div
        class="relative mb-6 flex flex-col items-center rounded-[28px] border border-sky-200/40 bg-gradient-to-b from-sky-50/90 to-white/90 px-4 py-8 shadow-warm"
      >
        <p class="mb-1 text-center text-[15px] font-semibold text-sky-900/85">
          长河打捞
        </p>
        <p class="mb-5 max-w-[280px] text-center text-[12px] leading-relaxed text-sky-900/50">
          只遇见已解锁、且作者选择公开的胶囊；打捞结果以匿名温暖展示。
        </p>
        <button
          ref="salvageBtnRef"
          type="button"
          class="salvage-btn relative flex min-h-[52px] min-w-[200px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-8 text-[15px] font-semibold text-white shadow-lg transition-transform duration-200 active:scale-[0.97] disabled:opacity-50"
          :class="{ 'salvage-btn--ripple': rippleActive }"
          :disabled="salvaging || !userStore.isLoggedIn"
          @click="doSalvage"
        >
          <span class="relative z-[1]">{{
            salvaging ? '打捞中…' : '打捞一粒温暖'
          }}</span>
        </button>
      </div>

      <div v-if="riverCatch">
        <p class="mb-2 text-[13px] font-medium text-warmInk/60">
          本次打捞
        </p>
        <PostCard
          :post="riverCatch"
          :hug-disabled="store.huggingPostId === riverCatch.id"
          :favorite-disabled="store.favoritingPostId === riverCatch.id"
          @favorite="store.toggleFavorite"
          @comment="(id) => openDetail(id)"
          @open="openDetail"
        />
      </div>
      <div
        v-else
        class="rounded-2xl px-3 py-8 text-center text-[13px]"
        :class="
          riverSalvageEmpty
            ? 'border border-dashed border-amber-200/70 bg-amber-50/50 text-warmInk/55'
            : 'bg-apricot/40 text-warmInk/45'
        "
      >
        <p v-if="riverSalvageEmpty">
          长河里暂时还没有可打捞的公开胶囊，过段时间再来试试～
        </p>
        <p v-else>点击打捞，看看长河漂来了什么～</p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.salvage-btn--ripple::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  animation: salvage-ripple 0.85s ease-out forwards;
  pointer-events: none;
  box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.45);
}

@keyframes salvage-ripple {
  0% {
    box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.5);
  }
  100% {
    box-shadow: 0 0 0 28px rgba(56, 189, 248, 0);
  }
}
</style>
