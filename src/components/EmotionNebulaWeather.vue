<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import type { Component } from 'vue'
import { CloudLightning, CloudRain, Moon, Sun } from 'lucide-vue-next'
import {
  MOOD_BADGE_POSTER_STYLE,
  MOOD_CARD_SURFACE_COLOR,
  type PostMood,
} from '@/constants/moods'

const props = defineProps<{
  /** 近 7 天各心情计数（与接口 moodLast7Days 一致） */
  moodRows: Array<{ mood: string; count: number }>
  /** 近 7 天心情帖总数，与「共记录了 N 条」一致 */
  totalRecords: number
}>()

/** #RRGGBB 追加两位十六进制透明度，供渐变与光晕 */
function hexWithAlpha(hex: string, alphaHex: string): string {
  const t = hex.trim()
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return `${t}${alphaHex}`
  return `#E8E2DC${alphaHex}`
}

/** 夜空上的心情光团：高亮芯 + 柔边，在深色底上更「发光」 */
function buildDreamyRadial(core: string, mist: string, glow: string): string {
  return `radial-gradient(ellipse 118% 112% at 32% 28%, ${hexWithAlpha(core, 'EE')} 0%, ${hexWithAlpha(glow, 'DD')} 40%, ${hexWithAlpha(mist, '99')} 58%, rgba(200, 215, 255, 0.28) 72%, transparent 82%)`
}

/** 每个粒子一套位移变量，配合 keyframes 在情绪图区域内随机感漂浮 */
function particleDriftVars(seed: number): Record<string, string> {
  const u = (salt: number, mag: number) =>
    `${(seeded01(seed, salt) * 2 - 1) * mag}px`
  return {
    '--neb-dx1': u(40, 10),
    '--neb-dy1': u(41, 13),
    '--neb-dx2': u(42, 12),
    '--neb-dy2': u(43, 9),
    '--neb-dx3': u(44, 11),
    '--neb-dy3': u(45, 12),
  }
}

/** 星云配色：与发布页心情体系一致 */
function particlePalette(mood: string): {
  glow: string
  core: string
  mist: string
  gradient: string
} {
  const key = mood.trim()
  if (key in MOOD_BADGE_POSTER_STYLE) {
    const row = MOOD_BADGE_POSTER_STYLE[key as PostMood]
    const mist = MOOD_CARD_SURFACE_COLOR[key as PostMood] ?? row.backgroundColor
    return {
      glow: row.backgroundColor,
      core: row.color,
      mist,
      gradient: buildDreamyRadial(row.color, mist, row.backgroundColor),
    }
  }
  const glow = '#E8E2DC'
  const core = '#9A8F86'
  const mist = '#F3EEE8'
  return {
    glow,
    core,
    mist,
    gradient: buildDreamyRadial(core, mist, glow),
  }
}

/** 气象分组：平静/期待类暖阳；忧郁类细雨；生气/烦躁雷雨 */
type WeatherKind = 'warm' | 'rain' | 'storm'

const MOOD_WEATHER: Record<string, WeatherKind> = {
  平静: 'warm',
  期待: 'warm',
  小确幸: 'warm',
  emo: 'rain',
  疲惫: 'rain',
  浮躁: 'storm',
}

function weatherKindForMood(mood: string): WeatherKind {
  return MOOD_WEATHER[mood.trim()] ?? 'warm'
}

const WEATHER_ICON: Record<WeatherKind, Component> = {
  warm: Sun,
  rain: CloudRain,
  storm: CloudLightning,
}

