<script setup lang="ts">
import { computed } from 'vue'
import type { NotificationItem } from '@/store/notificationStore'
import { formatNotificationText } from '@/store/notificationStore'
import { resolveAvatarUrl } from '@/utils/resolveAvatarUrl'

const props = defineProps<{
  msg: NotificationItem
  timeLabel: string
}>()

const avatarSrc = computed(() =>
  resolveAvatarUrl(props.msg.sender?.avatar, props.msg.sender?.nickname),
)

const emit = defineEmits<{
  rowClick: [msg: NotificationItem]
  avatarClick: [msg: NotificationItem]
}>()

const onRowClick = () => {
  emit('rowClick', props.msg)
}

const onAvatarClick = () => {
  emit('avatarClick', props.msg)
}

const onRowKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    onRowClick()
  }
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="flex cursor-pointer select-none gap-3 rounded-[22px] border border-card bg-surface p-3 shadow-warm backdrop-blur-sm transition-colors hover:bg-apricot/20 active:bg-apricot/40"
    :class="msg.isRead ? 'opacity-75' : ''"
    @click="onRowClick"
    @keydown="onRowKeydown"
  >
    <!-- 头像单独跳转个人主页，阻止冒泡避免触发整行逻辑 -->
    <div class="shrink-0" @click.stop="onAvatarClick">
      <img
        :src="avatarSrc"
        alt=""
        class="h-11 w-11 rounded-full border border-card object-cover transition-opacity active:opacity-80"
      />
    </div>
    <div class="min-w-0 flex-1">
      <p class="text-[14px] leading-relaxed text-warmInk">
        {{ formatNotificationText(msg) }}
      </p>
      <p class="mt-1 text-[11px] text-warmInk/40">
        {{ timeLabel }}
      </p>
    </div>
    <span
      v-if="!msg.isRead"
      class="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand"
      aria-hidden="true"
    />
  </div>
</template>
