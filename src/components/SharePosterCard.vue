<script setup lang="ts">
/**
 * 仅用于 html2canvas 离屏截图：温和渐变 / 可选模糊底图 + 心情与正文 + 页脚与二维码
 */
import { computed, ref } from 'vue'
import {
  MOOD_BADGE_CLASS,
  MOOD_BADGE_POSTER_STYLE,
} from '@/constants/moods'
import type { PostMood } from '@/constants/moods'

const props = defineProps<{
  mood: PostMood
  bodyText: string
  dateLine: string
  /** 首图 URL；跨域失败时自动退化为纯渐变底 */
  bgImage?: string | null
  qrDataUrl: string
}>()

const rootRef = ref<HTMLElement | null>(null)
const bgFailed = ref(false)

/** 仅外域图加 anonymous，同源 /uploads 不加以免静态服务未配 CORS 时拖垮解码 */
const bgImgCrossOrigin = computed<'anonymous' | undefined>(() => {
  const src = props.bgImage
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
    return undefined
  }
  if (typeof window === 'undefined') return undefined
  try {
    const u = new URL(src, window.location.href)
    return u.origin !== window.location.origin ? 'anonymous' : undefined
  } catch {
    return undefined
  }
})

const moodBadgeClass = () => MOOD_BADGE_CLASS[props.mood] ?? MOOD_BADGE_CLASS['平静']

const moodBadgePosterStyle = () =>
  MOOD_BADGE_POSTER_STYLE[props.mood] ?? MOOD_BADGE_POSTER_STYLE['平静']

defineExpose({
  getCaptureRoot: () => rootRef.value,
})
</script>

<template>
  <div
    ref="rootRef"
    class="share-poster-root relative overflow-hidden rounded-3xl text-left shadow-xl"
    style="
      width: 360px;
      min-height: 520px;
      opacity: 1;
      background-color: #fdfbf7;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        'PingFang SC',
        'Hiragino Sans GB',
        'Microsoft YaHei',
        sans-serif;
    "
  >
    <!-- 背景：模糊图 + 暖色罩层，失败时仅渐变 -->
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#FFF8F3] via-[#F5EDE6] to-[#E8DDD4]"
      aria-hidden="true"
    />
    <img
      v-if="bgImage && !bgFailed"
      :src="bgImage"
      alt=""
      :crossorigin="bgImgCrossOrigin"
      class="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
      @error="bgFailed = true"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/75 via-white/55 to-[#FDF8F3]/90"
      aria-hidden="true"
    />

    <div class="relative z-[1] flex min-h-[520px] flex-col px-7 pb-8 pt-10">
      <div class="mb-5">
        <span
          class="inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
          :class="moodBadgeClass()"
          :style="moodBadgePosterStyle()"
        >
          {{ mood }}
        </span>
      </div>

      <p
        class="mb-6 flex-1 whitespace-pre-wrap text-[17px] font-medium leading-[1.75] text-[#4A3E3E]"
        style="word-break: break-word; color: #4a3e3e"
      >
        {{ bodyText }}
      </p>

      <p
        class="mb-8 text-[12px] tracking-wide text-[#8B7B7B]"
        style="color: #8b7b7b"
      >
        {{ dateLine }}
      </p>

      <div class="mt-auto flex items-end justify-between gap-4 border-t border-[#E8DDD4]/80 pt-5">
        <p
          class="max-w-[180px] text-[11px] font-medium leading-snug text-[#7D6B5C]"
          style="color: #7d6b5c"
        >
          木心 · 聆听你的小心事
        </p>
        <div
          class="shrink-0 overflow-hidden rounded-xl border border-[#E8DDD4]/90 bg-white p-1 shadow-sm"
        >
          <img
            :src="qrDataUrl"
            width="76"
            height="76"
            class="block h-[76px] w-[76px]"
            alt="打开木心"
          />
        </div>
      </div>
    </div>
  </div>
</template>
