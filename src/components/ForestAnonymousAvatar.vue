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
    class="inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-emerald-200 shadow-sm dark:border-emerald-800/50 dark:from-emerald-900/50 dark:to-emerald-800/40"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
    }"
    aria-hidden="true"
  >
    <component
      :is="Icon"
      class="text-emerald-700 dark:text-emerald-300"
      :size="Math.round(size * 0.5)"
      :stroke-width="2"
    />
  </div>
</template>
