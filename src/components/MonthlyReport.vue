<script setup lang="ts">
/**
 * 心情月报：全屏沉浸式模态（Teleport + z-index 9999 + body 滚动锁定）。
 * 样式全部 scoped，类名前缀 mr-；不修改全局 CSS 变量。
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'
import { storeToRefs } from 'pinia'
import { ArrowLeft, Share2 } from 'lucide-vue-next'
import { showToast } from 'vant'
import request from '@/api/request'
import EmotionNebulaWeather from '@/components/EmotionNebulaWeather.vue'
import { useThemeStore } from '@/store/themeStore'
import {
  MOOD_BADGE_POSTER_STYLE,
  type PostMood,
} from '@/constants/moods'

type MoodRow = { mood: string; count: number }

type MonthlyApi = {
  success?: boolean
  month?: string
  totalPosts?: number
  moods?: MoodRow[]
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** YYYY-MM */
    month: string
    /** true：从「我的」打开，需 pushState 拦截系统返回 */
    embedded?: boolean
  }>(),
  { embedded: true },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

const loading = ref(true)
const monthKey = ref('')
const totalPosts = ref(0)
const moods = ref<MoodRow[]>([])

/** 导出时隐藏顶栏按钮（截图内仅内容 + 右下角品牌） */
const hideChromeForCapture = ref(false)
/** 截图前：标题改纯色 + 冻结背景动画，避免 html2canvas 渲染异常 */
const capturePlainForShot = ref(false)

const moodRowsForNebula = computed(() => moods.value)

function isValidMonthParam(s: string): boolean {
  return /^\d{4}-\d{2}$/.test(s)
}

const totalForOrbs = computed(() => {
  const t = moods.value.reduce((s, r) => s + r.count, 0)
  return t > 0 ? t : 1
})

const topFourSlots = computed((): MoodRow[] => {
  const sorted = [...moods.value].sort((a, b) => b.count - a.count)
  const out = sorted.slice(0, 4)
  const pad: MoodRow = { mood: ' ', count: 0 }
  while (out.length < 4) {
    out.push(pad)
  }
  return out
})

/** 更大面积光晕：在比例上加宽 vw，blur 40px+ */
function orbBoxStyle(count: number): Record<string, string> {
  const t = totalForOrbs.value
  const c = Math.max(0, count)
  const w = `min(88vw, calc(42vw + (${c} / ${t}) * 160px))`
  return {
    width: w,
    height: w,
  }
}

function moodGlowColor(mood: string): string {
  const k = mood.trim() as PostMood
  if (k in MOOD_BADGE_POSTER_STYLE) {
    return MOOD_BADGE_POSTER_STYLE[k].backgroundColor
  }
  return '#e8e2dc'
}

const ORB_ANCHORS = [
  { left: '18%', top: '24%' },
  { left: '78%', top: '20%' },
  { left: '22%', top: '68%' },
  { left: '70%', top: '62%' },
]

const meshPanelStyle = computed(() => {
  const slots = topFourSlots.value
  const layers: string[] = []
  for (let i = 0; i < 4; i++) {
    const row = slots[i]!
    const rgb = moodGlowColor(
      row.mood?.trim() ? row.mood : '平静',
    ).replace('#', '')
    const aa = row.count > 0 ? '44' : '16'
    const pos = ORB_ANCHORS[i]!
    layers.push(
      `radial-gradient(ellipse 85% 72% at ${pos.left} ${pos.top}, #${rgb}${aa} 0%, transparent 58%)`,
    )
  }
  return { backgroundImage: layers.join(', ') }
})

/** 主标题「四月」等：随 monthKey 动态 */
const CN_MONTHS = [
  '',
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
] as const

const reportParsed = computed(() => {
  const m = monthKey.value
  const p = /^(\d{4})-(\d{2})$/.exec(m)
  if (!p) {
    return { year: '', monthLabel: '—月', valid: false }
  }
  const mo = Number(p[2])
  const monthLabel =
    mo >= 1 && mo <= 12 ? (CN_MONTHS[mo] ?? '—月') : '—月'
  return { year: p[1], monthLabel, valid: true }
})

const reportYearDisplay = computed(() => reportParsed.value.year)

const reportMonthLabel = computed(() => reportParsed.value.monthLabel)

