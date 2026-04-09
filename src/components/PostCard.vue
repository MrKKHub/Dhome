<script setup lang="ts">
import { computed, ref } from 'vue'

/** UI 开关：恢复卡片标题展示时改为 false（post.title 仍参与数据映射） */
const UI_HIDE_CARD_TITLE = true
/** UI 开关：关闭后缩略图不再打开全屏预览 */
const UI_IMAGE_PREVIEW_ENABLED = true
import {
  HeartHandshake,
  Leaf,
  MessageCircle,
  Share2,
  Sparkles,
  Star,
} from 'lucide-vue-next'
import { showDialog, showToast } from 'vant'
import { CAPSULE_LOCKED_TOAST } from '@/constants/capsule'
import ForestAnonymousAvatar from '@/components/ForestAnonymousAvatar.vue'
import {
  MOOD_BADGE_CLASS,
  MOOD_CARD_SURFACE_COLOR,
  MOOD_WATERCOLOR_LAYERS,
} from '@/constants/moods'
import { usePostStore } from '@/store/postStore'
import { useUserStore } from '@/store/userStore'
import { playLeafConfetti } from '@/utils/leafConfetti'
import { playHugHeartConfetti } from '@/utils/hugHeartConfetti'
import type { PostItem } from '@/store/postStore'

const postStore = usePostStore()
const userStore = useUserStore()
const leafBtnRef = ref<HTMLButtonElement | null>(null)
const hugBtnRef = ref<HTMLButtonElement | null>(null)
/** 发送拥抱前填写匿名与暖心话 */
const hugPanelOpen = ref(false)
const hugAnonymous = ref(false)
const hugMessage = ref('')
/** 全屏大图预览：点击缩略图打开，点遮罩或图关闭 */
const imagePreviewUrl = ref<string | null>(null)

const openImagePreview = (url: string) => {
  if (!UI_IMAGE_PREVIEW_ENABLED || !url?.trim()) {
    return
  }
  imagePreviewUrl.value = url
}

const closeImagePreview = () => {
  imagePreviewUrl.value = null
}

const props = withDefaults(
  defineProps<{
    post: PostItem
    hugDisabled?: boolean
    favoriteDisabled?: boolean
    /**
     * 胶囊馆：作者看自己未到期胶囊时也显示信封壳与倒计时（与首页「已解密」展示区分）
     */
    museumMode?: boolean
  }>(),
  {
    hugDisabled: false,
    favoriteDisabled: false,
    museumMode: false,
  },
)

/** 单图略大展示；多图沿用宫格小缩略 */
const postImageThumbClass = computed(() =>
  props.post.images.length === 1
    ? 'w-full max-h-[220px] min-h-0 cursor-zoom-in rounded-2xl object-cover transition-opacity active:opacity-90'
    : 'h-24 w-full cursor-zoom-in rounded-2xl object-cover transition-opacity active:opacity-90',
)

const emit = defineEmits<{
  favorite: [id: string]
  comment: [id: string]
  open: [id: string]
}>()

const imageClass = computed(() => {
  if (props.post.images.length === 1) {
    return 'grid-cols-1'
  }
  if (props.post.images.length === 2 || props.post.images.length === 4) {
    return 'grid-cols-2'
  }
  return 'grid-cols-3'
})

const moodClass = computed(() => MOOD_BADGE_CLASS[props.post.mood])
const watercolorLayers = computed(() => MOOD_WATERCOLOR_LAYERS[props.post.mood])
const moodSurfaceColor = computed(
  () => MOOD_CARD_SURFACE_COLOR[props.post.mood],
)

/** 未开启胶囊：距解锁天数（向上取整） */
const capsuleDaysLeft = computed(() => {
  if (!props.post.unlockAtIso) {
    return 0
  }
  const t = Date.parse(props.post.unlockAtIso)
  if (Number.isNaN(t) || t <= Date.now()) {
    return 0
  }
  return Math.max(0, Math.ceil((t - Date.now()) / 86400000))
})

