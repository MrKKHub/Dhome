<script setup lang="ts">
import { computed, useId } from 'vue'
import type { CSSProperties } from 'vue'
import { MAPLE_LEAF_PATHS } from '@/utils/leafPicker'

const gradPrefix = useId()

/** 单叶：位置、漂移、呼吸、形态与色彩（由首页 onMounted 生成 + LeafPicker） */
export type HomeLeafBreezeSeed = {
  id: string
  stroke: string
  strokeSoft: string
  topPct: number
  anchorLeftPct: number
  delayDrift: number
  delayBreathe: number
  driftDuration: number
  rtl: boolean
  zIndex: number
  /** 与余弦包络相乘，峰值 0.2–0.4 */
  plateauOpacity: number
}

/** 必须保留 `props.` 前缀：赋值给变量后，模板不会自动展开 prop 名 */
const props = defineProps<{
  zoneHeightPx: number
  layer: 'behind' | 'front'
  leaves: HomeLeafBreezeSeed[]
}>()

const containerZ = computed(() => (props.layer === 'behind' ? 24 : 26))

const containerStyle = computed((): CSSProperties => {
  const h = Math.max(120, Math.round(Number(props.zoneHeightPx) || 0))
  return {
    height: `${h}px`,
    zIndex: containerZ.value,
  }
})

/** 每片叶独立渐变 id，避免多叶共用一个 defs */
function leafGradId(leafId: string) {
  return `${gradPrefix}-${leafId.replace(/[^a-zA-Z0-9_-]/g, 'x')}`
}

</script>

<template>
  <Teleport to="body">
    <div
      class="leaf-breeze-container pointer-events-none"
      :style="containerStyle"
      aria-hidden="true"
    >
      <div
        v-for="leaf in props.leaves"
        :key="leaf.id"
        class="leaf-breeze-anchor"
        :style="{
          top: `${leaf.topPct}%`,
          left: `${leaf.anchorLeftPct}%`,
          zIndex: leaf.zIndex,
          '--drift-duration': `${leaf.driftDuration}s`,
          '--drift-delay': `${leaf.delayDrift}s`,
          '--breathe-delay': `${leaf.delayBreathe}s`,
        }"
      >
        <div
          class="leaf-breeze-drift"
          :class="{ 'leaf-breeze-drift--rtl': leaf.rtl }"
        >
          <!-- 余弦感透明度包络（0→1→0）× SVG 上 plateauOpacity = 最终 0→峰值→0 -->
          <div class="leaf-breathe">
            <div
              class="leaf-breathe-opacity"
              :style="{ '--peak': String(leaf.plateauOpacity) }"
            >
              <svg
                class="leaf-breeze-svg"
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    :id="leafGradId(leaf.id)"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" :stop-color="leaf.stroke" stop-opacity="0.88" />
                    <stop
                      offset="100%"
                      :stop-color="leaf.strokeSoft"
                      stop-opacity="0.72"
                    />
                  </linearGradient>
                </defs>
                <path
                  :stroke="`url(#${leafGradId(leaf.id)})`"
                  stroke-width="1.1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  fill="none"
                  :d="MAPLE_LEAF_PATHS.main"
                />
                <path
                  v-if="MAPLE_LEAF_PATHS.extra"
                  :stroke="`url(#${leafGradId(leaf.id)})`"
                  stroke-width="0.95"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  fill="none"
                  :d="MAPLE_LEAF_PATHS.extra"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.leaf-breeze-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  max-width: 100vw;
  pointer-events: none;
  overflow: visible;
  isolation: isolate;
}

.leaf-breeze-anchor {
  position: absolute;
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
}

.leaf-breeze-drift {
  animation-name: leaf-drift-ltr;
  animation-duration: var(--drift-duration, 10s);
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-delay: var(--drift-delay, 0s);
  will-change: transform;
}

.leaf-breeze-drift--rtl {
  animation-name: leaf-drift-rtl;
}

@keyframes leaf-drift-ltr {
  from {
    transform: translate3d(-18vw, 0, 0);
  }

  to {
    transform: translate3d(calc(100vw + 18vw), 0, 0);
  }
}

@keyframes leaf-drift-rtl {
  from {
    transform: translate3d(calc(100vw + 18vw), 0, 0);
  }

  to {
    transform: translate3d(-18vw, 0, 0);
  }
}

/* 位移 + 旋转：与透明度包络同周期、同 delay */
.leaf-breathe {
  animation: breathe-leaf-motion 3s ease-in-out infinite;
  animation-delay: var(--breathe-delay, 0s);
  will-change: transform;
}

/*
 * 近似余弦包络的透明度：两端 0，中段抬到 1，再乘子元素上的 --peak（0.2–0.4）。
 * 关键帧不含 var()，兼容性好。
 */
.leaf-breathe-opacity {
  animation: breathe-leaf-opacity-cos 3s ease-in-out infinite;
  animation-delay: var(--breathe-delay, 0s);
  will-change: opacity;
  opacity: 0;
}

.leaf-breeze-svg {
  display: block;
  opacity: var(--peak, 0.3);
  filter: drop-shadow(0 0 4px rgba(90, 70, 50, 0.12));
}

@keyframes breathe-leaf-opacity-cos {
  0%,
  100% {
    opacity: 0;
  }

  6% {
    opacity: 0.12;
  }

  12% {
    opacity: 0.35;
  }

  18%,
  82% {
    opacity: 1;
  }

  88% {
    opacity: 0.35;
  }

  94% {
    opacity: 0.12;
  }
}

@keyframes breathe-leaf-motion {
  0%,
  100% {
    transform: translateY(0) rotate(-20deg);
  }

  12% {
    transform: translateY(-2px) rotate(-6deg);
  }

  22% {
    transform: translateY(-3px) rotate(12deg);
  }

  50% {
    transform: translateY(3px) rotate(-18deg);
  }

  78% {
    transform: translateY(-3px) rotate(14deg);
  }

  88% {
    transform: translateY(-1px) rotate(4deg);
  }
}
</style>