function moodPercent(row: MoodRow): string {
  if (totalPosts.value <= 0) {
    return '0'
  }
  return Math.round((row.count / totalPosts.value) * 100).toString()
}

async function loadReport(month: string) {
  if (!isValidMonthParam(month)) {
    showToast('月份格式无效')
    emit('update:modelValue', false)
    return
  }
  loading.value = true
  try {
    const res = await request.get<MonthlyApi>(
      `/user/monthly-mood/${encodeURIComponent(month)}`,
    )
    const d = res.data
    if (!d?.success) {
      showToast('暂时拿不到月报数据')
      emit('update:modelValue', false)
      return
    }
    monthKey.value = d.month ?? month
    totalPosts.value = typeof d.totalPosts === 'number' ? d.totalPosts : 0
    moods.value = Array.isArray(d.moods) ? d.moods : []
  } catch {
    showToast('加载失败，请稍后再试')
    emit('update:modelValue', false)
  } finally {
    loading.value = false
  }
}

/** body 滚动锁定：记录原 overflow 便于还原 */
let bodyOverflowCache = ''

function lockBodyScroll() {
  if (typeof document === 'undefined') {
    return
  }
  bodyOverflowCache = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') {
    return
  }
  document.body.style.overflow = bodyOverflowCache
}

let historyPushed = false

function onPopState() {
  if (props.modelValue) {
    emit('update:modelValue', false)
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      lockBodyScroll()
      if (props.embedded && typeof history !== 'undefined') {
        history.pushState({ monthlyReport: true }, '')
        historyPushed = true
        window.addEventListener('popstate', onPopState)
      }
    } else {
      unlockBodyScroll()
      window.removeEventListener('popstate', onPopState)
      if (
        props.embedded &&
        typeof history !== 'undefined' &&
        (history.state as { monthlyReport?: boolean } | null)?.monthlyReport
      ) {
        history.back()
      }
      historyPushed = false
    }
  },
)

watch(
  () => [props.modelValue, props.month] as const,
  ([open, m]) => {
    if (!open || !isValidMonthParam(m)) {
      return
    }
    const d = new Date()
    if (d.getDate() < 15) {
      showToast('每月 15 日起可查看心情月报哦～')
      emit('update:modelValue', false)
      return
    }
    void loadReport(m)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  unlockBodyScroll()
  window.removeEventListener('popstate', onPopState)
})

/** 返回：嵌入式配合 pushState；路由模式仅通知父级关闭 */
function handleBack() {
  if (props.embedded && historyPushed) {
    window.history.back()
    return
  }
  emit('update:modelValue', false)
}

const sharing = ref(false)

async function captureReportPng() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(18)
    } catch {
      /* 触觉不可用时忽略 */
    }
  }
  const el = document.getElementById('report-container')
  const titleStack = document.getElementById('report-title-stack')
  if (!el) {
    showToast('未找到月报区域')
    return
  }
  sharing.value = true
  hideChromeForCapture.value = true
  capturePlainForShot.value = true
  await nextTick()
  /** 强制重绘：固定背景触发 layout，便于截图插件采样标题区域 */
  if (titleStack) {
    titleStack.style.backgroundColor = 'transparent'
    void titleStack.offsetHeight
  }
  void el.offsetHeight
  try {
    await new Promise<void>((r) => setTimeout(r, 500))
    const { default: html2canvas } = await import('html2canvas')
    const w = window.innerWidth
    const h = window.innerHeight
    const canvas = await html2canvas(el, {
      useCORS: true,
      scale: 2,
      backgroundColor: null,
      logging: true,
      width: w,
      height: h,
      windowWidth: w,
      windowHeight: h,
    })
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `心情月报-${monthKey.value || 'export'}.png`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    showToast('长图已生成下载')
  } catch {
    showToast('导出失败，请稍后再试')
  } finally {
    if (titleStack) {
      titleStack.style.backgroundColor = ''
    }
    capturePlainForShot.value = false
    hideChromeForCapture.value = false
    sharing.value = false
  }
}

</script>

