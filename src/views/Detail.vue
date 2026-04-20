<script setup lang="ts">
import { TransitionGroup, computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Heart, Sparkles, UserPlus } from 'lucide-vue-next'
import axios from 'axios'
import request from '@/api/request'
import { playLeafConfetti } from '@/utils/leafConfetti'
import PostCard from '@/components/PostCard.vue'
import CapsuleRevealCeremony from '@/components/CapsuleRevealCeremony.vue'
import { useAppToast } from '@/composables/useAppToast'
import { usePostStore } from '@/store/postStore'
import { useUserStore } from '@/store/userStore'
import { storeToRefs } from 'pinia'

const route = useRoute()
const router = useRouter()
const store = usePostStore()
const { huggingPostId, favoritingPostId } = storeToRefs(store)
const userStore = useUserStore()
const toast = useAppToast()
const commentText = ref('')
const commentSubmitting = ref(false)
/** 二级回复：指向一级评论 id；与底部输入框联动 */
const replyingToId = ref<string | null>(null)
const replyingToNickname = ref('')
const commentTextareaRef = ref<HTMLTextAreaElement | null>(null)
const followLoading = ref(false)
const isFollowedByMe = ref(false)
const leafFollowBtnRef = ref<HTMLButtonElement | null>(null)

/** 全屏磨砂擦除仪式进行中（PATCH 拆封成功后触发） */
const ceremonyActive = ref(false)
const openingCapsule = ref(false)

const postId = computed(() => {
  const raw = route.params.id
  return Array.isArray(raw) ? raw[0] ?? '' : String(raw ?? '')
})

const post = computed(() =>
  postId.value ? store.getPostById(postId.value) : null,
)

const unlockAtMs = computed(() => {
  const iso = post.value?.unlockAtIso
  if (!iso) {
    return null
  }
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : t
})

/** 作者：胶囊仍锁定且未到 unlockAt */
const authorCapsuleBeforeUnlock = computed(() => {
  const p = post.value
  if (
    !p?.isCapsule ||
    !p.isMine ||
    !(p.isLocked === true || p.capsuleLocked === true)
  ) {
    return false
  }
  const ms = unlockAtMs.value
  return ms != null && ms > Date.now()
})

/** 作者：已到开启日但仍未手动拆封 */
const authorCapsuleCanManualOpen = computed(() => {
  const p = post.value
  if (
    !p?.isCapsule ||
    !p.isMine ||
    !(p.isLocked === true || p.capsuleLocked === true)
  ) {
    return false
  }
  const ms = unlockAtMs.value
  return ms != null && ms <= Date.now()
})

const capsuleCountdownLabel = computed(() => {
  const ms = unlockAtMs.value
  if (ms == null || ms <= Date.now()) {
    return ''
  }
  const days = Math.max(0, Math.ceil((ms - Date.now()) / 86400000))
  return `距离开启还有 ${days} 天`
})

function openCapsuleCeremony() {
  ceremonyActive.value = true
}

async function onManualOpenCapsule() {
  const id = postId.value
  if (!id || !post.value?.isMine || openingCapsule.value) {
    return
  }
  openingCapsule.value = true
  try {
    const r = await store.openCapsuleByAuthor(id)
    if (!r.ok) {
      toast.fail(r.message)
      return
    }
    toast.success('拆封成功')
    openCapsuleCeremony()
  } finally {
    openingCapsule.value = false
  }
}

function onCapsuleCeremonyComplete() {
  ceremonyActive.value = false
  const id = postId.value
  if (id) {
    void store.fetchComments(id)
  }
}

function onPostDeletedFromDetail() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/')
  }
}

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

const commentPlaceholder = computed(() =>
  replyingToId.value
    ? `回应 @${replyingToNickname.value}…`
    : '轻轻留下一句倾听或共情…',
)

function beginReply(target: { id: string; nickname: string }) {
  if (!post.value || post.value.capsuleLocked) {
    return
  }
  replyingToId.value = target.id
  replyingToNickname.value = target.nickname
  void nextTick(() => {
    commentTextareaRef.value?.focus()
  })
}

function clearReplyTarget() {
  replyingToId.value = null
  replyingToNickname.value = ''
}

