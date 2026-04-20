<script setup lang="ts">
/**
 * DTree 个人主页：昵称「幻影修改」——蒙层 Teleport 到 body，与主页树隔离，避免 backdrop 误参与父级合成。
 * 保存仍走 PATCH /user/update-profile（userStore.updateProfileNickname）。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useUserStore } from '@/store/userStore'
import { useAppToast } from '@/composables/useAppToast'
import type { StayInfo } from '@/utils/getStayInfo'

const NICKNAME_MAX = 32

const props = defineProps<{
  nickname: string
  editable: boolean
  stayInfo: StayInfo | null
}>()

const emit = defineEmits<{
  (e: 'updated', value: string): void
}>()

const userStore = useUserStore()
const toast = useAppToast()

const isEditing = ref(false)
/** 编辑态草稿昵称，与展示 nickname 解耦 */
const tempNickname = ref('')
const nicknameSaving = ref(false)
const commitLock = ref(false)
const gatherAnim = ref(false)
const tooLongFeedback = ref(false)

const inputRef = ref<HTMLInputElement | null>(null)

function onDisplayClick() {
  if (!props.editable) {
    return
  }
  void startEdit()
}

/** 进入编辑：拉草稿、挂 body 蒙层后立刻 focus */
async function startEdit() {
  if (!props.editable || isEditing.value || nicknameSaving.value) {
    return
  }
  tempNickname.value = props.nickname
  isEditing.value = true
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

function endEditingView() {
  isEditing.value = false
}

function playGatherThenEmit(next: string) {
  gatherAnim.value = true
  window.setTimeout(() => {
    gatherAnim.value = false
  }, 520)
  emit('updated', next)
}

function triggerTooLongFx() {
  tooLongFeedback.value = true
  window.setTimeout(() => {
    tooLongFeedback.value = false
  }, 620)
  void nextTick(() => inputRef.value?.focus())
}

/** Enter / 遮罩点击 / input blur：统一走保存逻辑（commitLock 防重入） */
async function saveNickname() {
  if (commitLock.value || !isEditing.value || nicknameSaving.value) {
    return
  }
  const trimmed = tempNickname.value.trim()
  if (trimmed.length > NICKNAME_MAX) {
    triggerTooLongFx()
    return
  }
  if (!trimmed) {
    endEditingView()
    return
  }
  if (trimmed === props.nickname.trim()) {
    endEditingView()
    return
  }

  commitLock.value = true
  nicknameSaving.value = true
  try {
    const r = await userStore.updateProfileNickname(trimmed)
    if (r.ok) {
      toast.success(r.message)
      endEditingView()
      playGatherThenEmit(trimmed)
    } else {
      toast.fail(r.message)
      await nextTick()
      inputRef.value?.focus()
    }
  } finally {
    nicknameSaving.value = false
    commitLock.value = false
  }
}

/** 点击全屏遮罩：保存并关闭（不直接改 isEditing，避免未校验就丢草稿） */
function onBackdropClick() {
  void saveNickname()
}

watch(
  () => props.nickname,
  (next) => {
    if (!isEditing.value) {
      tempNickname.value = next
    }
  },
)

const fieldInputClass = computed(() => {
  const parts = ['phantom-field-input', 'text-xl', 'font-semibold', 'text-center']
  if (nicknameSaving.value) {
    parts.push('phantom-field-input--pulse')
  }
  return parts.join(' ')
})
</script>

<template>
  <div
    class="user-card-name flex flex-wrap items-center justify-center gap-2 max-w-full w-full"
  >
    <!-- 方案 C：仅本人展示昵称右侧呼吸光标 -->
    <h1
      v-show="!isEditing"
      class="user-info-section__nickname text-xl font-semibold select-none"
      :class="{
        'user-nickname--gather': gatherAnim,
        'user-card-nickname--tap': editable,
        'user-nickname-display--hint': editable,
      }"
      @click="onDisplayClick"
    >
      {{ nickname }}
    </h1>

    <Teleport to="body">
      <div
        v-if="isEditing"
        class="phantom-edit-wrapper"
        aria-hidden="false"
      >
        <div
          class="phantom-backdrop"
          @click="onBackdropClick"
        />
        <div
          class="phantom-input-container"
          :class="{ 'phantom-input-container--warn': tooLongFeedback }"
        >
          <input
            ref="inputRef"
            v-model="tempNickname"
            type="text"
            :class="fieldInputClass"
            :disabled="nicknameSaving"
            placeholder="给自己起个新名字..."
            autocomplete="nickname"
            spellcheck="false"
            @blur="saveNickname"
            @keydown.enter.prevent="saveNickname"
          >
          <p class="edit-hint">
            代号可以随时更迭，心情亦然。
          </p>
        </div>
      </div>
    </Teleport>

    <div
      v-if="stayInfo"
      class="stay-badge"
    >
      <span class="badge-text">
        {{ stayInfo.icon }} {{ stayInfo.label }} (已入住
        {{ stayInfo.days }} 天)
      </span>
    </div>
  </div>
