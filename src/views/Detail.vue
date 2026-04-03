<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Heart, Sparkles, UserPlus } from 'lucide-vue-next'
import axios from 'axios'
import request from '@/api/request'
import { playLeafConfetti } from '@/utils/leafConfetti'
import PostCard from '@/components/PostCard.vue'
import { useAppToast } from '@/composables/useAppToast'
import { usePostStore } from '@/store/postStore'
import { useUserStore } from '@/store/userStore'
import { storeToRefs } from 'pinia'

const route = useRoute()
const store = usePostStore()
const { huggingPostId, favoritingPostId } = storeToRefs(store)
const userStore = useUserStore()
const toast = useAppToast()
const commentText = ref('')
const commentSubmitting = ref(false)
const followLoading = ref(false)
const isFollowedByMe = ref(false)
const leafFollowBtnRef = ref<HTMLButtonElement | null>(null)

const postId = computed(() => {
  const raw = route.params.id
  return Array.isArray(raw) ? raw[0] ?? '' : String(raw ?? '')
})

const post = computed(() =>
  postId.value ? store.getPostById(postId.value) : null,
)

const showFollow = computed(
  () =>
    !!post.value &&
    !post.value.isMine &&
    !post.value.isAnonymous &&
    !!post.value.authorId &&
    userStore.isLoggedIn,
)

async function loadFollowState() {
  const p = post.value
  const aid = p?.authorId
  if (!p || p.isMine || !aid || !userStore.isLoggedIn) {
    isFollowedByMe.value = false
    return
  }
  try {
    const res = await request.get<{ isFollowedByViewer?: boolean }>(
      `/user/profile/${aid}`,
    )
    isFollowedByMe.value = !!res.data?.isFollowedByViewer
  } catch {
    isFollowedByMe.value = false
  }
}

const toggleFollowAuthor = async () => {
  const aid = post.value?.authorId
  const pid = postId.value
  if (!aid || !pid || followLoading.value || !userStore.isLoggedIn) {
    return
  }
  const was = isFollowedByMe.value
  followLoading.value = true
  try {
    const res = await request.post<{
      success?: boolean
      isFollowing?: boolean
    }>(`/follow/${encodeURIComponent(aid)}`, { postId: pid })
    if (res.data?.success) {
      isFollowedByMe.value = !!res.data.isFollowing
      const now = !!res.data.isFollowing
      if (now && !was) {
        void playLeafConfetti(leafFollowBtnRef.value)
      }
      toast.success(
        now ? '已与这位森林伙伴建立连接' : '已松开这片叶子的手',
      )
      const p = post.value
      if (p) {
        p.followingAuthor = now
      }
    }
  } catch (e) {
    let msg = '操作失败，请稍后再试'
    if (axios.isAxiosError(e)) {
      if (e.response?.status === 401) {
        msg = '请先登录'
      } else {
        const raw = (e.response?.data as { message?: string | string[] })
          ?.message
        if (Array.isArray(raw) && raw[0]) {
          msg = raw[0]
        } else if (typeof raw === 'string' && raw.trim()) {
          msg = raw
        }
      }
    }
    toast.fail(msg)
  } finally {
    followLoading.value = false
  }
}
const comments = computed(() =>
  postId.value ? store.getCommentsByPost(postId.value) : [],
)

watch(
  () => postId.value,
  async (id) => {
    if (id) {
      await store.fetchComments(id)
    }
  },
  { immediate: true },
)

watch(
  () => ({
    aid: post.value?.authorId,
    mine: post.value?.isMine,
    loggedIn: userStore.isLoggedIn,
  }),
  () => {
    void loadFollowState()
  },
  { immediate: true },
)

const submitComment = async () => {
  if (!post.value || !postId.value || commentSubmitting.value) {
    return
  }
  commentSubmitting.value = true
  try {
    const r = await store.addComment(postId.value, commentText.value)
    if (!r.ok) {
      if (r.message && r.message !== '未登录') {
        toast.fail(r.message)
      }
      return
    }
    commentText.value = ''
    toast.success('你的回声已送达')
  } finally {
    commentSubmitting.value = false
  }
}
</script>