watch(
  () => postId.value,
  async (id) => {
    ceremonyActive.value = false
    if (id) {
      if (!store.getPostById(id)) {
        await store.fetchPostDetail(id)
      }
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
    const r = await store.addComment(
      postId.value,
      commentText.value,
      replyingToId.value,
    )
    if (!r.ok) {
      if (r.message && r.message !== '未登录') {
        toast.fail(r.message)
      }
      return
    }
    commentText.value = ''
    clearReplyTarget()
    toast.success('你的回声已送达')
  } finally {
    commentSubmitting.value = false
  }
}
</script>

<template>
  <section class="animate-fade-in">
    <div
      v-if="post"
      class="relative mb-6 overflow-hidden rounded-[28px]"
    >
      <PostCard
        class="!mb-0"
        :post="post"
        :hug-disabled="huggingPostId === post.id"
        :favorite-disabled="favoritingPostId === post.id"
        @favorite="store.toggleFavorite"
        @open="() => null"
        @comment="() => null"
        @deleted="onPostDeletedFromDetail"
      />
    </div>

    <CapsuleRevealCeremony
      v-if="ceremonyActive"
      @complete="onCapsuleCeremonyComplete"
    />

    <!-- 作者：封存中（未到 unlockAt），手动拆封按钮禁用 -->
    <div
      v-if="post && authorCapsuleBeforeUnlock"
      class="mt-3 space-y-4 rounded-[28px] border border-amber-200/60 bg-amber-50/85 px-4 py-6 text-center"
    >
      <p class="text-[15px] font-semibold text-amber-950/85">封存中</p>
      <p class="text-[13px] leading-relaxed text-amber-950/70">
        {{ capsuleCountdownLabel }}
      </p>
      <button
        type="button"
        disabled
        class="mx-auto flex h-11 min-w-[200px] items-center justify-center rounded-full border border-amber-200/80 bg-white/50 px-8 text-[14px] font-semibold text-amber-950/35"
      >
        手动拆封
      </button>
    </div>

    <!-- 作者：已到期待手动拆封 → PATCH 成功后进入磨砂擦除仪式 -->
    <div
      v-else-if="post && authorCapsuleCanManualOpen"
      class="mt-3 space-y-4 rounded-[28px] border border-amber-200/60 bg-amber-50/85 px-4 py-6 text-center"
    >
      <p class="text-[15px] font-semibold text-amber-950/85">胶囊已送达</p>
      <p class="text-[13px] leading-relaxed text-amber-950/70">
        约定的时间已到。点击下方按钮，在磨砂玻璃上轻轻擦拭，亲手拆开这封信。
      </p>
      <button
        type="button"
        class="mx-auto flex h-11 min-w-[200px] items-center justify-center rounded-full bg-gradient-to-r from-amber-200 to-amber-100 px-8 text-[14px] font-semibold text-amber-950 shadow-warm transition-transform active:scale-[0.97] disabled:opacity-55"
        :disabled="openingCapsule"
        @click="onManualOpenCapsule"
      >
        {{ openingCapsule ? '拆封中…' : '手动拆封' }}
      </button>
    </div>

    <div
      v-if="post && showFollow"
      class="mt-2 flex justify-end"
    >
      <button
        ref="leafFollowBtnRef"
        type="button"
        title="种下思念"
        class="inline-flex items-center gap-1.5 rounded-full border border-card bg-surface px-4 py-2 text-[13px] font-medium text-warmInk shadow-warm transition-all active:scale-[0.97] disabled:opacity-50"
        :disabled="followLoading"
        @click.stop="toggleFollowAuthor"
      >
        <UserPlus class="h-4 w-4 text-emerald-600" />
        {{ isFollowedByMe ? '已关注' : '种下思念' }}
      </button>
    </div>

    <div
      v-else-if="!post"
      class="rounded-[28px] bg-apricot/70 py-12 text-center text-[15px] text-warmInk/50"
    >
      这片叶子飘走了，换个入口看看吧。
    </div>

    <div
      v-if="post && post.capsuleLocked && !post.isMine"
      class="mt-3 rounded-[28px] border border-amber-200/60 bg-amber-50/80 px-4 py-6 text-center text-[14px] text-amber-950/75"
    >
      这是一封未拆的时间胶囊，开启后才可以在此留下回声。
    </div>

    <div
      v-if="post && !post.capsuleLocked"
      class="mt-3 space-y-4 rounded-[28px] border border-card bg-surface p-4 shadow-warmLg backdrop-blur-sm"
    >
      <div class="flex items-center gap-2">
        <Heart class="h-4 w-4 fill-hug/35 text-hug" />
        <h3 class="text-[17px] font-semibold leading-snug text-warmInk">温柔回声</h3>
        <Sparkles class="h-4 w-4 text-lilac/80" />
      </div>
      <p class="-mt-1 text-[12px] leading-relaxed text-warmInk/45">
        这里没有输赢，只有陪伴。一句轻轻的「我懂」，也很好。
      </p>

      <div
        v-if="replyingToId"
        class="flex items-center justify-between gap-2 rounded-xl bg-lilac/10 px-3 py-2 text-[11px] text-warmInk/55"
      >
        <span>回应 <b class="font-medium text-warmInk/70">@{{ replyingToNickname }}</b></span>
        <button
          type="button"
          class="shrink-0 font-medium text-brand/90 underline-offset-2 hover:underline"
          @click="clearReplyTarget"
        >
          取消
        </button>
      </div>

      <div
        class="flex flex-col gap-2 sm:flex-row sm:items-start"
        :class="{ 'detail-comment-bar--replying': !!replyingToId }"
      >
        <textarea
          ref="commentTextareaRef"
          v-model="commentText"
          class="detail-comment-textarea min-h-24 w-full rounded-2xl bg-apricot/70 px-3 py-2.5 text-[14px] leading-relaxed text-warmInk/85 outline-none transition-all duration-300 placeholder:text-warmInk/35 focus:bg-white/95 focus:shadow-[0_0_0_3px_rgba(157,148,255,0.15)]"
          maxlength="200"
          :placeholder="commentPlaceholder"
        ></textarea>
        <button
          type="button"
          class="h-11 shrink-0 rounded-full bg-gradient-to-r from-lilac to-lilac/80 px-5 text-[13px] font-semibold text-white shadow-warmLg transition-all duration-200 active:scale-[0.97] disabled:opacity-50 sm:h-auto sm:self-stretch sm:px-4"
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
          class="rounded-2xl border border-card bg-apricot/40 p-3"
        >
          <div class="mb-2 flex items-start justify-between gap-2">
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <img
                :src="item.avatar"
                :alt="item.nickname"
                class="h-8 w-8 shrink-0 rounded-full border border-card object-cover"
              />
              <div class="min-w-0">
                <p class="text-[13px] font-semibold text-warmInk">{{ item.nickname }}</p>
                <p class="text-[11px] text-warmInk/40">{{ item.createdAt }}</p>
              </div>
            </div>
            <button
              type="button"
              class="shrink-0 text-[11px] font-medium tracking-wide text-warmInk/38 underline-offset-2 transition-colors hover:text-brand hover:underline"
              @click="beginReply(item)"
            >
              留声
            </button>
          </div>
          <p
            class="cursor-pointer text-[14px] leading-relaxed text-warmInk/80 transition-opacity hover:opacity-90"
            role="button"
            tabindex="0"
            @click="beginReply(item)"
            @keydown.enter.prevent="beginReply(item)"
          >
            {{ item.content }}
          </p>
          <TransitionGroup
            v-if="item.replies && item.replies.length > 0"
            name="reply-list"
            tag="div"
            class="mt-2 space-y-2 border-l border-warmInk/10 pl-3"
          >
            <div
              v-for="r in item.replies"
              :key="r.id"
              class="reply-row rounded-xl bg-white/35 px-2 py-2 backdrop-blur-[2px]"
            >
              <div class="mb-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span class="text-[10px] font-medium uppercase tracking-wider text-warmInk/35">回应</span>
                <p class="text-[12px] font-medium text-warmInk/55">{{ item.nickname }}</p>
                <span class="text-[10px] text-warmInk/30">{{ r.createdAt }}</span>
              </div>
              <p class="text-[13px] leading-relaxed text-warmInk/72">{{ r.content }}</p>
            </div>
          </TransitionGroup>
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

<style scoped>
/* 二级回复插入：轻量滑入 + 淡入 */
.reply-list-enter-active,
.reply-list-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.reply-list-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.reply-list-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}

/* 回应某条回声时：输入区微弱呼吸光晕（毛玻璃感） */
.detail-comment-bar--replying .detail-comment-textarea {
  animation: detail-comment-glow 2.2s ease-in-out infinite;
}

@keyframes detail-comment-glow {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba(157, 148, 255, 0.12),
      0 0 18px rgba(157, 148, 255, 0.08);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(157, 148, 255, 0.22),
      0 0 26px rgba(157, 148, 255, 0.14);
  }
}
</style>