</template>

<style scoped>
.user-card-name {
  pointer-events: auto;
}

.user-card-name .user-info-section__nickname {
  color: var(--text-primary);
}

.user-card-name h1 {
  border-radius: 6px;
}

/* 方案 C：拟态光标在昵称文字右侧 */
.user-nickname-display--hint {
  display: inline-flex;
  align-items: center;
  gap: 0.2em;
}

.user-nickname-display--hint::after {
  content: '';
  flex-shrink: 0;
  width: 1.5px;
  height: 1.2em;
  align-self: center;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.35);
  animation: cursor-blink 1.5s ease-in-out infinite;
}

@keyframes cursor-blink {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.2;
  }
}

:global(html:not(.dark)) .user-nickname-display--hint::after {
  background: rgba(45, 38, 34, 0.35);
}

.user-card-nickname--tap {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-card-nickname--tap:hover {
  background-color: color-mix(in srgb, var(--text-primary) 6%, transparent);
}

/* 整层挂 body：子层 z-index 在本地堆叠，整层 z 抬高以盖住 App 壳 */
.phantom-edit-wrapper {
  position: fixed;
  inset: 0;
  z-index: 10050;
  pointer-events: none;
}

.phantom-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* 屏幕居中胶囊：微光描边 + 轻边框 */
.phantom-input-container {
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 1000;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  min-width: min(92vw, 280px);
  max-width: min(92vw, 360px);
  padding: 12px 24px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.2),
    0 8px 32px rgba(0, 0, 0, 0.2);
  transition: box-shadow 0.25s ease;
}

.phantom-input-container--warn {
  animation: nickname-shake 0.42s ease;
  box-shadow:
    0 0 0 1px rgba(248, 113, 113, 0.75),
    0 8px 28px rgba(248, 113, 113, 0.2);
}

/* 胶囊内输入：透明底、白字，字号与昵称一致（text-xl font-semibold） */
.phantom-field-input {
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  color: #fff;
  line-height: 1.3;
  caret-color: #e9d5ff;
}

.phantom-field-input::placeholder {
  color: rgba(255, 255, 255, 0.45);
}

.phantom-field-input:disabled {
  opacity: 1;
}

.phantom-field-input--pulse {
  animation: phantom-field-breathe 1.1s ease-in-out infinite;
}

@keyframes phantom-field-breathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.75;
  }
}

@keyframes nickname-shake {
  0%,
  100% {
    transform: translate(-50%, -50%) translateX(0);
  }
  20% {
    transform: translate(-50%, -50%) translateX(-5px);
  }
  40% {
    transform: translate(-50%, -50%) translateX(5px);
  }
  60% {
    transform: translate(-50%, -50%) translateX(-4px);
  }
  80% {
    transform: translate(-50%, -50%) translateX(4px);
  }
}

.edit-hint {
  margin: 0;
  padding: 0 2px;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.55);
}

@keyframes user-nickname-gather {
  from {
    letter-spacing: 0.22em;
    opacity: 0.88;
  }
  to {
    letter-spacing: normal;
    opacity: 1;
  }
}

.user-nickname--gather {
  animation: user-nickname-gather 0.55s ease-out both;
}

.stay-badge {
  background: rgba(144, 238, 144, 0.25);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 0.5px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 2px 8px;
}

.badge-text {
  color: #ffffff;
  font-size: 11px;
  line-height: 1.35;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);
}
</style>
