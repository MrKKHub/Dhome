<script setup lang="ts">
import { computed, ref } from 'vue'
import { HeartHandshake, MessageCircle, Share2, Sparkles, Star } from 'lucide-vue-next'
import { MOOD_BADGE_CLASS, MOOD_WATERCOLOR_LAYERS } from '@/constants/moods'
import type { PostItem } from '@/store/postStore'

const props = defineProps<{
  post: PostItem
}>()

const emit = defineEmits<{
  like: [id: number]
  favorite: [id: number]
  comment: [id: number]
  open: [id: number]
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

const showLeafDecor = computed(() => props.post.id % 2 === 0)

const hugRipple = ref(false)
const listenRipple = ref(false)
let hugTimer: ReturnType<typeof setTimeout> | null = null
let listenTimer: ReturnType<typeof setTimeout> | null = null

const triggerHug = () => {
  emit('like', props.post.id)
  hugRipple.value = true
  if (hugTimer) {
    clearTimeout(hugTimer)
  }
  hugTimer = setTimeout(() => {
    hugRipple.value = false
    hugTimer = null
  }, 900)
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

const toggleFavorite = () => emit('favorite', props.post.id)
const openDetail = () => emit('open', props.post.id)
</script>

<template>
  <article
    class="card-shell relative mb-6 w-full overflow-hidden rounded-[28px] border border-[#E8DDD4]/90 shadow-warm transition-[transform,box-shadow] duration-300 ease-out hover:scale-[1.01] hover:shadow-[0_18px_48px_-12px_rgba(196,164,132,0.22)] active:scale-[0.98]"
    @click="openDetail"
  >
    <!-- 暖色棉麻感底 + 水彩晕染 -->
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#FFF9F5] via-[#FFF6EF] to-[#FDF3EC]"
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
          <img
            :src="post.avatar"
            :alt="post.nickname"
            class="h-10 w-10 shrink-0 rounded-full border border-[#E5D9CF] object-cover"
          />
          <div class="min-w-0">
            <p class="truncate text-[15px] font-semibold text-[#5C4B4B]">{{ post.nickname }}</p>
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
        </div>
      </div>

      <h3 class="mb-2 text-[17px] font-semibold leading-relaxed text-[#5C4B4B]">
        {{ post.title }}
      </h3>
      <p class="mb-3 text-[15px] leading-relaxed text-[#6B5A5A]">{{ post.content }}</p>

      <div
        v-if="post.images.length"
        class="mb-3 grid gap-2"
        :class="imageClass"
      >
        <img
          v-for="(image, idx) in post.images"
          :key="`${post.id}-${idx}`"
          :src="image"
          alt="post-image"
          class="h-24 w-full rounded-2xl object-cover"
        />
      </div>

      <div
        class="flex items-center justify-between border-t border-[#E8DDD4]/80 pt-3"
        @click.stop
      >
        <div class="relative flex min-w-0 flex-1 justify-start">
          <button
            type="button"
            class="ripple-host relative inline-flex min-w-0 max-w-full flex-row flex-nowrap items-center gap-1 overflow-hidden rounded-full px-1.5 py-2 text-[12px] text-[#7D6B5C] transition-colors duration-200 active:scale-[0.98]"
            :class="post.liked ? 'text-[#B76E7A]' : ''"
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
          class="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1 py-2 text-[12px] transition-all duration-200 active:scale-[0.98]"
          :class="post.favorited ? 'text-favorite' : 'text-[#7D6B5C]'"
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
  </article>
</template>

<style scoped>
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
