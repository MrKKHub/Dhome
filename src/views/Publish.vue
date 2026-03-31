<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { usePostStore } from '@/store/postStore'

const router = useRouter()
const store = usePostStore()

const title = ref('')
const content = ref('')
const followsOnly = ref(false)
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

const submitPost = () => {
  if (!title.value.trim() || !content.value.trim()) {
    showToast('请填写标题和正文')
    return
  }

  store.publishPost({
    title: title.value.trim(),
    content: content.value.trim(),
    images: [...previewImages.value],
    followsOnly: followsOnly.value,
  })

  showToast('发布成功')
  router.push('/')
}
</script>

<template>
  <section class="animate-fade-in">
    <div class="space-y-3 rounded-2xl border border-slate-100/50 bg-white p-4 shadow-ambient">
      <input
        v-model="title"
        class="w-full rounded-xl bg-slate-50 px-3 py-2 text-[15px] text-slate-800 outline-none ring-brand/20 focus:ring"
        maxlength="40"
        placeholder="输入标题（最多 40 字）"
      />

      <textarea
        v-model="content"
        class="min-h-28 w-full rounded-xl bg-slate-50 px-3 py-2 text-[15px] text-slate-700 outline-none ring-brand/20 focus:ring"
        maxlength="300"
        placeholder="写下你此刻的分享..."
      ></textarea>

      <label
        class="inline-flex w-full cursor-pointer justify-center rounded-full bg-slate-100 px-3 py-2 text-[14px] text-slate-600 transition-all duration-200 active:scale-[0.97]"
      >
        选择本地图片（最多 9 张）
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
        class="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2"
      >
        <div
          v-for="(image, idx) in previewImages"
          :key="image"
          class="relative"
        >
          <img :src="image" alt="preview" class="h-24 w-full rounded-lg object-cover" />
          <button
            type="button"
            class="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[12px] text-white transition-all duration-200 active:scale-[0.97]"
            @click="removeImage(idx)"
          >
            删除
          </button>
        </div>
      </div>

      <label class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
        <span class="text-[14px] text-slate-600">仅关注可见</span>
        <input
          v-model="followsOnly"
          type="checkbox"
          class="h-4 w-4 accent-brand"
        />
      </label>

      <button
        type="button"
        class="w-full rounded-full bg-brand py-2 text-[15px] font-semibold text-white transition-all duration-200 active:scale-[0.97]"
        @click="submitPost"
      >
        发布
      </button>
    </div>
  </section>
</template>
