<script setup lang="ts">
/**
 * 时间胶囊详情：到期且本地未拆封时的沉浸式擦除 / 长按解封仪式层
 */
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { playCapsuleWaterDropSound } from '@/utils/capsuleWaterDropSound'

const emit = defineEmits<{
  complete: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
/** 整层淡出（约 1s），与需求 transition: opacity 1s 对齐 */
const layerOpacity = ref(1)
const fading = ref(false)

let longPressTimer: ReturnType<typeof setTimeout> | null = null
let longPressArm = false
let lastSampleAt = 0
let unmounted = false

function lockBodyScroll(lock: boolean) {
  if (typeof document === 'undefined') {
    return
  }
  document.body.style.overflow = lock ? 'hidden' : ''
}

function resizeAndPaintFog() {
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = 'rgba(252, 248, 243, 0.93)'
  ctx.fillRect(0, 0, w, h)
}

/** 采样估算擦除比例（约 50% 触发解封） */
function measureErasedRatio(): number {
  const canvas = canvasRef.value
  if (!canvas) {
    return 0
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return 0
  }
  const { width, height } = canvas
  if (width < 8 || height < 8) {
    return 0
  }
  let image: ImageData
  try {
    image = ctx.getImageData(0, 0, width, height)
  } catch {
    return 0
  }
  const d = image.data
  const pixelStride = 5
  let cleared = 0
  let total = 0
  for (let py = 0; py < height; py += pixelStride) {
    for (let px = 0; px < width; px += pixelStride) {
      const i = (py * width + px) * 4
      total++
      if (d[i + 3]! < 40) {
        cleared++
      }
    }
  }
  return total > 0 ? cleared / total : 0
}

function clearLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  longPressArm = false
}

function startLongPress() {
  if (fading.value) {
    return
  }
  clearLongPress()
  longPressArm = true
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    if (longPressArm && !fading.value) {
      void finishReveal()
    }
  }, 2000)
}

function onOverlayPointerDown() {
  startLongPress()
}

function onOverlayPointerUp() {
  clearLongPress()
}

function eraseAt(clientX: number, clientY: number) {
  const canvas = canvasRef.value
  if (!canvas || fading.value) {
    return
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  ctx.save()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(x, y, 44, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const now = performance.now()
  if (now - lastSampleAt > 320) {
    lastSampleAt = now
    const ratio = measureErasedRatio()
    if (ratio >= 0.48) {
      void finishReveal()
    }
  }
}

function onCanvasPointerMove(e: PointerEvent) {
  if (fading.value || e.buttons !== 1) {
    return
  }
  eraseAt(e.clientX, e.clientY)
}

async function finishReveal() {
  if (fading.value || unmounted) {
    return
  }
  clearLongPress()
  fading.value = true
  playCapsuleWaterDropSound()
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40)
    }
  } catch {
    /* ignore */
  }
  layerOpacity.value = 1
  await nextTick()
  requestAnimationFrame(() => {
    layerOpacity.value = 0
  })
  window.setTimeout(() => {
    if (!unmounted) {
      emit('complete')
    }
  }, 1000)
}

function onResize() {
  if (!fading.value) {
    resizeAndPaintFog()
  }
}

onMounted(() => {
  lockBodyScroll(true)
  void nextTick().then(() => resizeAndPaintFog())
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  unmounted = true
  clearLongPress()
  lockBodyScroll(false)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[240] flex touch-none flex-col ease-out"
      :class="fading ? 'pointer-events-none' : ''"
      :style="{
        opacity: layerOpacity,
        transition: 'opacity 1s ease-out',
        WebkitTapHighlightColor: 'transparent',
      }"
      @pointerdown="onOverlayPointerDown"
      @pointerup="onOverlayPointerUp"
      @pointercancel="onOverlayPointerUp"
    >
      <!-- 模糊预览层：透出背后详情内容 -->
      <div
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 pb-[28vh] text-center"
        style="backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px)"
      >
        <p
          class="max-w-sm text-[15px] font-medium leading-relaxed text-warmInk/95"
        >
          有些回忆，值得时间去擦拭。手指滑动擦除迷雾，唤醒回忆。
        </p>
        <p class="mt-5 text-[12px] text-warmInk/60">
          长按 2 秒，或涂抹约一半区域，即可拆封
        </p>
      </div>

      <canvas
        ref="canvasRef"
        class="absolute inset-0 h-full w-full cursor-pointer"
        @pointermove="onCanvasPointerMove"
      />
    </div>
  </Teleport>
</template>