/** 简单确定性随机 [0,1)，保证同数据下布局稳定 */
function seeded01(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const MAX_PARTICLES = 88

/** 按条数展开心情，总量过大时按比例压缩粒子数，避免低端机卡顿 */
function expandedMoods(rows: Array<{ mood: string; count: number }>, total: number): string[] {
  if (total <= 0 || !rows.length) return []
  if (total <= MAX_PARTICLES) {
    const out: string[] = []
    for (const r of rows) {
      const c = Math.max(0, r.count)
      for (let i = 0; i < c; i++) out.push(r.mood)
    }
    return out
  }
  const scale = MAX_PARTICLES / total
  const out: string[] = []
  for (const r of rows) {
    const n = Math.max(1, Math.round(r.count * scale))
    for (let i = 0; i < n; i++) out.push(r.mood)
  }
  while (out.length > MAX_PARTICLES) out.pop()
  return out
}

const isEmptyWeek = computed(
  () => props.totalRecords <= 0 || props.moodRows.length === 0,
)

/** 占比最高的心情，决定右上角气象图标 */
const dominantMood = computed(() => {
  if (isEmptyWeek.value) return ''
  let best = props.moodRows[0]!
  for (const r of props.moodRows) {
    if (r.count > best.count) best = r
  }
  return best.mood
})

const dominantWeatherKind = computed<WeatherKind>(() => {
  if (isEmptyWeek.value) return 'warm'
  return weatherKindForMood(dominantMood.value)
})

const weatherIcon = computed<Component>(() => {
  if (isEmptyWeek.value) return Moon
  return WEATHER_ICON[dominantWeatherKind.value] ?? Sun
})

/** 气象图标：太阳慢旋 / 云雨雷电轻摆 / 空周月亮微呼吸 */
const weatherIconMotionClass = computed(() => {
  if (isEmptyWeek.value) return 'emotion-weather-moon'
  if (dominantWeatherKind.value === 'warm') return 'emotion-weather-sun'
  return 'emotion-weather-cloud'
})

/** 图标配色：太阳暖黄橙、云雨冷色、月亮淡紫（Lucide 描边跟随 currentColor） */
const weatherIconPaintClass = computed(() => {
  if (isEmptyWeek.value) {
    return 'text-indigo-100/85 drop-shadow-[0_0_10px_rgba(190,200,255,0.45)]'
  }
  if (dominantWeatherKind.value === 'warm') {
    return 'emotion-sun-look'
  }
  return 'text-sky-100/88 drop-shadow-[0_0_10px_rgba(160,210,255,0.45)]'
})

type ParticleRow = {
  key: string
  left: number
  top: number
  size: number
  floatDelay: number
  floatDuration: number
  breatheDelay: number
  breatheDuration: number
  gradient: string
  glow: string
  driftVars: Record<string, string>
}

/** 空周：冷色微光粒子，适配星空底 */
const EMPTY_SKY_GRADIENT =
  'radial-gradient(circle at 36% 30%, rgba(240, 244, 255, 0.95) 0%, rgba(170, 190, 230, 0.5) 48%, transparent 72%)'

/** 背景星点（确定性随机，与心情数据无关） */
type SkyStar = {
  key: string
  left: number
  top: number
  size: number
  starLo: string
  starHi: string
  delay: string
  duration: string
}

const skyStars = computed((): SkyStar[] =>
  Array.from({ length: 52 }, (_, i) => ({
    key: `star-${i}`,
    left: seeded01(i, 50) * 100,
    top: seeded01(i, 51) * 100,
    size: 1 + Math.floor(seeded01(i, 52) * 2.2),
    starLo: String(0.12 + seeded01(i, 53) * 0.28),
    starHi: String(0.62 + seeded01(i, 56) * 0.38),
    delay: `${(seeded01(i, 54) * 5).toFixed(2)}s`,
    duration: `${2.8 + seeded01(i, 55) * 3.2}s`,
  })),
)

const particles = computed((): ParticleRow[] => {
  if (isEmptyWeek.value) {
    // 优雅降级：稀疏灰粒子 + 月亮态
    return Array.from({ length: 18 }, (_, i) => ({
      key: `e-${i}`,
      glow: i % 3 === 0 ? '#b8c5e8' : '#c9d4f0',
      gradient: EMPTY_SKY_GRADIENT,
      left: 8 + seeded01(i, 1) * 84,
      top: 12 + seeded01(i, 2) * 76,
      size: 14 + seeded01(i, 3) * 10,
      floatDelay: seeded01(i, 4) * 5,
      floatDuration: 4.2 + seeded01(i, 5) * 2.8,
      breatheDelay: seeded01(i, 6) * 3.5,
      breatheDuration: 4 + seeded01(i, 7) * 2.2,
      driftVars: particleDriftVars(800 + i),
    }))
  }
  const moods = expandedMoods(props.moodRows, props.totalRecords)
  return moods.map((mood, i) => {
    const { glow, gradient } = particlePalette(mood)
    return {
      key: `${mood}-${i}`,
      glow,
      gradient,
      left: 8 + seeded01(i, 11) * 82,
      top: 14 + seeded01(i, 12) * 72,
      size: 15 + seeded01(i, 13) * 12,
      floatDelay: seeded01(i, 14) * 4,
      floatDuration: 5 + seeded01(i, 15) * 2.5,
      breatheDelay: seeded01(i, 16) * 3.2,
      breatheDuration: 4.2 + seeded01(i, 17) * 2.4,
      driftVars: particleDriftVars(1200 + i),
    }
  })
})

/** 指针在容器内归一化坐标，用于粒子微避让 */
const pointer = ref<{ nx: number; ny: number; active: boolean }>({
  nx: 0.5,
  ny: 0.5,
  active: false,
})

const containerEl = shallowRef<HTMLElement | null>(null)

function updatePointer(clientX: number, clientY: number) {
  const el = containerEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return
  pointer.value = {
    nx: (clientX - r.left) / r.width,
    ny: (clientY - r.top) / r.height,
    active: true,
  }
}

function onPointerMove(e: PointerEvent) {
  updatePointer(e.clientX, e.clientY)
}

function onPointerLeave() {
  pointer.value = { nx: 0.5, ny: 0.5, active: false }
}

/** 粒子相对中心避让位移（px），触摸解压感 */
function fleeStyle(idx: number, leftPct: number, topPct: number): Record<string, string> {
  const el = containerEl.value
  const { nx, ny, active } = pointer.value
  if (!el || !active) {
    return { transform: 'translate(0px, 0px)' }
  }
  const w = el.clientWidth
  const h = el.clientHeight
  const px = leftPct * 0.01 * w
  const py = topPct * 0.01 * h
  const cx = nx * w
  const cy = ny * h
  let dx = px - cx
  let dy = py - cy
  const dist = Math.hypot(dx, dy) + 0.001
  const influence = 72
  let strength = (influence - dist) / influence
  if (strength <= 0) {
    return { transform: 'translate(0px, 0px)' }
  }
  strength = Math.min(1, strength ** 1.4)
  const jitter = 0.92 + seeded01(idx, 99) * 0.16
  const push = 22 * strength * jitter
  dx /= dist
  dy /= dist
  return {
    transform: `translate(${dx * push}px, ${dy * push}px)`,
  }
}

function onVizMount(el: unknown) {
  containerEl.value = el instanceof HTMLElement ? el : null
}
</script>

<template>
  <div
    :ref="onVizMount"
    class="emotion-nebula-root relative h-full w-full min-h-[7rem] touch-pan-y overflow-hidden rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
    @pointerdown="onPointerMove"
  >
    <!-- 夜空主色：深靛 → 紫 → 墨蓝 -->
    <div
      class="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950"
      aria-hidden="true"
    />
    <!-- 远处淡星云（粉紫 / 青，极低透明度） -->
    <div
      class="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-2xl opacity-70"
      aria-hidden="true"
      style="
        background: radial-gradient(65% 50% at 12% 88%, rgba(255, 150, 180, 0.12) 0%, transparent 55%),
          radial-gradient(55% 45% at 92% 18%, rgba(120, 200, 255, 0.1) 0%, transparent 50%),
          radial-gradient(80% 40% at 50% 0%, rgba(160, 140, 255, 0.08) 0%, transparent 45%);
      "
    />
    <!-- 细碎星点 -->
    <div
      class="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-2xl"
      aria-hidden="true"
    >
      <span
        v-for="s in skyStars"
        :key="s.key"
        class="emotion-sky-star absolute rounded-full bg-white"
        :style="{
          left: `${s.left}%`,
          top: `${s.top}%`,
          width: `${s.size}px`,
          height: `${s.size}px`,
          marginLeft: `${-s.size / 2}px`,
          marginTop: `${-s.size / 2}px`,
          '--star-lo': s.starLo,
          '--star-hi': s.starHi,
          animationDelay: s.delay,
          animationDuration: s.duration,
        }"
      />
    </div>

    <!-- 右上角气象：太阳暖色发光 / 其余冷色微光 -->
    <div
      class="pointer-events-none absolute right-0.5 top-0.5 z-20 flex items-center justify-end p-1 transition-opacity"
      :class="isEmptyWeek ? 'opacity-60' : 'opacity-95'"
      aria-hidden="true"
    >
      <component
        :is="weatherIcon"
        :class="[
          'h-8 w-8 sm:h-9 sm:w-9',
          weatherIconMotionClass,
          weatherIconPaintClass,
        ]"
        :stroke-width="1.35"
      />
    </div>

    <!-- 星云粒子：径向渐变 + 轻 blur + 外发光；外层上下漂浮、内层呼吸缩放 -->
    <div
      class="pointer-events-none absolute inset-0 z-10 overflow-visible"
      aria-hidden="true"
    >
      <div
        v-for="(p, idx) in particles"
        :key="p.key"
        class="emotion-float-outer absolute"
        :style="{
          left: `${p.left}%`,
          top: `${p.top}%`,
          animationDuration: `${p.floatDuration}s`,
          animationDelay: `${p.floatDelay}s`,
          ...p.driftVars,
        }"
      >
        <div class="emotion-flee-wrap" :style="fleeStyle(idx, p.left, p.top)">
          <div
            class="emotion-nebula-blob nebula-particle rounded-full"
            :style="{
              width: `${p.size}px`,
              height: `${p.size}px`,
              marginLeft: `${-p.size / 2}px`,
              marginTop: `${-p.size / 2}px`,
              background: p.gradient,
              boxShadow: `0 0 4px 2px rgba(255,255,255,0.35), 0 0 ${Math.round(p.size * 0.9)}px 4px ${hexWithAlpha(p.glow, 'CC')}, 0 0 ${Math.round(p.size * 1.75)}px 10px ${hexWithAlpha(p.glow, '77')}, 0 0 ${Math.round(p.size * 2.5)}px 18px rgba(200,210,255,0.25)`,
              animationDuration: `${p.breatheDuration}s`,
              animationDelay: `${p.breatheDelay}s`,
            }"
          />
        </div>
      </div>
    </div>

    <!-- 空周文案 -->
    <div
      v-if="isEmptyWeek"
      class="pointer-events-none absolute bottom-2 left-0 right-0 z-20 px-2 text-center text-[11px] leading-snug text-white/40"
    >
      本周还是空白的
    </div>
  </div>
