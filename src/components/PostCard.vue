<script setup lang="ts">
import { computed } from 'vue'
import { Heart, MessageCircle, Share2, Star } from 'lucide-vue-next'
import type { PostItem } from '@/store/postStore'

const props = defineProps<{
  post: PostItem
}>()

const emit = defineEmits<{
  like: [id: number]
  favorite: [id: number]
  comment: [id: number]
  open: [id: number]
}>()

const imageClass = computed(() => {
  if (props.post.images.length === 1) {
    return 'grid-cols-1'
  }
  if (props.post.images.length === 2 || props.post.images.length === 4) {
    return 'grid-cols-2'
  }
  return 'grid-cols-3'
})

const toggleLike = () => emit('like', props.post.id)
const toggleFavorite = () => emit('favorite', props.post.id)
const openComment = () => emit('comment', props.post.id)
const openDetail = () => emit('open', props.post.id)
</script>

<template>
  <article
    class="mb-3 rounded-2xl border border-slate-100/50 bg-white p-4 shadow-ambient transition-all duration-200 active:scale-[0.97]"
    @click="openDetail"
  >
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img
          :src="post.avatar"
          :alt="post.nickname"
          class="h-9 w-9 rounded-full border border-slate-100 object-cover"
        />
        <div>
          <p class="text-[15px] font-semibold text-slate-800">{{ post.nickname }}</p>
          <p class="text-[12px] text-slate-400">{{ post.createdAt }}</p>
        </div>
      </div>
      <span
        v-if="post.followsOnly"
        class="rounded-full bg-brand/10 px-2 py-1 text-[12px] text-brand"
      >
        关注
      </span>
    </div>

    <h3 class="mb-2 text-[17px] font-semibold leading-snug text-slate-900">
      {{ post.title }}
    </h3>
    <p class="mb-3 text-[15px] leading-relaxed text-slate-600">{{ post.content }}</p>

    <div
      v-if="post.images.length"
      class="mb-3 grid gap-2"
      :class="imageClass"
    >
      <img
        v-for="(image, idx) in post.images"
        :key="`${post.id}-${idx}`"
        :src="image"
        alt="post-image"
        class="h-24 w-full rounded-xl object-cover"
      />
    </div>

    <div
      class="flex items-center justify-between border-t border-slate-100/60 pt-3 text-slate-400"
      @click.stop
    >
      <button
        type="button"
        class="flex items-center gap-1 rounded-full px-2 py-1 text-[12px] transition-all duration-200 active:scale-[0.97]"
        @click="toggleLike"
      >
        <Heart
          class="h-4 w-4 transition-all duration-200"
          :class="post.liked ? 'animate-soft-bounce fill-liked text-liked' : 'text-slate-400'"
        />
        {{ post.likes }}
      </button>

      <button
        type="button"
        class="flex items-center gap-1 rounded-full px-2 py-1 text-[12px] transition-all duration-200 active:scale-[0.97]"
        @click="openComment"
      >
        <MessageCircle class="h-4 w-4" />
        {{ post.comments }}
      </button>

      <button
        type="button"
        class="flex items-center gap-1 rounded-full px-2 py-1 text-[12px] transition-all duration-200 active:scale-[0.97]"
        @click="toggleFavorite"
      >
        <Star
          class="h-4 w-4"
          :class="post.favorited ? 'fill-favorite text-favorite' : 'text-slate-400'"
        />
        收藏
      </button>

      <button
        type="button"
        class="flex items-center gap-1 rounded-full px-2 py-1 text-[12px] transition-all duration-200 active:scale-[0.97]"
      >
        <Share2 class="h-4 w-4" />
        分享
      </button>
    </div>
  </article>
</template>
