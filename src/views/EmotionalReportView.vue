<script setup lang="ts">
/**
 * 路由入口：全屏月报仍走独立路径，UI 由 MonthlyReport 模态承担。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MonthlyReport from '@/components/MonthlyReport.vue'

const route = useRoute()
const router = useRouter()

const month = computed(() => {
  const m = route.params.month
  return Array.isArray(m) ? (m[0] ?? '') : String(m ?? '')
})

const open = ref(true)

watch(month, () => {
  open.value = true
})

function onClose(v: boolean) {
  if (!v) {
    void router.replace('/profile')
  }
}
</script>

<template>
  <MonthlyReport
    v-model="open"
    :month="month"
    :embedded="false"
    @update:model-value="onClose"
  />
</template>