</template>

<style scoped>
/* 背景星点：轻微闪烁，营造星空呼吸感 */
.emotion-sky-star {
  box-shadow: 0 0 3px 1px rgba(200, 220, 255, 0.45);
  animation-name: emotion-sky-star-twinkle;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  will-change: opacity;
}

@keyframes emotion-sky-star-twinkle {
  0%,
  100% {
    opacity: var(--star-lo, 0.2);
    transform: scale(0.88);
  }
  50% {
    opacity: var(--star-hi, 0.95);
    transform: scale(1.06);
  }
}

/* 外层：在情绪图区域内随机感漂移（位移由每个粒子的 CSS 变量决定） */
.emotion-float-outer {
  animation-name: emotion-nebula-drift;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  will-change: transform;
}

@keyframes emotion-nebula-drift {
  0%,
  100% {
    transform: translate(0, 0);
  }
  22% {
    transform: translate(var(--neb-dx1), var(--neb-dy1));
  }
  48% {
    transform: translate(var(--neb-dx2), var(--neb-dy2));
  }
  72% {
    transform: translate(var(--neb-dx3), var(--neb-dy3));
  }
  88% {
    transform: translate(
      calc((var(--neb-dx1) + var(--neb-dx3)) * 0.28),
      calc((var(--neb-dy1) + var(--neb-dy2)) * 0.22)
    );
  }
}

