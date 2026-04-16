<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { MOOD_BADGE_CLASS } from '@/constants/moods'
import type { PostItem } from '@/store/postStore'

defineProps<{
  open: boolean
  loading: boolean
  post: PostItem | null
}>()

const emit = defineEmits<{
  close: []
  openDetail: [id: string]
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="pickup-backdrop">
      <div
        v-if="open"
        class="pickup-overlay fixed inset-0 z-[60] flex flex-col items-center justify-end sm:justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-title"
      >
        <div
          class="absolute inset-0 bg-warmInk/35 backdrop-blur-md"
          @click="emit('close')"
        />
        <div
          class="pickup-panel relative z-[1] mx-4 mb-[max(1.25rem,env(safe-area-inset-bottom))] w-full max-w-[min(100%,22rem)] rounded-[28px] border border-white/40 bg-white/72 p-5 shadow-[0_24px_60px_-20px_rgba(120,90,80,0.35)] backdrop-blur-xl sm:mb-0"
          @click.stop
        >
          <div class="mb-3 flex items-center justify-between gap-2">
            <h3
              id="pickup-title"
              class="text-[15px] font-semibold text-warmInk"
            >
              拾起一片心情
            </h3>
            <button
              type="button"
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-warmInk/55 shadow-inner transition-transform duration-200 active:scale-95"
              aria-label="关闭"
              @click="emit('close')"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <div
            v-if="loading"
            class="space-y-3 py-6"
          >
            <div class="skel-line mx-auto h-4 w-[75%] rounded-full" />
            <div class="skel-line h-4 w-full rounded-full" />
            <div class="skel-line h-4 w-5/6 rounded-full" />
            <p class="pt-2 text-center text-[12px] text-warmInk/50">
              正在沙滩上寻找一片贝壳…
            </p>
          </div>

          <template v-else-if="post">
            <div class="mb-3 flex items-center gap-2">
              <img
                :src="post.avatar"
                alt=""
                class="h-10 w-10 rounded-full border border-inkline object-cover"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-[14px] font-medium text-warmInk">
                  {{ post.nickname }}
                </p>
                <p class="text-[11px] text-warmInk/50">{{ post.createdAt }}</p>
              </div>
              <span
                class="shrink-0 rounded-full px-2 py-1 text-[10px] font-medium"
                :class="MOOD_BADGE_CLASS[post.mood]"
              >
                {{ post.mood }}
              </span>
            </div>
            <h4 class="mb-1.5 text-[16px] font-semibold leading-snug text-warmInk">
              {{ post.title }}
            </h4>
            <p class="mb-3 max-h-40 overflow-y-auto text-[14px] leading-relaxed text-warmInk/80">
              {{ post.content }}
            </p>
            <div
              v-if="post.images.length"
              class="mb-4 grid grid-cols-3 gap-1.5"
            >
              <img
                v-for="(img, idx) in post.images.slice(0, 6)"
                :key="idx"
                :src="img"
                alt=""
                class="aspect-square w-full rounded-xl object-cover"
              />
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                class="min-h-11 flex-1 rounded-full bg-surface-muted py-3 text-[14px] font-medium text-warmInk/75 transition-transform duration-200 active:scale-[0.98]"
                @click="emit('close')"
              >
                轻轻合上
              </button>
              <button
                type="button"
                class="min-h-11 flex-1 rounded-full bg-gradient-to-r from-brand to-brand/85 py-3 text-[14px] font-semibold text-white shadow-warm transition-transform duration-200 active:scale-[0.98]"
                @click="emit('openDetail', post.id)"
              >
                走进这条树洞
              </button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pickup-backdrop-enter-active,
.pickup-backdrop-leave-active {
  transition: opacity 0.35s ease;
}
.pickup-backdrop-enter-active .pickup-panel,
.pickup-backdrop-leave-active .pickup-panel {
  transition:
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.35s ease;
}
.pickup-backdrop-enter-from,
.pickup-backdrop-leave-to {
  opacity: 0;
}
.pickup-backdrop-enter-from .pickup-panel,
.pickup-backdrop-leave-to .pickup-panel {
  opacity: 0;
  transform: translateY(20px) scale(0.97);
}

.skel-line {
  height: 0.875rem;
  background: linear-gradient(
    90deg,
    rgb(var(--tw-apricot) / 0.35) 0%,
    rgb(var(--tw-apricot) / 0.55) 50%,
    rgb(var(--tw-apricot) / 0.35) 100%
  );
  background-size: 200% 100%;
  animation: skel 1.2s ease-in-out infinite;
}
@keyframes skel {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
