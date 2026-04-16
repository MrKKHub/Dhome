<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { requestPermission as requestPushPermission } from '@/services/pushService'

/** 与产品约定一致：存在则不再展示首访欢迎层 */
const STORAGE_KEY = 'muxin_first_timer'

const showLayer = ref(false)
const fadeOut = ref(false)
const route = useRoute()

/**
 * 与 localStorage 对齐展示状态。
 * 仅 onMounted 读一次会在「同标签先打开过站点、再在 DevTools 里清空存储」时漏掉：
 * 此时组件不会 remount，需依赖路由变化再次同步（例如清缓存后去登录再跳进首页）。
 */
function syncWelcomeFromStorage() {
  try {
    if (localStorage.getItem(STORAGE_KEY)) {
      showLayer.value = false
      fadeOut.value = false
      return
    }
    // 离场动画中不写回 true，避免闪烁
    if (!fadeOut.value) {
      showLayer.value = true
    }
  } catch {
    showLayer.value = false
  }
}

onMounted(syncWelcomeFromStorage)

watch(() => route.fullPath, syncWelcomeFromStorage)

/** 点击「开启树洞」：触发推送授权（OneSignal），再整层 0.8s 淡出并写入 localStorage */
const onEnter = () => {
  if (fadeOut.value) return
  void requestPushPermission()
  fadeOut.value = true
}

const onTransitionEnd = (e: TransitionEvent) => {
  if (e.target !== e.currentTarget) return
  if (e.propertyName !== 'opacity' || !fadeOut.value) return
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // 忽略写入失败
  }
  showLayer.value = false
  fadeOut.value = false
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="showLayer"
      class="welcome-overlay first-visit-root px-6 pt-[max(2rem,env(safe-area-inset-top))] [padding-bottom:max(2.75rem,calc(env(safe-area-inset-bottom,0px)+2rem))]"
      :class="fadeOut ? 'first-visit-root--leave' : ''"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-visit-title"
      @transitionend.self="onTransitionEnd"
    >
      <!-- 外层：入场 fade-in-up；文案：呼吸感（延迟启动）；背景仅用实色渐变，避免 rgba 整层发透 -->
      <div class="first-visit-title-wrap relative z-[1] flex max-w-[19rem] flex-col items-center">
        <img
          src="/logo.png"
          alt=""
          width="60"
          height="60"
          loading="eager"
          decoding="async"
          class="first-visit-logo mb-10 h-[60px] w-[60px] shrink-0 object-contain"
        />
        <p
          id="first-visit-title"
          class="first-visit-breathe text-center text-[17px] font-light leading-[1.85] tracking-[0.02em] text-warmInk"
          style="font-family: 'Noto Serif SC', 'STKaiti', 'KaiTi', serif"
        >
          林间有风，树洞有耳。你的每一声心事，都会在这里长成新叶。
        </p>
      </div>
      <button
        type="button"
        class="first-visit-btn relative z-[1] mt-12 rounded-full border border-faint bg-surface px-8 py-2.5 text-[14px] font-medium tracking-wide text-warmInk shadow-sm transition-transform duration-150 ease-out will-change-transform active:scale-[0.95]"
        @click="onEnter"
      >
        开启树洞
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
/**
 * 强制盖住视口 + Header：fixed + 100vw + 高 z-index；背景仅用不透明色，勿在常态下给本层设 opacity，
 * 避免子元素（Logo/文案）被连带冲淡；离场时仅通过 --leave 做整层淡出。
 */
.welcome-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(
    to bottom,
    var(--bg-page),
    rgb(var(--tw-apricot) / 0.55)
  );
  z-index: 9999;
  isolation: isolate;
}

.first-visit-root {
  transition: opacity 0.8s ease;
}

.first-visit-root--leave {
  opacity: 0;
  pointer-events: none;
}

/* 品牌弱水印：约 60px、30% 不透明度，与正文间距约 40px（mb-10） */
.first-visit-logo {
  opacity: 0.3;
}

/* 文案：自下方 10px 淡入并归位，1.5s */
@keyframes first-visit-fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.first-visit-title-wrap {
  animation: first-visit-fade-in-up 1.5s ease forwards;
}

/* 呼吸感：透明度 + 极轻缩放，入场结束后再循环 */
@keyframes first-visit-breathe {
  0%,
  100% {
    opacity: 0.88;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.018);
  }
}

.first-visit-breathe {
  animation: first-visit-breathe 4.2s ease-in-out 1.5s infinite;
  transform-origin: center center;
}
</style>