<template>
  <Teleport to="body">
    <Transition name="mr-fade">
      <div
        v-if="modelValue"
        class="mr-shell"
        :class="{ 'mr-shell--light': !isDark }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mr-title-main"
      >
        <div
          v-if="loading"
          class="mr-loading"
        >
          正在展开你的情绪银河…
        </div>

        <div
          v-else
          id="report-container"
          class="mr-capture"
          :class="{ 'mr-capture--freeze': capturePlainForShot }"
        >
          <div class="mr-capture-stack">
            <div
              class="mr-nebula-host"
              aria-hidden="true"
            >
              <EmotionNebulaWeather
                class="mr-nebula"
                :mood-rows="moodRowsForNebula"
                :total-records="totalPosts"
              />
            </div>

            <div
              class="mr-mesh-wrap"
              aria-hidden="true"
            >
              <div
                class="mr-mesh-panel"
                :style="meshPanelStyle"
              />
              <div
                v-for="(slot, idx) in topFourSlots"
                :key="`orb-${idx}-${slot.mood}`"
                class="mr-orb"
                :style="{
                  ...orbBoxStyle(slot.count),
                  left: ORB_ANCHORS[idx]!.left,
                  top: ORB_ANCHORS[idx]!.top,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: moodGlowColor(
                    slot.mood?.trim() ? slot.mood : '平静',
                  ),
                  opacity: slot.count > 0 ? 0.78 : 0.22,
                }"
              />
            </div>

            <main class="mr-scroll">
              <div
                id="report-title-stack"
                class="mr-title-stack"
                :class="{ 'mr-title-stack--capture-plain': capturePlainForShot }"
              >
                <div class="mr-year-row">
                  <span
                    class="mr-year-hairline"
                    aria-hidden="true"
                  />
                  <span class="mr-year-text">{{ reportYearDisplay }}</span>
                </div>
                <h1
                  id="mr-title-main"
                  class="mr-h1"
                >
                  <span class="mr-h1-month">{{ reportMonthLabel }}</span><span class="mr-h1-suffix"> · 情绪回响</span>
                </h1>
                <p class="mr-lead">
                  本月共落下 <span class="mr-num">{{ totalPosts }}</span> 条心情笔迹。下面这些光晕，是你在不同时刻留下的真实呼吸。
                </p>
              </div>

              <section class="mr-section">
                <h2 class="mr-h2">
                  情绪印记
                </h2>
                <ul class="mr-mood-list">
                  <li
                    v-for="row in moods"
                    :key="row.mood"
                    class="mr-mood-item"
                  >
                    <span
                      class="mr-mood-name"
                      :style="{
                        color: moodGlowColor(row.mood),
                        textShadow: `0 0 28px ${moodGlowColor(row.mood)}99`,
                      }"
                    >{{ row.mood }}</span>
                    <p class="mr-mood-line">
                      <span class="mr-mood-count">{{ row.count }} 次</span>
                      <span class="mr-mood-dot">·</span>
                      <span class="mr-mood-pct">约占 {{ moodPercent(row) }}%</span>
                    </p>
                  </li>
                </ul>
                <p
                  v-if="!moods.length"
                  class="mr-empty"
                >
                  这个月还没有记录。去写一条树洞，下一页月报就会亮起属于你的星云。
                </p>
              </section>

              <section class="mr-outro" style="margin: 0;padding-top: 0">
                <p class="mr-outro-text">
                  你不必把每一种心情都解释得完美。
                </p>
              </section>
            </main>

            <div
              class="mr-brand"
              aria-hidden="true"
            >
            DTree · 木心
            </div>
          </div>
        </div>

        <!-- 置于最上层，保证始终可点返回 / 分享 -->
        <header
          v-show="!hideChromeForCapture"
          class="mr-chrome"
        >
          <button
            type="button"
            class="mr-icon-btn mr-icon-btn--back"
            aria-label="返回"
            @click="handleBack"
          >
            <ArrowLeft class="h-5 w-5" />
          </button>
          <button
            type="button"
            class="mr-icon-btn"
            :disabled="sharing || loading"
            aria-label="生成月报长图"
            @click="captureReportPng"
          >
            <Share2 class="h-5 w-5" />
          </button>
        </header>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mr-fade-enter-active,
.mr-fade-leave-active {
  transition: opacity 0.28s ease;
}

.mr-fade-enter-from,
.mr-fade-leave-to {
  opacity: 0;
}

/* 全屏沉浸式：盖住 TabBar（z-20）与顶栏（z-30） */
.mr-shell {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #030711;
  color: rgba(248, 250, 252, 0.94);
}

