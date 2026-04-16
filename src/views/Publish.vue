<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  closeToast,
  showLoadingToast,
  showSuccessToast,
  showToast,
} from 'vant'
import request from '@/api/request'
import { uploadPostImages } from '@/api/upload'
import { MOOD_BADGE_CLASS, MOOD_OPTIONS } from '@/constants/moods'
import type { PostMood } from '@/constants/moods'
import { usePostStore } from '@/store/postStore'
import { useUserStore } from '@/store/userStore'
import { playGoldenCapsuleConfetti } from '@/utils/goldenConfetti'

interface ImageSlot {
  file: File
  preview: string
}

const router = useRouter()
const store = usePostStore()
const userStore = useUserStore()

/** 设为 false 可恢复多图入口与「添加图片」按钮（upload 循环与接口仍支持多图） */
const UI_SINGLE_IMAGE_PICKER_LOCK = true
/** 设为 false 可恢复标题输入框展示 */
const UI_HIDE_PUBLISH_TITLE_FIELD = true

const title = ref('')
const content = ref('')
const followsOnly = ref(false)
const selectedMood = ref<PostMood | ''>('')
const imageSlots = ref<ImageSlot[]>([])
const submitting = ref(false)
const formExiting = ref(false)
/** 森林匿名：勾选后表单泛绿色荧光，展示预览昵称 */
const publishAnonymous = ref(false)
const forestPreviewName = ref('')
const forestPreviewLoading = ref(false)
/** 时间胶囊 */
const isCapsule = ref(false)
const unlockAtIso = ref<string | null>(null)
const capsuleSheetOpen = ref(false)
/** 自定义开启日 YYYY-MM-DD，与后端 openTime 对齐；快捷预设仅填 unlockAt */
const capsuleOpenTimeYmd = ref<string | null>(null)
const capsuleCalendarOpen = ref(false)
/** 胶囊是否进入时光长河供他人打捞（默认参与） */
const capsuleIsPublic = ref(true)

/** Vant Calendar：可选范围 */
const calendarMinDate = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})()
const calendarMaxDate = (() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 15)
  return d
})()

watch(isCapsule, (on) => {
  if (!on) {
    unlockAtIso.value = null
    capsuleSheetOpen.value = false
    capsuleIsPublic.value = true
    capsuleOpenTimeYmd.value = null
    capsuleCalendarOpen.value = false
  }
})

watch(publishAnonymous, async (on) => {
  if (!on || !userStore.isLoggedIn) {
    forestPreviewName.value = ''
    return
  }
  forestPreviewLoading.value = true
  try {
    const res = await request.get<{
      success?: boolean
      anonymousName?: string
    }>('/forest/anonymous-preview')
    forestPreviewName.value =
      res.data?.anonymousName?.trim() || '森林访客'
  } catch {
    forestPreviewName.value = '森林访客'
  } finally {
    forestPreviewLoading.value = false
  }
})

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
  // 单图锁开启时：每次只取 1 张，与「隐藏添加按钮」策略一致，多图循环仍保留
  const take = UI_SINGLE_IMAGE_PICKER_LOCK ? Math.min(1, left) : left
  Array.from(files)
    .slice(0, take)
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

/** 单图模式下点击预览图替换为新文件（不删后端多图上传能力） */
const replaceImageAt = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    input.value = ''
    return
  }
  const slot = imageSlots.value[index]
  if (slot) {
    URL.revokeObjectURL(slot.preview)
  }
  imageSlots.value.splice(index, 1, {
    file,
    preview: URL.createObjectURL(file),
  })
  input.value = ''
}

/** 标题隐藏时仍向后端传 title：优先手输，否则用正文前 40 字占位 */
const resolvedPublishTitle = (): string => {
  const t = title.value.trim()
  if (t) {
    return t
  }
  const c = content.value.trim()
  return c ? c.slice(0, 40) : ''
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
  publishAnonymous.value = false
  forestPreviewName.value = ''
  isCapsule.value = false
  unlockAtIso.value = null
  capsuleSheetOpen.value = false
  capsuleOpenTimeYmd.value = null
  capsuleCalendarOpen.value = false
  capsuleIsPublic.value = true
  imageSlots.value.forEach((slot) => URL.revokeObjectURL(slot.preview))
  imageSlots.value = []
}

