<script setup lang="ts">
import { computed } from 'vue'
import { resolveForestLucideIcon } from '@/constants/forestLucideMap'

const props = withDefaults(
  defineProps<{
    iconKey?: string | null
    size?: number
  }>(),
  { size: 40 },
)

const Icon = computed(() => resolveForestLucideIcon(props.iconKey))
</script>

<template>
  <div
    class="inline-flex shrink-0 items-center justify-center rounded-full border border-[#C8E6C9]/90 shadow-sm"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      background: 'linear-gradient(145deg, #E8F5E9 0%, #C8E6C9 100%)',
    }"
    aria-hidden="true"
  >
    <component
      :is="Icon"
      class="text-[#2E7D32]"
      :size="Math.round(size * 0.5)"
      :stroke-width="2"
    />
  </div>
</template>
