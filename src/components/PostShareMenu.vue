<script setup lang="ts">
/**
 * 分享入口：与 Vant ShareSheet 等效交互，选项与取消均显式 .stop，避免触发底层 Post 卡片跳转
 */
const props = withDefaults(
  defineProps<{
    show: boolean
    title?: string
    description?: string
  }>(),
  {
    title: '分享这份心情',
    description: undefined,
  },
)

const emit = defineEmits<{
  'update:show': [value: boolean]
  poster: []
  copy: []
}>()

function close() {
  emit('update:show', false)
}

function onPoster(e: MouseEvent | TouchEvent) {
  e.stopPropagation()
  close()
  emit('poster')
}

function onCopy(e: MouseEvent | TouchEvent) {
  e.stopPropagation()
  close()
  emit('copy')
}

function onCancel(e: MouseEvent | TouchEvent) {
  e.stopPropagation()
  close()
}

/** 阻止触摸/鼠标事件向下穿透到 Post 卡片 */
function stopBubble(e: Event) {
  e.stopPropagation()
}
</script>

<template>
  <van-popup
    :show="props.show"
    position="bottom"
    round
    teleport="body"
    safe-area-inset-bottom
    :overlay-style="{ background: 'rgba(0,0,0,0.65)' }"
    @update:show="emit('update:show', $event)"
  >
    <!-- 整块区域拦截冒泡/穿透，避免底下卡片收到点击 -->
    <div
      class="bg-white pb-[env(safe-area-inset-bottom,0px)]"
      role="dialog"
      aria-label="分享选项"
      @click.stop
      @mousedown="stopBubble"
      @touchstart="stopBubble"
    >
      <div class="van-hairline--bottom px-4 pb-3 pt-4 text-center">
        <h2 class="text-[16px] font-semibold text-warmInk">{{ title }}</h2>
        <p
          v-if="description"
          class="mt-1.5 text-[13px] leading-relaxed text-warmInk/50"
        >
          {{ description }}
        </p>
      </div>
      <button
        type="button"
        class="van-hairline--top w-full py-3.5 text-[15px] text-warmInk active:bg-apricot/50"
        @click.stop="onPoster"
      >
        生成心情海报
      </button>
      <button
        type="button"
        class="van-hairline--top w-full py-3.5 text-[15px] text-warmInk active:bg-apricot/50"
        @click.stop="onCopy"
      >
        复制链接
      </button>
      <div class="bg-apricot/40 px-3 pt-2 pb-3">
        <button
          type="button"
          class="w-full rounded-xl bg-white py-3 text-[15px] font-medium text-warmInk shadow-sm active:scale-[0.99]"
          @click.stop="onCancel"
        >
          取消
        </button>
      </div>
    </div>
  </van-popup>
</template>