<template>
  <section class="animate-fade-in">
    <PostCard
      v-if="post"
      :post="post"
      :hug-disabled="huggingPostId === post.id"
      :favorite-disabled="favoritingPostId === post.id"
      @like="store.toggleLike"
      @favorite="store.toggleFavorite"
      @open="() => null"
      @comment="() => null"
    />

    <div
      v-if="post && showFollow"
      class="mt-2 flex justify-end"
    >
      <button
        ref="leafFollowBtnRef"
        type="button"
        title="种下思念"
        class="inline-flex items-center gap-1.5 rounded-full border border-[#F0E8E0] bg-white/90 px-4 py-2 text-[13px] font-medium text-warmInk shadow-warm transition-all active:scale-[0.97] disabled:opacity-50"
        :disabled="followLoading"
        @click.stop="toggleFollowAuthor"
      >
        <UserPlus class="h-4 w-4 text-emerald-600" />
        {{ isFollowedByMe ? '已关注' : '种下思念' }}
      </button>
    </div>

    <div
      v-else
      class="rounded-[28px] bg-apricot/70 py-12 text-center text-[15px] text-warmInk/50"
    >
      这片叶子飘走了，换个入口看看吧。
    </div>

    <div
      v-if="post"
      class="mt-3 space-y-4 rounded-[28px] border border-[#F0E8E0]/80 bg-white/95 p-4 shadow-warmLg backdrop-blur-sm"
    >
      <div class="flex items-center gap-2">
        <Heart class="h-4 w-4 fill-hug/35 text-hug" />
        <h3 class="text-[17px] font-semibold leading-snug text-warmInk">温柔回声</h3>
        <Sparkles class="h-4 w-4 text-lilac/80" />
      </div>
      <p class="-mt-1 text-[12px] leading-relaxed text-warmInk/45">
        这里没有输赢，只有陪伴。一句轻轻的「我懂」，也很好。
      </p>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea
          v-model="commentText"
          class="min-h-24 w-full rounded-2xl bg-apricot/70 px-3 py-2.5 text-[14px] leading-relaxed text-warmInk/85 outline-none transition-shadow duration-200 placeholder:text-warmInk/35 focus:bg-white focus:shadow-[0_0_0_3px_rgba(157,148,255,0.15)]"
          maxlength="200"
          placeholder="轻轻留下一句倾听或共情…"
        ></textarea>
        <button
          type="button"
          class="h-11 shrink-0 rounded-full bg-gradient-to-r from-lilac to-[#B8B0FF] px-5 text-[13px] font-semibold text-white shadow-warmLg transition-all duration-200 active:scale-[0.97] disabled:opacity-50 sm:h-auto sm:self-stretch sm:px-4"
          :disabled="commentSubmitting"
          @click="submitComment"
        >
          {{ commentSubmitting ? '发送中…' : '送出回声' }}
        </button>
      </div>

      <div v-if="comments.length" class="space-y-3">
        <div
          v-for="item in comments"
          :key="item.id"
          class="rounded-2xl border border-[#F0E8E0]/60 bg-apricot/40 p-3"
        >
          <div class="mb-2 flex items-center gap-2">
            <img
              :src="item.avatar"
              :alt="item.nickname"
              class="h-8 w-8 rounded-full border border-[#F0E8E0] object-cover"
            />
            <div>
              <p class="text-[13px] font-semibold text-warmInk">{{ item.nickname }}</p>
              <p class="text-[11px] text-warmInk/40">{{ item.createdAt }}</p>
            </div>
          </div>
          <p class="text-[14px] leading-relaxed text-warmInk/80">{{ item.content }}</p>
        </div>
      </div>
      <div
        v-else
        class="rounded-2xl bg-apricot/50 py-6 text-center text-[13px] text-warmInk/45"
      >
        还没有回声，做第一个轻轻敲门的人吧～
      </div>
    </div>
  </section>
</template>