.emotion-flee-wrap {
  will-change: transform;
}

/* 轻 blur + 强外发光，呼吸时更「亮」 */
.emotion-nebula-blob {
  filter: blur(2.5px);
  animation-name: emotion-nebula-breathe;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  will-change: transform, opacity;
}

@keyframes emotion-nebula-breathe {
  0%,
  100% {
    opacity: 0.78;
    transform: scale(0.94);
  }
  50% {
    opacity: 1;
    transform: scale(1.12);
  }
}

/* 太阳：暖黄橙 + 多层光晕，略加快旋转 */
.emotion-sun-look {
  color: #ffcf5a;
  filter: drop-shadow(0 0 4px rgba(255, 230, 160, 0.95))
    drop-shadow(0 0 10px rgba(255, 185, 80, 0.85)) drop-shadow(0 0 18px rgba(255, 130, 40, 0.45));
}

.emotion-weather-sun {
  transform-origin: 50% 50%;
  animation: emotion-weather-sun-spin 38s linear infinite;
}

@keyframes emotion-weather-sun-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 云雨雷电：轻微左右摆动 */
.emotion-weather-cloud {
  animation: emotion-weather-cloud-sway 5.2s ease-in-out infinite;
  transform-origin: 50% 55%;
}

@keyframes emotion-weather-cloud-sway {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(5px);
  }
}

/* 空周月亮：极轻起伏，不抢戏 */
.emotion-weather-moon {
  animation: emotion-weather-moon-drift 7s ease-in-out infinite;
  transform-origin: 50% 50%;
}

@keyframes emotion-weather-moon-drift {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.85;
  }
  50% {
    transform: translateY(-2px);
    opacity: 1;
  }
}
</style>
