<template>
  <div class="post-skel-root flex w-full flex-col gap-6 pb-2" aria-hidden="true">
    <div
      v-for="i in count"
      :key="i"
      class="skel-card overflow-hidden rounded-[28px] border border-[#EDE5DC]/90 bg-white/40 p-4 shadow-sm"
    >
      <div class="mb-3 flex items-start gap-3">
        <div class="skel-shimmer h-10 w-10 shrink-0 rounded-full" />
        <div class="min-w-0 flex-1 space-y-2 pt-0.5">
          <div class="skel-shimmer h-3.5 w-28 rounded-full" />
          <div class="skel-shimmer h-3 w-20 rounded-full opacity-70" />
        </div>
        <div class="skel-shimmer h-6 w-14 shrink-0 rounded-full" />
      </div>
        <div class="skel-shimmer mb-2 h-4 w-[85%] rounded-full" />
      <div class="skel-shimmer mb-2 h-4 w-full rounded-full opacity-90" />
      <div class="skel-shimmer mb-4 h-4 w-[72%] rounded-full opacity-80" />
      <div class="mb-3 grid grid-cols-3 gap-2">
        <div class="skel-shimmer h-24 w-full rounded-2xl" />
        <div class="skel-shimmer h-24 w-full rounded-2xl" />
        <div class="skel-shimmer h-24 w-full rounded-2xl" />
      </div>
      <div class="flex justify-between border-t border-[#EDE5DC]/60 pt-3">
        <div class="skel-shimmer h-8 w-16 rounded-full" />
        <div class="skel-shimmer h-8 w-14 rounded-full" />
        <div class="skel-shimmer h-8 w-14 rounded-full" />
        <div class="skel-shimmer h-8 w-14 rounded-full" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number
  }>(),
  { count: 3 },
)
</script>

<style scoped>
.skel-shimmer {
  background: linear-gradient(
    90deg,
    #f0e8e0 0%,
    #faf6f2 45%,
    #f0e8e0 90%
  );
  background-size: 200% 100%;
  animation: skel-shine 1.35s ease-in-out infinite;
}

@keyframes skel-shine {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