/** 信封壳：他人视角接口脱敏，或胶囊馆中作者看自己未到期 */
const showCapsuleShell = computed(() => {
  if (props.post.capsuleLocked) {
    return true
  }
  if (
    props.museumMode &&
    props.post.isCapsule &&
    props.post.unlockAtIso &&
    Date.parse(props.post.unlockAtIso) > Date.now()
  ) {
    return true
  }
  return false
})

const showLeafDecor = computed(
  () => (props.post.id.length + (props.post.id.charCodeAt(0) ?? 0)) % 2 === 0,
)

const hugRipple = ref(false)
const listenRipple = ref(false)
let hugTimer: ReturnType<typeof setTimeout> | null = null
let listenTimer: ReturnType<typeof setTimeout> | null = null

const triggerHug = async () => {
  if (props.hugDisabled) {
    return
  }
  if (!userStore.isLoggedIn) {
    void postStore.toggleLike(props.post.id)
    return
  }
  if (props.post.liked) {
    hugRipple.value = true
    if (hugTimer) {
      clearTimeout(hugTimer)
    }
    hugTimer = setTimeout(() => {
      hugRipple.value = false
      hugTimer = null
    }, 900)
    await postStore.toggleLike(props.post.id)
    return
  }
  hugAnonymous.value = false
  hugMessage.value = ''
  hugPanelOpen.value = true
}

/** 确认送出拥抱：心形粒子 + 接口；匿名成功弹窗文案 */
const confirmHug = async () => {
  if (props.hugDisabled) {
    return
  }
  hugPanelOpen.value = false
  hugRipple.value = true
  if (hugTimer) {
    clearTimeout(hugTimer)
  }
  hugTimer = setTimeout(() => {
    hugRipple.value = false
    hugTimer = null
  }, 900)
  void playHugHeartConfetti(hugBtnRef.value)
  const r = await postStore.toggleLike(props.post.id, {
    isAnonymous: hugAnonymous.value,
    content: hugMessage.value,
  })
  if (r.ok && r.liked && r.hugAnonymous) {
    void showDialog({
      title: '温暖已传达',
      message: '已发送匿名拥抱，温暖已传达',
      theme: 'round-button',
      confirmButtonText: '好的',
    })
  }
}

/** 未解锁胶囊：他人统一提示；作者在自己的胶囊馆点击不打扰 */
const onLockedCapsuleTap = () => {
  if (props.post.isMine && props.museumMode) {
    return
  }
  showToast(CAPSULE_LOCKED_TOAST)
}

const triggerListen = () => {
  emit('comment', props.post.id)
  listenRipple.value = true
  if (listenTimer) {
    clearTimeout(listenTimer)
  }
  listenTimer = setTimeout(() => {
    listenRipple.value = false
    listenTimer = null
  }, 900)
}

const toggleFavorite = () => {
  if (props.favoriteDisabled) {
    return
  }
  emit('favorite', props.post.id)
}
const openDetail = () => emit('open', props.post.id)

/** 非匿名且已登录、非本人：展示「种下思念」绿叶关注 */
const showForestFollow = computed(
  () =>
    userStore.isLoggedIn &&
    !props.post.isMine &&
    !props.post.isAnonymous &&
    !!props.post.authorId,
)

const onForestFollowClick = async (e: MouseEvent) => {
  e.stopPropagation()
  const aid = props.post.authorId
  if (!aid) {
    return
  }
  const was = props.post.followingAuthor ?? false
  const next = await postStore.toggleFollowOnPost(aid, props.post.id)
  if (next === true && !was) {
    void playLeafConfetti(leafBtnRef.value)
  }
}
</script>

