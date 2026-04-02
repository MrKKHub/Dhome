<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  closeToast,
  showLoadingToast,
  showSuccessToast,
  showToast,
} from 'vant'
import { uploadPostImages } from '@/api/upload'
import { MOOD_BADGE_CLASS, MOOD_OPTIONS } from '@/constants/moods'
import type { PostMood } from '@/constants/moods'
import { usePostStore } from '@/store/postStore'
import { useUserStore } from '@/store/userStore'

interface ImageSlot {
  file: File
  preview: string
}

const router = useRouter()
const store = usePostStore()
const userStore = useUserStore()

const title = ref('')
const content = ref('')
const followsOnly = ref(false)
const selectedMood = ref<PostMood | ''>('')
const imageSlots = ref<ImageSlot[]>([])
const submitting = ref(false)
const formExiting = ref(false)

const uploadImages = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files) {
    return
  }
  const left = 9 - imageSlots.value.length
  if (left <= 0) {
    showToast('最多上传 9 张图片')
    input.value = ''
    return
  }
  Array.from(files)
    .slice(0, left)
    .forEach((file) => {
      imageSlots.value.push({
        file,
        preview: URL.createObjectURL(file),
      })
    })
  input.value = ''
}

const removeImage = (index: number) => {
  const slot = imageSlots.value[index]
  if (slot) {
    URL.revokeObjectURL(slot.preview)
  }
  imageSlots.value.splice(index, 1)
}

onBeforeUnmount(() => {
  imageSlots.value.forEach((slot) => URL.revokeObjectURL(slot.preview))
})

const pickMood = (m: PostMood) => {
  selectedMood.value = m
}

const resetForm = () => {
  title.value = ''
  content.value = ''
  selectedMood.value = ''
  followsOnly.value = false
  imageSlots.value.forEach((slot) => URL.revokeObjectURL(slot.preview))
  imageSlots.value = []
}

const axiosMessage = (e: unknown, fallback: string): string => {
  if (!axios.isAxiosError(e)) {
    return fallback
  }
  const data = e.response?.data as { message?: string | string[] } | undefined
  const m = data?.message
  if (Array.isArray(m) && m[0]) {
    return m[0]
  }
  if (typeof m === 'string' && m.trim()) {
    return m
  }
  return fallback
}

const submitPost = async () => {
  if (submitting.value) {
    return
  }
  if (!userStore.isLoggedIn || !userStore.token) {
    showToast('请先登录后再发布')
    router.push({ path: '/login', query: { redirect: '/publish' } })
    return
  }
  if (!title.value.trim() || !content.value.trim()) {
    showToast('请填写标题和正文')
    return
  }
  if (!selectedMood.value) {
    showToast('请选择此刻的心情')
    return
  }

  submitting.value = true
  let loader = false
  try {
    let urls: string[] = []
    if (imageSlots.value.length) {
      showLoadingToast({
        message: '正在上传图片…',
        forbidClick: true,
        duration: 0,
      })
      loader = true
      urls = await uploadPostImages(imageSlots.value.map((s) => s.file))
    }

    await store.publishPost({
      title: title.value.trim(),
      content: content.value.trim(),
      images: urls,
      mood: selectedMood.value,
      followsOnly: followsOnly.value,
    })

    if (loader) {
      closeToast()
    }
    formExiting.value = true
    await new Promise<void>((r) => setTimeout(r, 560))
    resetForm()
    formExiting.value = false
    showSuccessToast({
      message: '你的心事已轻轻落入树洞～',
      duration: 2200,
    })
    router.push('/')
  } catch (e) {
    if (loader) {
      closeToast()
    }
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      showToast('登录已过期，请重新登录')
      userStore.logout()
      router.push({ path: '/login', query: { redirect: '/publish' } })
      return
    }
    showToast(axiosMessage(e, '发布失败，请稍后再试'))
  } finally {
    submitting.value = false
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
      :class="formExiting ? 'publish-form-exit' : ''"
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
        :class="submitting ? 'pointer-events-none opacity-60' : ''"
      >
        附上图片（最多 9 张）
        <input
          type="file"
          class="hidden"
          accept="image/*"
          multiple
          :disabled="submitting"
          @change="uploadImages"
        />
      </label>

      <div
        v-if="imageSlots.length"
        class="grid grid-cols-3 gap-2 rounded-2xl bg-apricot/50 p-2"
      >
        <div
          v-for="(slot, idx) in imageSlots"
          :key="slot.preview"
          class="relative"
        >
          <img
            :src="slot.preview"
            alt="preview"
            class="h-24 w-full rounded-xl object-cover"
          />
          <button
            type="button"
            class="absolute right-1 top-1 rounded-full bg-warmInk/55 px-2 py-0.5 text-[11px] text-white transition-all duration-200 active:scale-[0.97]"
            :disabled="submitting"
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
          :disabled="submitting"
        />
      </label>

      <button
        type="button"
        class="flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-brand to-[#FFAB90] py-3.5 text-[15px] font-semibold text-white shadow-warm transition-all duration-200 active:scale-[0.97] disabled:opacity-60"
        :disabled="submitting"
        @click="submitPost"
      >
        {{ submitting ? '发布中…' : '放进树洞' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.publish-form-exit {
  pointer-events: none;
  animation: publishCeremonyOut 0.58s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes publishCeremonyOut {
  to {
    opacity: 0;
    transform: translateY(-1.75rem) scale(0.985);
    filter: blur(2px);
  }
}
</style>
