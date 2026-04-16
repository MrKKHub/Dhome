<script setup lang="ts">
/**
 * 发布成功后的「共鸣时刻」：Teleport 至 body 的底栏，样式仅在本文件 scoped 内。
 */
const props = defineProps<{
  modelValue: boolean
  resonanceCount: number
  moodTag: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="prf-root">
      <div
        v-if="props.modelValue"
        class="prf-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prf-msg"
      >
        <div class="prf-mask" aria-hidden="true" @click.self="close" />
        <div class="prf-sheet-wrap">
          <div class="prf-sheet" @click.stop>
            <p id="prf-msg" class="prf-body">
              发布成功！此刻，有 {{ props.resonanceCount }} 位友邻也正感到『{{
                props.moodTag
              }}』，你并不孤单。
            </p>
            <button type="button" class="prf-btn" @click="close">
              好的
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.prf-root {
  position: fixed;
  inset: 0;
  z-index: 5100;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  pointer-events: none;
}

.prf-mask {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
}

.prf-sheet-wrap {
  position: relative;
  z-index: 1;
  pointer-events: none;
  display: flex;
  justify-content: center;
  width: 100%;
}

.prf-sheet {
  pointer-events: auto;
  width: 100%;
  max-width: 28rem;
  margin: 0 auto;
  padding: 1.35rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom, 0px));
  border-radius: 1.25rem 1.25rem 0 0;
  background: linear-gradient(165deg, #fff8f4 0%, #fdf5f0 55%, #faf3ee 100%);
  box-shadow:
    0 -12px 40px rgba(15, 23, 42, 0.18),
    0 -1px 0 rgba(255, 255, 255, 0.65) inset;
  border: 1px solid rgba(255, 200, 175, 0.45);
  border-bottom: none;
}

.prf-body {
  margin: 0 0 1.15rem;
  font-size: 1rem;
  line-height: 1.65;
  font-weight: 500;
  color: rgba(55, 42, 40, 0.92);
}

.prf-btn {
  width: 100%;
  border: none;
  border-radius: 9999px;
  padding: 0.85rem 1rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  background: linear-gradient(90deg, #fb923c 0%, #f97316 48%, #ea580c 100%);
  box-shadow: 0 4px 18px rgba(249, 115, 22, 0.35);
}

.prf-btn:active {
  transform: scale(0.98);
}

.prf-root-enter-active,
.prf-root-leave-active {
  transition: opacity 0.24s ease;
}

.prf-root-enter-active .prf-sheet,
.prf-root-leave-active .prf-sheet {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.prf-root-enter-from,
.prf-root-leave-to {
  opacity: 0;
}

.prf-root-enter-from .prf-sheet,
.prf-root-leave-to .prf-sheet {
  transform: translateY(110%);
}
</style>
