<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Heart, Sparkles } from 'lucide-vue-next'
import { showToast } from 'vant'
import PostCard from '@/components/PostCard.vue'
import { usePostStore } from '@/store/postStore'

const route = useRoute()
const store = usePostStore()
const commentText = ref('')

const postId = computed(() => Number(route.params.id))
const post = computed(() => store.getPostById(postId.value))
const comments = computed(() => store.getCommentsByPost(postId.value))

const submitComment = () => {
  if (!post.value) {
    return
  }
  const success = store.addComment(post.value.id, commentText.value)
  if (!success) {
    showToast('写一点点再发送吧')
    return
  }
  commentText.value = ''
  showToast('你的回声已送达')
}
</script>

<template>
  <section class="animate-fade-in">
    <PostCard
      v-if="post"
      :post="post"
      @like="store.toggleLike"
      @favorite="store.toggleFavorite"
      @open="() => null"
      @comment="() => null"
    />

    <div
      v-else
      class="rounded-[28px] bg-apricot/70 py-12 text-center text-[15px] text-warmInk/50"
    >
      这片叶子飘走了，换个入口看看吧。
    </div>

    <div
      v-if="post"
      class="mt-3 space-y-4 rounded-[28px] border border-[#F0E8E0]/80 bg-white/95 p-4 shadow-warmLg backdrop-blur-sm"
    >
      <div class="flex items-center gap-2">
        <Heart class="h-4 w-4 fill-hug/35 text-hug" />
        <h3 class="text-[17px] font-semibold leading-snug text-warmInk">温柔回声</h3>
        <Sparkles class="h-4 w-4 text-lilac/80" />
      </div>
      <p class="-mt-1 text-[12px] leading-relaxed text-warmInk/45">
        这里没有输赢，只有陪伴。一句轻轻的「我懂」，也很好。
      </p>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea
          v-model="commentText"
          class="min-h-24 w-full rounded-2xl bg-apricot/70 px-3 py-2.5 text-[14px] leading-relaxed text-warmInk/85 outline-none transition-shadow duration-200 placeholder:text-warmInk/35 focus:bg-white focus:shadow-[0_0_0_3px_rgba(157,148,255,0.15)]"
          maxlength="200"
          placeholder="轻轻留下一句倾听或共情…"
        ></textarea>
        <button
          type="button"
          class="h-11 shrink-0 rounded-full bg-gradient-to-r from-lilac to-[#B8B0FF] px-5 text-[13px] font-semibold text-white shadow-warmLg transition-all duration-200 active:scale-[0.97] sm:h-auto sm:self-stretch sm:px-4"
          @click="submitComment"
        >
          送出回声
        </button>
      </div>

      <div v-if="comments.length" class="space-y-3">
        <div
          v-for="item in comments"
          :key="item.id"
          class="rounded-2xl border border-[#F0E8E0]/60 bg-apricot/40 p-3"
        >
          <div class="mb-2 flex items-center gap-2">
            <img
              :src="item.avatar"
              :alt="item.nickname"
              class="h-8 w-8 rounded-full border border-[#F0E8E0]"
            />
            <div>
              <p class="text-[13px] font-semibold text-warmInk">{{ item.nickname }}</p>
              <p class="text-[11px] text-warmInk/40">{{ item.createdAt }}</p>
            </div>
          </div>
          <p class="text-[14px] leading-relaxed text-warmInk/80">{{ item.content }}</p>
        </div>
      </div>
      <div
        v-else
        class="rounded-2xl bg-apricot/50 py-6 text-center text-[13px] text-warmInk/45"
      >
        还没有回声，做第一个轻轻敲门的人吧～
      </div>
    </div>
  </section>
</template>