<template>
  <article
    class="card-shell relative mb-6 w-full overflow-hidden rounded-[28px] border border-[#E8DDD4]/90 shadow-warm transition-[transform,box-shadow] duration-300 ease-out hover:scale-[1.01] hover:shadow-[0_18px_48px_-12px_rgba(196,164,132,0.22)] active:scale-[0.98]"
    @click="openDetail"
  >
    <!-- 心情主色（实色 + transition-colors，叠加水彩晕染） -->
    <div
      class="pointer-events-none absolute inset-0 transition-colors duration-700 ease-in-out"
      :style="{ backgroundColor: moodSurfaceColor }"
      aria-hidden="true"
    />
    <div
      v-for="(layer, idx) in watercolorLayers"
      :key="idx"
      class="pointer-events-none"
      :class="layer"
      aria-hidden="true"
    />

    <!-- 极淡叶片 / 云朵线稿感装饰 -->
    <svg
      v-if="showLeafDecor"
      class="pointer-events-none absolute bottom-6 right-2 h-28 w-28 text-[#8B7355]"
      viewBox="0 0 120 120"
      fill="currentColor"
      aria-hidden="true"
    >
      <g class="opacity-[0.07]">
        <ellipse cx="62" cy="78" rx="28" ry="18" transform="rotate(-25 62 78)" />
        <path d="M58 78 Q45 45 70 28 Q88 38 82 65 Q75 72 58 78Z" />
      </g>
    </svg>
    <svg
      v-else
      class="pointer-events-none absolute right-4 top-24 h-24 w-32 text-[#A09080]"
      viewBox="0 0 140 80"
      fill="currentColor"
      aria-hidden="true"
    >
      <g class="opacity-[0.06]">
        <ellipse cx="45" cy="48" rx="32" ry="22" />
        <ellipse cx="78" cy="44" rx="38" ry="26" />
        <ellipse cx="108" cy="50" rx="28" ry="20" />
      </g>
    </svg>

    <div class="card-grain pointer-events-none absolute inset-0" aria-hidden="true" />

    <div class="relative z-[1] p-4">
      <div class="mb-3 flex items-start justify-between gap-2">
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <ForestAnonymousAvatar
            v-if="post.isAnonymous"
            :icon-key="post.anonymousAvatarKey"
            :size="40"
            class="shrink-0 border border-[#C8E6C9]"
          />
          <img
            v-else
            :src="post.avatar"
            :alt="post.nickname"
            class="h-10 w-10 shrink-0 rounded-full border border-[#E5D9CF] object-cover"
          />
          <div class="min-w-0">
            <div class="flex min-w-0 items-center gap-1.5">
              <p class="truncate text-[15px] font-semibold text-[#5C4B4B]">
                {{ post.nickname }}
              </p>
              <button
                v-if="showForestFollow"
                ref="leafBtnRef"
                type="button"
                title="种下思念"
                class="shrink-0 rounded-full p-1 transition-transform active:scale-90"
                :disabled="postStore.followTogglingAuthorId === post.authorId"
                @click="onForestFollowClick"
              >
                <Leaf
                  class="h-5 w-5 transition-colors duration-300"
                  :class="
                    post.followingAuthor
                      ? 'fill-emerald-600 text-emerald-600'
                      : 'fill-transparent text-[#9CA3AF]'
                  "
                  :stroke-width="2"
                />
              </button>
            </div>
            <p class="text-[12px] leading-relaxed text-[#8B7B7B]">{{ post.createdAt }}</p>
          </div>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-medium leading-none"
            :class="moodClass"
          >
            {{ post.mood }}
          </span>
          <span
            v-if="post.followsOnly"
            class="rounded-full bg-lilac/15 px-2 py-0.5 text-[11px] text-[#6B5DB3]"
          >
            仅关注
          </span>
          <span
            v-if="post.isCapsule"
            class="rounded-full bg-amber-100/90 px-2 py-0.5 text-[11px] text-amber-900/80"
          >
            时间胶囊
          </span>
        </div>
      </div>

      <!-- 信封壳需要足够高度；未加壳时用 overflow-hidden 裁圆角。加壳时去掉 hidden，避免绝对定位层被裁切 -->
      <div
        class="relative mb-3 min-h-[4.5rem] rounded-2xl"
        :class="showCapsuleShell ? 'min-h-[11rem]' : 'overflow-hidden'"
      >
        <div
          v-if="showCapsuleShell"
          class="absolute inset-0 z-[2] flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-amber-200/60 bg-white/55 px-4 py-5 text-center shadow-inner backdrop-blur-md"
          role="button"
          tabindex="0"
          @click.stop="onLockedCapsuleTap"
          @keydown.enter.stop="onLockedCapsuleTap"
        >
          <span class="shrink-0 text-3xl leading-none opacity-90" aria-hidden="true">✉️</span>
          <p class="text-[14px] font-semibold leading-snug text-[#5C4B4B]">
            一封未拆的信
          </p>
          <p class="text-[13px] leading-normal text-[#8B7355]">
            🔒 距开启还有 {{ capsuleDaysLeft }} 天
          </p>
        </div>
        <div
          :class="[
            showCapsuleShell
              ? 'pointer-events-none overflow-hidden rounded-2xl blur-[7px] opacity-45'
              : '',
          ]"
        >
          <!-- 标题字段仍由 post.title 承载，仅视觉隐藏以降噪 -->
          <h3
            v-if="!UI_HIDE_CARD_TITLE"
            class="mb-2 text-[17px] font-semibold leading-relaxed text-[#5C4B4B]"
          >
            {{ post.title }}
          </h3>
          <p class="mb-3 text-[15px] leading-relaxed text-[#6B5A5A]">
            {{ post.content }}
          </p>

          <div
            v-if="post.images.length"
            class="mb-0 grid gap-2"
            :class="imageClass"
          >
            <img
              v-for="(image, idx) in post.images"
              :key="`${post.id}-${idx}`"
              :src="image"
              alt="post-image"
              :class="postImageThumbClass"
              @click.stop="openImagePreview(image)"
            />
          </div>
        </div>
      </div>

      <div
        class="flex items-center justify-between border-t border-[#E8DDD4]/80 pt-3"
        @click.stop
      >
        <div class="relative flex min-w-0 flex-1 justify-start">
          <button
            ref="hugBtnRef"
            type="button"
            class="ripple-host relative inline-flex min-w-0 max-w-full flex-row flex-nowrap items-center gap-1 overflow-hidden rounded-full px-1.5 py-2 text-[12px] text-[#7D6B5C] transition-colors duration-200 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none"
            :class="post.liked ? 'text-[#B76E7A]' : ''"
            :disabled="
              hugDisabled ||
              (showCapsuleShell === true && !post.isMine)
            "
            @click="triggerHug"
          >
            <span
              v-if="hugRipple"
              class="ripple-hug pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
              aria-hidden="true"
            />
            <HeartHandshake
              class="relative z-[1] h-4 w-4 shrink-0 transition-all duration-200"
              :class="post.liked ? 'animate-soft-bounce' : ''"
              :stroke-width="post.liked ? 2.25 : 2"
            />
            <span
              class="relative z-[1] shrink-0 whitespace-nowrap text-[11px]"
              :class="post.liked ? 'text-[#B76E7A]' : 'text-[#7D6B5C]'"
            >拥抱</span>
            <span
              class="relative z-[1] shrink-0 whitespace-nowrap text-[11px] tabular-nums"
              :class="post.liked ? 'text-[#C48A92]' : 'text-[#9A8A7E]'"
            >{{ post.likes > 0 ? post.likes : '' }}</span>
          </button>
        </div>

        <div class="relative flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            class="ripple-host relative inline-flex max-w-full flex-row flex-nowrap items-center gap-1 overflow-hidden rounded-full px-1.5 py-2 text-[12px] text-[#7D6B5C] transition-colors duration-200 active:scale-[0.98]"
            @click="triggerListen"
          >
            <span
              v-if="listenRipple"
              class="ripple-listen pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
              aria-hidden="true"
            />
            <MessageCircle class="relative z-[1] h-4 w-4 shrink-0" />
            <span
              class="relative z-[1] shrink-0 whitespace-nowrap text-[11px] text-[#7D6B5C]"
            >倾听</span>
          </button>
        </div>

        <button
          type="button"
          class="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1 py-2 text-[12px] transition-all duration-200 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none"
          :class="post.favorited ? 'text-favorite' : 'text-[#7D6B5C]'"
          :disabled="favoriteDisabled"
          @click="toggleFavorite"
        >
          <Star
            class="h-4 w-4"
            :class="post.favorited ? 'fill-favorite' : ''"
          />
          <span class="text-[11px]">收好</span>
        </button>

        <button
          type="button"
          class="flex min-w-0 flex-1 items-center justify-end gap-1 rounded-full px-1 py-2 text-[12px] text-[#7D6B5C] transition-all duration-200 active:scale-[0.98]"
        >
          <Share2 class="h-4 w-4" />
          <span class="text-[11px]">分享</span>
        </button>
      </div>

      <div
        v-if="post.comments > 0"
        class="mt-2 flex items-center gap-1 text-[11px] text-[#9A8A7E]"
      >
        <Sparkles class="h-3 w-3 text-lilac/60" />
        <span>{{ post.comments }} 条温柔回声</span>
      </div>
    </div>

    <van-popup
      :show="hugPanelOpen"
      position="bottom"
      round
      :style="{ padding: '0' }"
      teleport="body"
      @update:show="hugPanelOpen = $event"
    >
      <div class="border-t border-[#F0E8E0]/80 bg-white px-4 pb-6 pt-4">
        <p class="mb-3 text-[16px] font-semibold text-warmInk">送出一个拥抱</p>
        <textarea
          v-model="hugMessage"
          class="mb-3 min-h-20 w-full rounded-2xl border border-[#F0E8E0] bg-apricot/40 px-3 py-2.5 text-[14px] text-warmInk/85 outline-none placeholder:text-warmInk/35"
          maxlength="280"
          placeholder="选填：一句暖心话（最多 280 字）"
        />
        <label
          class="mb-4 flex cursor-pointer items-center justify-between rounded-xl bg-apricot/50 px-3 py-2.5"
        >
          <span class="text-[14px] text-warmInk/80">匿名拥抱</span>
          <input v-model="hugAnonymous" type="checkbox" class="h-4 w-4 accent-[#B76E7A]" />
        </label>
        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-full border border-[#E8DDD4] py-3 text-[14px] font-medium text-warmInk/70 active:scale-[0.98]"
            @click="hugPanelOpen = false"
          >
            取消
          </button>
          <button
            type="button"
            class="flex-1 rounded-full bg-gradient-to-r from-[#E8A0A8] to-[#C48A92] py-3 text-[14px] font-semibold text-white shadow-warm active:scale-[0.98]"
            @click="confirmHug"
          >
            发送温暖
          </button>
        </div>
      </div>
    </van-popup>

    <Teleport to="body">
      <Transition name="img-preview-fade">
        <div
          v-if="imagePreviewUrl && UI_IMAGE_PREVIEW_ENABLED"
          class="fixed inset-0 z-[5000] flex cursor-zoom-out items-center justify-center bg-black/[0.76] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
          @click="closeImagePreview"
        >
          <img
            :src="imagePreviewUrl"
            class="max-h-[88vh] max-w-full rounded-lg object-contain shadow-2xl"
            alt="大图预览"
            @click="closeImagePreview"
          />
        </div>
      </Transition>
    </Teleport>
  </article>
</template>

<style scoped>
/* 大图预览淡入淡出，便于日后关闭开关时一并移除 */
.img-preview-fade-enter-active,
.img-preview-fade-leave-active {
  transition: opacity 0.24s ease;
}

.img-preview-fade-enter-from,
.img-preview-fade-leave-to {
  opacity: 0;
}

.card-grain {
  opacity: 0.055;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.ripple-host {
  -webkit-tap-highlight-color: transparent;
}

.ripple-hug {
  background: radial-gradient(
    circle,
    rgba(255, 182, 168, 0.42) 0%,
    rgba(196, 164, 132, 0.22) 45%,
    transparent 70%
  );
  animation: ripple-soft-hug 0.88s cubic-bezier(0.22, 0.82, 0.28, 1) forwards;
}

.ripple-listen {
  background: radial-gradient(
    circle,
    rgba(196, 164, 132, 0.38) 0%,
    rgba(160, 140, 120, 0.18) 50%,
    transparent 72%
  );
  animation: ripple-soft-listen 0.92s cubic-bezier(0.2, 0.85, 0.32, 1) forwards;
}

@keyframes ripple-soft-hug {
  0% {
    transform: translate(-50%, -50%) scale(0.15);
    opacity: 0.65;
  }
  55% {
    opacity: 0.32;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.85);
    opacity: 0;
  }
}

@keyframes ripple-soft-listen {
  0% {
    transform: translate(-50%, -50%) scale(0.12);
    opacity: 0.55;
  }
  50% {
    opacity: 0.28;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.95);
    opacity: 0;
  }
}
</style>