/* 浅色：壳底略提亮，正文改深灰蓝系保证对比 */
.mr-shell--light {
  background: linear-gradient(180deg, #f4f7ff 0%, #eef2fa 48%, #e8edf7 100%);
  color: rgba(30, 41, 59, 0.92);
}

.mr-shell--light .mr-nebula {
  opacity: 0.52;
}

.mr-shell--light .mr-mood-item {
  border-bottom-color: rgba(30, 41, 59, 0.08);
}

.mr-shell--light .mr-outro {
  border-top-color: rgba(30, 41, 59, 0.1);
}

.mr-chrome {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 12px;
  pointer-events: none;
}

.mr-icon-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(8, 12, 24, 0.55);
  color: rgba(241, 245, 249, 0.92);
  backdrop-filter: blur(14px);
}

.mr-icon-btn:disabled {
  opacity: 0.45;
}

.mr-shell--light .mr-icon-btn {
  border-color: rgba(30, 41, 59, 0.12);
  background: rgba(255, 255, 255, 0.72);
  color: rgba(51, 65, 85, 0.9);
}

.mr-loading {
  position: relative;
  z-index: 9990;
  padding: 6rem 1.5rem 2rem;
  text-align: center;
  font-size: 0.95rem;
  color: rgba(203, 213, 225, 0.78);
}

.mr-shell--light .mr-loading {
  color: rgba(71, 85, 105, 0.78);
}

/* 与视口对齐的截图根：整屏 100vh */
.mr-capture {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10000;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  box-sizing: border-box;
  padding-top: env(safe-area-inset-top, 0px);
}

/* 截图前冻结星云入场动画，避免画布采样时滤镜/变换未稳定 */
.mr-capture--freeze .mr-nebula-host {
  animation: none !important;
  transform: scale(1);
  opacity: 1;
  filter: none;
}

/* 截图前：主标题月份词取消渐变与透明填充，改为纯色（兼容 html2canvas） */
.mr-title-stack--capture-plain .mr-h1-month {
  background: none !important;
  -webkit-background-clip: unset !important;
  background-clip: unset !important;
  -webkit-text-fill-color: #ffffff !important;
  color: #ffffff !important;
}

.mr-shell--light .mr-title-stack--capture-plain .mr-h1-month {
  -webkit-text-fill-color: #1e293b !important;
  color: #1e293b !important;
}

.mr-title-stack--capture-plain .mr-h1 {
  text-shadow: none;
}

.mr-title-stack--capture-plain .mr-h1-suffix {
  color: #ffffff;
}

.mr-shell--light .mr-title-stack--capture-plain .mr-h1-suffix {
  color: rgba(30, 41, 59, 0.92);
}

.mr-title-stack--capture-plain .mr-year-text {
  color: rgba(255, 255, 255, 0.55);
}

.mr-shell--light .mr-title-stack--capture-plain .mr-year-text {
  color: rgba(30, 41, 59, 0.55);
}

.mr-title-stack--capture-plain .mr-year-hairline {
  background: rgba(255, 255, 255, 0.5);
}

.mr-shell--light .mr-title-stack--capture-plain .mr-year-hairline {
  background: rgba(30, 41, 59, 0.28);
}

.mr-capture-stack {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100%;
}

.mr-nebula-host {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  transform-origin: 50% 45%;
  animation: mr-nebula-burst 1.35s cubic-bezier(0.18, 0.82, 0.22, 1) both;
}

@keyframes mr-nebula-burst {
  0% {
    transform: scale(0.32);
    opacity: 0.4;
    filter: blur(18px);
  }
  55% {
    opacity: 0.95;
    filter: blur(4px);
  }
  100% {
    transform: scale(1);
    opacity: 1;
    filter: none;
  }
}

.mr-nebula {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 100%;
  opacity: 0.96;
}

.mr-mesh-wrap {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}

.mr-mesh-panel {
  position: absolute;
  inset: -18%;
  opacity: 0.62;
  mix-blend-mode: screen;
}

.mr-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
  z-index: 2;
}

.mr-scroll {
  position: relative;
  z-index: 4;
  box-sizing: border-box;
  height: 100%;
  max-width: 22.5rem;
  margin: 0 auto;
  padding: calc(3.25rem + env(safe-area-inset-top, 0px)) 1.4rem
    calc(4.5rem + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mr-title-stack {
  margin-bottom: 0.25rem;
}

.mr-year-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.65rem;
}

.mr-year-hairline {
  display: inline-block;
  width: 18px;
  height: 1px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.45);
  border-radius: 1px;
}

