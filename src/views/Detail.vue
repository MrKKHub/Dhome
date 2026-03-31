<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
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
    showToast('评论内容不能为空')
    return
  }
  commentText.value = ''
  showToast('评论成功')
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
      class="rounded-2xl bg-slate-100 py-12 text-center text-[15px] text-slate-500"
    >
      内容不存在或已被删除。
    </div>

    <div
      v-if="post"
      class="space-y-3 rounded-2xl border border-slate-100/50 bg-white p-4 shadow-ambient"
    >
      <h3 class="text-[17px] font-semibold leading-snug text-slate-900">评论区</h3>

      <div class="flex items-start gap-2">
        <textarea
          v-model="commentText"
          class="min-h-20 w-full rounded-xl bg-slate-50 px-3 py-2 text-[14px] text-slate-700 outline-none ring-brand/20 focus:ring"
          maxlength="200"
          placeholder="写下你的看法..."
        ></textarea>
        <button
          type="button"
          class="rounded-full bg-brand px-4 py-2 text-[12px] font-semibold text-white transition-all duration-200 active:scale-[0.97]"
          @click="submitComment"
        >
          发送
        </button>
      </div>

      <div v-if="comments.length" class="space-y-2">
        <div
          v-for="item in comments"
          :key="item.id"
          class="rounded-xl bg-slate-50 p-3"
        >
          <div class="mb-2 flex items-center gap-2">
            <img
              :src="item.avatar"
              :alt="item.nickname"
              class="h-7 w-7 rounded-full border border-slate-100"
            />
            <div>
              <p class="text-[13px] font-semibold text-slate-700">{{ item.nickname }}</p>
              <p class="text-[12px] text-slate-400">{{ item.createdAt }}</p>
            </div>
          </div>
          <p class="text-[14px] leading-relaxed text-slate-600">{{ item.content }}</p>
        </div>
      </div>
      <div v-else class="rounded-xl bg-slate-100 py-5 text-center text-[13px] text-slate-500">
        还没有评论，来抢沙发吧～
      </div>
    </div>
  </section>
</template>
