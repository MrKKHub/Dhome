<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { MOOD_BADGE_CLASS, MOOD_OPTIONS } from '@/constants/moods'
import type { PostMood } from '@/constants/moods'
import { usePostStore } from '@/store/postStore'

const router = useRouter()
const store = usePostStore()

const title = ref('')
const content = ref('')
const followsOnly = ref(false)
const selectedMood = ref<PostMood | ''>('')
const previewImages = ref<string[]>([])

const uploadImages = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (!files) {
    return
  }
  const left = 9 - previewImages.value.length
  if (left <= 0) {
    showToast('最多上传 9 张图片')
    return
  }
  Array.from(files)
    .slice(0, left)
    .forEach((file) => {
      const localUrl = URL.createObjectURL(file)
      previewImages.value.push(localUrl)
    })
}

const removeImage = (index: number) => {
  const target = previewImages.value[index]
  if (target) {
    URL.revokeObjectURL(target)
  }
  previewImages.value.splice(index, 1)
}

onBeforeUnmount(() => {
  previewImages.value.forEach((item) => URL.revokeObjectURL(item))
})

const pickMood = (m: PostMood) => {
  selectedMood.value = m
}

const submitPost = async () => {
  if (!title.value.trim() || !content.value.trim()) {
    showToast('请填写标题和正文')
    return
  }
  if (!selectedMood.value) {
    showToast('请选择此刻的心情')
    return
  }

  try {
    await store.publishPost({
      title: title.value.trim(),
      content: content.value.trim(),
      images: [...previewImages.value],
      mood: selectedMood.value,
      followsOnly: followsOnly.value,
    })
    showToast('已轻轻放进树洞～')
    router.push('/')
  } catch {
    showToast('发布失败，请稍后再试')
  }
}
</script>

<template>
  <section class="animate-fade-in">
    <div class="mb-4">
      <h2 class="text-2xl font-bold text-warmInk">写进树洞</h2>
      <p class="mt-1 text-[13px] text-warmInk/45">这里没有对错，只有被听见的温柔</p>
    </div>

    <div
      class="space-y-4 rounded-[28px] border border-[#F0E8E0]/80 bg-white/95 p-4 shadow-warm backdrop-blur-sm"
    >
      <div>
        <p class="mb-2 text-[13px] font-medium text-warmInk/70">此刻心情</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="m in MOOD_OPTIONS"
            :key="m"
            type="button"
            class="rounded-full px-3 py-2 text-[12px] font-medium transition-all duration-200 active:scale-[0.97]"
            :class="[
              MOOD_BADGE_CLASS[m],
              selectedMood === m
                ? 'ring-2 ring-brand/40 ring-offset-2 ring-offset-apricot'
                : 'opacity-80 hover:opacity-100',
            ]"
            @click="pickMood(m)"
          >
            {{ m }}
          </button>
        </div>
      </div>

      <input
        v-model="title"
        class="w-full rounded-2xl bg-apricot/80 px-3 py-3 text-[15px] text-warmInk outline-none transition-shadow duration-200 placeholder:text-warmInk/35 focus:bg-white focus:shadow-[0_0_0_3px_rgba(255,140,105,0.12)]"
        maxlength="40"
        placeholder="给情绪起个短短的标题…"
      />

      <textarea
        v-model="content"
        class="min-h-32 w-full rounded-2xl bg-apricot/80 px-3 py-3 text-[15px] leading-relaxed text-warmInk/85 outline-none transition-shadow duration-200 placeholder:text-warmInk/35 focus:bg-white focus:shadow-[0_0_0_3px_rgba(255,140,105,0.12)]"
        maxlength="300"
        placeholder="慢慢写，树洞会安静听完…"
      ></textarea>

      <label
        class="inline-flex w-full cursor-pointer justify-center rounded-full bg-[#F5EDE6] px-3 py-2.5 text-[14px] text-warmInk/65 transition-all duration-200 active:scale-[0.97]"
      >
        附上图片（最多 9 张）
        <input
          type="file"
          class="hidden"
          accept="image/*"
          multiple
          @change="uploadImages"
        />
      </label>

      <div
        v-if="previewImages.length"
        class="grid grid-cols-3 gap-2 rounded-2xl bg-apricot/50 p-2"
      >
        <div
          v-for="(image, idx) in previewImages"
          :key="image"
          class="relative"
        >
          <img :src="image" alt="preview" class="h-24 w-full rounded-xl object-cover" />
          <button
            type="button"
            class="absolute right-1 top-1 rounded-full bg-warmInk/55 px-2 py-0.5 text-[11px] text-white transition-all duration-200 active:scale-[0.97]"
            @click="removeImage(idx)"
          >
            删除
          </button>
        </div>
      </div>

      <label class="flex items-center justify-between rounded-2xl bg-apricot/60 px-3 py-3">
        <span class="text-[14px] text-warmInk/70">仅关注可见</span>
        <input
          v-model="followsOnly"
          type="checkbox"
          class="h-4 w-4 accent-brand"
        />
      </label>

      <button
        type="button"
        class="h-12 w-full rounded-full bg-gradient-to-r from-brand to-[#FFAB90] text-[15px] font-semibold text-white shadow-warm transition-all duration-200 active:scale-[0.97]"
        @click="submitPost"
      >
        放进树洞
      </button>
    </div>
  </section>
</template>