.mr-shell--light .mr-year-hairline {
  background: rgba(30, 41, 59, 0.22);
}

.mr-year-text {
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.5);
}

.mr-shell--light .mr-year-text {
  color: rgba(30, 41, 59, 0.5);
}

.mr-h1 {
  margin: 0 0 1.35rem;
  font-size: 2.05rem;
  line-height: 1.22;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-shadow:
    0 0 40px rgba(99, 102, 241, 0.35),
    0 4px 32px rgba(2, 6, 23, 0.75);
}

.mr-shell--light .mr-h1 {
  text-shadow: 0 2px 20px rgba(148, 163, 184, 0.35);
}

/* 「四月」：极淡渐变，深色底偏白→粉紫浅金 */
.mr-h1-month {
  font-weight: 600;
  letter-spacing: 0.1em;
  background: linear-gradient(
    118deg,
    #ffffff 0%,
    #fce7f3 42%,
    #fef9c3 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.mr-shell--light .mr-h1-month {
  background: linear-gradient(
    118deg,
    #1e293b 0%,
    #5b21b6 38%,
    #b45309 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.mr-h1-suffix {
  font-weight: 600;
  letter-spacing: 0.1em;
  color: rgba(252, 252, 255, 0.94);
}

.mr-shell--light .mr-h1-suffix {
  color: rgba(30, 41, 59, 0.9);
}

.mr-lead {
  margin: 0 0 2.5rem;
  font-size: 1rem;
  line-height: 1.8;
  font-weight: 300;
  letter-spacing: 0.04em;
  color: rgba(226, 232, 240, 0.84);
}

.mr-shell--light .mr-lead {
  color: rgba(51, 65, 85, 0.88);
}

.mr-num {
  font-weight: 500;
  color: #fde68a;
}

.mr-shell--light .mr-num {
  font-weight: 500;
  color: #b45309;
}

.mr-section {
  margin-bottom: 2.75rem;
}

.mr-h2 {
  margin: 0 0 1.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.55em;
  text-transform: uppercase;
  color: rgba(165, 180, 210, 0.55);
}

.mr-shell--light .mr-h2 {
  color: rgba(71, 85, 105, 0.65);
}

.mr-mood-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mr-mood-item {
  padding: 1.15rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.mr-mood-name {
  display: block;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.mr-mood-line {
  margin: 0.35rem 0 0;
  font-size: 0.88rem;
  letter-spacing: 0.12em;
  color: rgba(203, 213, 225, 0.72);
}

.mr-shell--light .mr-mood-line {
  color: rgba(71, 85, 105, 0.82);
}

.mr-mood-count {
  font-variant-numeric: tabular-nums;
}

.mr-mood-dot {
  margin: 0 0.25rem;
  opacity: 0.5;
}

.mr-mood-pct {
  font-variant-numeric: tabular-nums;
}

.mr-empty {
  margin: 0.75rem 0 0;
  font-size: 0.92rem;
  line-height: 1.75;
  color: rgba(203, 213, 225, 0.72);
}

.mr-shell--light .mr-empty {
  color: rgba(71, 85, 105, 0.82);
}

.mr-outro {
  margin-top: 1rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.mr-outro-text {
  margin: 0;
  font-family:
    'Noto Serif SC',
    'Songti SC',
    'STSong',
    Georgia,
    'Times New Roman',
    serif;
  font-size: 1.18rem;
  font-weight: 700;
  line-height: 2.05;
  letter-spacing: 0.06em;
  color: rgba(253, 250, 255, 0.94);
  text-shadow: 0 2px 24px rgba(15, 23, 42, 0.65);
}

.mr-shell--light .mr-outro-text {
  color: rgba(30, 41, 59, 0.9);
  text-shadow: none;
}

.mr-brand {
  position: absolute;
  right: calc(1rem + env(safe-area-inset-right, 0px));
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  z-index: 6;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: rgba(226, 232, 240, 0.55);
  pointer-events: none;
}

.mr-shell--light .mr-brand {
  color: rgba(71, 85, 105, 0.55);
}
</style>
