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

const props = withDefaults(
  defineProps<{
    mood: PostMood
    bodyText: string
    dateLine: string
    /** 首图 URL（建议已走 normalizeSrcForPosterHtml2Canvas）；跨域失败时自动退化为纯渐变底 */
    bgImage?: string | null
    /** 发布者昵称（含森林匿名展示名） */
    authorNickname: string
    /** 发布者头像 URL；匿名帖可为空，由占位图标代替 */
    authorAvatarSrc?: string | null
    authorIsAnonymous?: boolean
    qrDataUrl: string
  }>(),
  {
    authorAvatarSrc: null,
    authorIsAnonymous: false,
  },
)

const rootRef = ref<HTMLElement | null>(null)
const bgFailed = ref(false)

/** 仅外域图加 anonymous；同源 `/uploads/` 不加以免静态服务未配 CORS 时拖垮解码 */
function imgCrossOriginForCapture(
  src: string | null | undefined,
): 'anonymous' | undefined {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
    return undefined
  }
  if (src.startsWith('/uploads/')) return undefined
  if (typeof window === 'undefined') return undefined
  try {
    const u = new URL(src, window.location.href)
    return u.origin !== window.location.origin ? 'anonymous' : undefined
  } catch {
    return undefined
  }
}

const bgImgCrossOrigin = computed(() => imgCrossOriginForCapture(props.bgImage))

const authorAvatarCrossOrigin = computed(() =>
  imgCrossOriginForCapture(props.authorAvatarSrc),
)

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
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/75 via-white/55 to-[#FDF8F3]/90"
      aria-hidden="true"
    />

    <div
      class="relative z-[1] px-7 pb-8 pt-10"
      style="
        display: flex;
        flex-direction: column;
        min-height: 520px;
        box-sizing: border-box;
      "
    >
      <!-- 内联布局：html2canvas 对部分 WebView 下 Tailwind flex 截屏不稳定 -->
      <div
        class="mb-4"
        style="
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
        "
      >
        <div
          style="
            display: flex;
            min-width: 0;
            flex: 1;
            align-items: flex-start;
            gap: 10px;
          "
        >
          <img
            v-if="authorAvatarSrc && !authorIsAnonymous"
            :src="authorAvatarSrc"
            alt=""
            :crossorigin="authorAvatarCrossOrigin"
            width="44"
            height="44"
            style="
              width: 44px;
              height: 44px;
              border-radius: 9999px;
              object-fit: cover;
              border: 1px solid #e5d9cf;
              flex-shrink: 0;
              display: block;
            "
          />
          <div
            v-else-if="authorIsAnonymous"
            style="
              width: 44px;
              height: 44px;
              border-radius: 9999px;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 1px solid #b8d4b0;
              background: #e8f5e9;
              font-size: 18px;
            "
            aria-hidden="true"
          >
            🌿
          </div>
          <div
            v-else
            style="
              width: 44px;
              height: 44px;
              border-radius: 9999px;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 1px solid #e5d9cf;
              background: #f5ede6;
              font-size: 12px;
              font-weight: 600;
              color: #9a8a7e;
            "
            aria-hidden="true"
          >
            木
          </div>
          <p
            style="
              min-width: 0;
              flex: 1;
              margin: 0;
              padding-top: 2px;
              color: #5c4b4b;
              font-size: 15px;
              font-weight: 600;
              line-height: 1.45;
              white-space: normal;
              overflow-wrap: anywhere;
              word-break: break-word;
            "
          >
            {{ authorNickname }}
          </p>
        </div>
        <span
          class="rounded-full px-3 py-1.5 text-[12px] font-semibold leading-none"
          :class="moodBadgeClass()"
          :style="moodBadgePosterStyle()"
          style="flex-shrink: 0; align-self: flex-start"
        >
          {{ mood }}
        </span>
      </div>

      <p
        class="mb-3"
        style="
          margin: 0 0 12px;
          white-space: pre-wrap;
          word-break: break-word;
          color: #4a3e3e;
          font-size: 17px;
          font-weight: 500;
          line-height: 1.75;
        "
      >
        {{ bodyText }}
      </p>

      <div
        v-if="bgImage && !bgFailed"
        class="mb-5"
        style="
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border-radius: 16px;
          width: 100%;
          height: 220px;
          background: #faf7f5;
          line-height: 0;
        "
      >
        <img
          :src="bgImage"
          alt=""
          :crossorigin="bgImgCrossOrigin"
          width="304"
          height="220"
          style="
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            border-radius: 16px;
            vertical-align: top;
          "
          @error="bgFailed = true"
        />
      </div>

      <div style="flex: 1; min-height: 12px" aria-hidden="true" />

      <p
        class="mb-8"
        style="
          margin: 0 0 32px;
          color: #8b7b7b;
          font-size: 12px;
          letter-spacing: 0.04em;
        "
      >
        {{ dateLine }}
      </p>

      <div
        style="
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          border-top: 1px solid rgba(232, 221, 212, 0.85);
          padding-top: 20px;
          margin-top: auto;
        "
      >
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