/** 解锁时间：本地日末转 ISO，便于后端校验「晚于当前」 */
function endOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function setUnlockAfterMonths(n: number) {
  capsuleOpenTimeYmd.value = null
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  unlockAtIso.value = endOfLocalDay(d).toISOString()
}

function setUnlockNextYearSameDate() {
  capsuleOpenTimeYmd.value = null
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  unlockAtIso.value = endOfLocalDay(d).toISOString()
}

/** 本地选中日 → 当日 UTC 0 点 ISO + YYYY-MM-DD 供 openTime */
function localYmdFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localDateToUtcMidnightIso(d: Date): string {
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
  ).toISOString()
}

function onCapsuleCalendarConfirm(val: Date | Date[]) {
  const d = Array.isArray(val) ? val[0] : val
  if (!d) {
    return
  }
  capsuleOpenTimeYmd.value = localYmdFromDate(d)
  unlockAtIso.value = localDateToUtcMidnightIso(d)
  capsuleCalendarOpen.value = false
  capsuleSheetOpen.value = false
}

const unlockAtLabel = () => {
  if (!unlockAtIso.value) {
    return '尚未选择'
  }
  try {
    return new Date(unlockAtIso.value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return unlockAtIso.value
  }
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
  if (!content.value.trim()) {
    showToast('请填写正文')
    return
  }
  if (!UI_HIDE_PUBLISH_TITLE_FIELD && !title.value.trim()) {
    showToast('请填写标题和正文')
    return
  }
  if (!selectedMood.value) {
    showToast('请选择此刻的心情')
    return
  }
  if (isCapsule.value) {
    if (!unlockAtIso.value?.trim()) {
      showToast('请为时间胶囊选择开启时间')
      return
    }
    if (Date.parse(unlockAtIso.value) <= Date.now()) {
      showToast('解锁时间须晚于现在，请重新选择')
      return
    }
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

    const buriedCapsule = isCapsule.value
    await store.publishPost({
      title: resolvedPublishTitle(),
      content: content.value.trim(),
      images: urls,
      mood: selectedMood.value,
      followsOnly: followsOnly.value,
      isAnonymous: publishAnonymous.value,
      isCapsule: isCapsule.value,
      openTime: isCapsule.value ? capsuleOpenTimeYmd.value : null,
      unlockAt:
        isCapsule.value && !capsuleOpenTimeYmd.value
          ? unlockAtIso.value
          : null,
      isPublic: isCapsule.value ? capsuleIsPublic.value : undefined,
    })

    if (loader) {
      closeToast()
    }
    if (buriedCapsule) {
      void playGoldenCapsuleConfetti()
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
      class="space-y-4 rounded-[28px] border border-card bg-surface p-4 shadow-warm backdrop-blur-sm transition-[box-shadow,border-color] duration-500"
      :class="[
        formExiting ? 'publish-form-exit' : '',
        publishAnonymous ? 'forest-veil-glow' : '',
      ]"
    >
      <div>
        <p class="mb-2 text-[13px] font-medium text-warmInk/70">此刻心情</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="m in MOOD_OPTIONS"
            :key="m"
            type="button"
            class="rounded-full px-3 py-2 text-[12px] font-medium transition-all duration-300 ease-out active:scale-[0.97]"
            :class="[
              MOOD_BADGE_CLASS[m],
              selectedMood === m
                ? 'scale-105 z-[1] shadow-[0_0_16px_rgba(255,140,105,0.42)] ring-2 ring-brand/45 ring-offset-2 ring-offset-warmCream'
                : 'opacity-80 hover:opacity-100',
            ]"
            @click="pickMood(m)"
          >
            {{ m }}
          </button>
        </div>
      </div>

      <label class="flex cursor-pointer items-center justify-between rounded-2xl bg-amber-50/90 px-3 py-3 ring-1 ring-amber-200/50">
        <span class="text-[14px] font-medium text-amber-950/80">存入时间胶囊</span>
        <input
          v-model="isCapsule"
          type="checkbox"
          class="h-4 w-4 accent-amber-600"
          :disabled="submitting"
        />
      </label>
      <Transition name="forest-hint">
        <div
          v-if="isCapsule"
          class="space-y-2 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-3 py-3 text-[13px] text-amber-950/85"
        >
          <p class="leading-relaxed">
            封存期间，连你自己也看不到正文与配图；到达约定日期后，须在详情页手动拆封才可见。
          </p>
          <p class="text-[12px] text-amber-900/55">
            预计开启：{{ unlockAtLabel() }}
          </p>
          <button
            type="button"
            class="w-full rounded-full bg-amber-600/90 py-2.5 text-[13px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            :disabled="submitting"
            @click="capsuleSheetOpen = true"
          >
            选择开启时间
          </button>
          <label
            class="flex cursor-pointer items-center justify-between rounded-xl bg-white/60 px-2.5 py-2 ring-1 ring-amber-200/40"
          >
            <span class="pr-2 text-[12px] leading-snug text-amber-900/75">
              解锁后进入「时光长河」，供陌生人打捞这份温暖
            </span>
            <input
              v-model="capsuleIsPublic"
              type="checkbox"
              class="h-4 w-4 shrink-0 accent-amber-600"
              :disabled="submitting"
            />
          </label>
        </div>
      </Transition>

      <van-action-sheet
        :show="capsuleSheetOpen"
        title="胶囊何时开启？"
        teleport="body"
        @update:show="capsuleSheetOpen = $event"
      >
        <div class="space-y-2 px-4 pb-6 pt-2">
          <button
            type="button"
            class="w-full rounded-2xl bg-apricot/70 py-3 text-[14px] font-medium text-warmInk active:scale-[0.99]"
            @click="
              setUnlockAfterMonths(1);
              capsuleSheetOpen = false
            "
          >
            1 个月后
          </button>
          <button
            type="button"
            class="w-full rounded-2xl bg-apricot/70 py-3 text-[14px] font-medium text-warmInk active:scale-[0.99]"
            @click="
              setUnlockAfterMonths(12);
              capsuleSheetOpen = false
            "
          >
            1 年后
          </button>
          <button
            type="button"
            class="w-full rounded-2xl bg-apricot/70 py-3 text-[14px] font-medium text-warmInk active:scale-[0.99]"
            @click="
              setUnlockNextYearSameDate();
              capsuleSheetOpen = false
            "
          >
            明年今日
          </button>
          <button
            type="button"
            class="w-full rounded-2xl border border-amber-300/70 bg-white py-3 text-[14px] font-semibold text-amber-950/90 active:scale-[0.99]"
            @click="capsuleCalendarOpen = true"
          >
            自定义日期
          </button>
        </div>
      </van-action-sheet>

      <van-calendar
        v-model:show="capsuleCalendarOpen"
        :min-date="calendarMinDate"
        :max-date="calendarMaxDate"
        teleport="body"
        @confirm="onCapsuleCalendarConfirm"
      />

      <label class="flex cursor-pointer items-center justify-between rounded-2xl bg-apricot/50 px-3 py-3">
        <span class="text-[14px] font-medium text-warmInk/80">森林隐身发布</span>
        <input
          v-model="publishAnonymous"
          type="checkbox"
          class="h-4 w-4 accent-emerald-600"
          :disabled="submitting"
        />
      </label>

      <Transition name="forest-hint">
        <div
          v-if="publishAnonymous"
          class="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5 text-[13px] leading-relaxed text-emerald-900/85"
        >
          <template v-if="forestPreviewLoading">正在为你披上隐身衣…</template>
          <template v-else>
            已为你披上隐身衣，现在的身份是：「{{ forestPreviewName }}」
            <span class="block text-[11px] text-emerald-800/60 mt-1">正式发布时将重新随机一次森林名与图标</span>
          </template>
        </div>
      </Transition>

      <div :class="UI_HIDE_PUBLISH_TITLE_FIELD ? 'hidden' : ''">
        <input
          v-model="title"
          class="w-full rounded-2xl bg-apricot/80 px-3 py-3 text-[15px] text-warmInk outline-none transition-shadow duration-200 placeholder:text-warmInk/35 focus:bg-white focus:shadow-[0_0_0_3px_rgba(255,140,105,0.12)]"
          :class="publishAnonymous ? 'forest-input-glow' : ''"
          maxlength="40"
          placeholder="给情绪起个短短的标题…"
        />
      </div>

      <textarea
        v-model="content"
        class="min-h-32 w-full rounded-2xl bg-apricot/80 px-3 py-3 text-[15px] leading-relaxed text-warmInk/85 outline-none transition-shadow duration-200 placeholder:text-warmInk/35 focus:bg-white focus:shadow-[0_0_0_3px_rgba(255,140,105,0.12)]"
        :class="publishAnonymous ? 'forest-input-glow' : ''"
        maxlength="300"
        placeholder="慢慢写，树洞会安静听完…"
      ></textarea>

      <label
        v-if="!UI_SINGLE_IMAGE_PICKER_LOCK || imageSlots.length < 1"
        class="inline-flex w-full cursor-pointer justify-center rounded-full bg-surface-muted px-3 py-2.5 text-[14px] text-warmInk/65 transition-all duration-200 active:scale-[0.97]"
        :class="submitting ? 'pointer-events-none opacity-60' : ''"
      >
        {{
          UI_SINGLE_IMAGE_PICKER_LOCK
            ? '附上图片（当前暂限 1 张）'
            : '附上图片（最多 9 张）'
        }}
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
        class="gap-2 rounded-2xl bg-apricot/50 p-2"
        :class="
          UI_SINGLE_IMAGE_PICKER_LOCK && imageSlots.length === 1
            ? 'flex flex-col'
            : 'grid grid-cols-3'
        "
      >
        <div
          v-for="(slot, idx) in imageSlots"
          :key="slot.preview"
          class="relative"
        >
          <template
            v-if="UI_SINGLE_IMAGE_PICKER_LOCK && imageSlots.length === 1"
          >
            <label
              class="block cursor-pointer rounded-xl"
              :class="submitting ? 'pointer-events-none opacity-60' : ''"
            >
              <img
                :src="slot.preview"
                alt="预览，点击可替换图片"
                class="max-h-[220px] w-full rounded-xl object-cover"
              />
              <input
                type="file"
                class="hidden"
                accept="image/*"
                :disabled="submitting"
                @change="replaceImageAt(idx, $event)"
              />
            </label>
            <button
              type="button"
              class="absolute right-1 top-1 rounded-full bg-warmInk/55 px-2 py-0.5 text-[11px] text-white transition-all duration-200 active:scale-[0.97]"
              :disabled="submitting"
              @click.prevent.stop="removeImage(idx)"
            >
              删除
            </button>
          </template>
          <template v-else>
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
          </template>
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
        class="flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand/85 py-3.5 text-[15px] font-semibold text-white shadow-warm transition-all duration-200 active:scale-[0.97] disabled:opacity-60"
        :disabled="submitting"
        @click="submitPost"
      >
        {{ submitting ? '发布中…' : '放进树洞' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
/* 森林屏障：淡绿荧光描边 */
.forest-veil-glow {
  border-color: rgba(134, 239, 172, 0.55);
  box-shadow:
    0 0 0 1px rgba(74, 222, 128, 0.2),
    0 0 28px rgba(34, 197, 94, 0.12);
}

.forest-input-glow:focus {
  box-shadow:
    0 0 0 3px rgba(74, 222, 128, 0.22),
    0 0 18px rgba(34, 197, 94, 0.1);
}

.forest-hint-enter-active,
.forest-hint-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.forest-hint-enter-from,
.forest-hint-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

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
