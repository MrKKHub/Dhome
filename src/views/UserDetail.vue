<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { showToast } from 'vant'
import request from '@/api/request'
import PostCard from '@/components/PostCard.vue'
import { useAppToast } from '@/composables/useAppToast'
import {
  usePostStore,
  type PostItem,
  type UserProfilePagePayload,
} from '@/store/postStore'
import { useUserStore } from '@/store/userStore'
import { resolveAvatarUrl } from '@/utils/resolveAvatarUrl'
import { storeToRefs } from 'pinia'
import { playLeafConfetti } from '@/utils/leafConfetti'
import { resolveMoodBadgeClass } from '@/constants/moods'
import { getStayInfo } from '@/utils/getStayInfo'
/** 个人主页顶栏实景：林间晨光（Vite 静态资源） */
import headerTreeSceneUrl from '@/assets/tree/forest-morning.jpg'

const route = useRoute()
const router = useRouter()
const postStore = usePostStore()
const { huggingPostId, favoritingPostId } = storeToRefs(postStore)
const userStore = useUserStore()
const toast = useAppToast()

const userId = computed(() => {
  const raw = route.params.id
  return Array.isArray(raw) ? raw[0] ?? '' : String(raw ?? '')
})

const loading = ref(true)
/** 顶栏实景图加载失败时仅用暖色渐变底，避免裂图 */
const headerTreeImageFailed = ref(false)
const profile = ref<UserProfilePagePayload | null>(null)
const moodPosts = ref<PostItem[]>([])
const capsulePosts = ref<PostItem[]>([])
const activeTab = ref(0)
const followLoading = ref(false)
const followBtnRef = ref<HTMLButtonElement | null>(null)

/** 圆形头像展示：始终走 resolveAvatarUrl（含缺省占位） */
const avatarDisplayUrl = computed(() =>
  resolveAvatarUrl(profile.value?.avatar ?? null, profile.value?.nickname ?? ''),
)

function onHeaderTreeImageError() {
  headerTreeImageFailed.value = true
}

/** 背景层用 CSS background-image，与前景 .header-content 物理隔离（模糊不作用于文字/头像） */
const headerBannerBgStyle = computed(() => {
  if (headerTreeImageFailed.value) {
    return {}
  }
  return {
    backgroundImage: `url(${headerTreeSceneUrl})`,
  }
})

const isFollowed = computed(() => !!profile.value?.isFollowedByViewer)

const moodCloud = computed(
  () => profile.value?.moodLast7Days ?? [],
)

/** 时光勋章：资料页 registeredAt / registered_at（账号注册时间） */
const profileRegisteredAtIso = computed(() => {
  const p = profile.value
  if (!p) {
    return null
  }
  const a =
    typeof p.registeredAt === 'string' && p.registeredAt.trim()
      ? p.registeredAt.trim()
      : ''
  const b =
    typeof p.registered_at === 'string' && p.registered_at.trim()
      ? p.registered_at.trim()
      : ''
  const s = a || b
  if (!s || Number.isNaN(Date.parse(s))) {
    return null
  }
  return s
})

const profileStayInfo = computed(() =>
  getStayInfo(profileRegisteredAtIso.value ?? null),
)

const followingCountDisplay = computed(
  () => profile.value?.followingCount ?? 0,
)

const followerCountDisplay = computed(
  () => profile.value?.followerCount ?? 0,
)

const showFollowBtn = computed(
  () =>
    userStore.isLoggedIn &&
    !profile.value?.isViewerSelf &&
    !!userId.value,
)

async function load() {
  const id = userId.value
  if (!id) {
    loading.value = false
    return
  }
  loading.value = true
  const pack = await postStore.fetchUserProfilePage(id)
  if (!pack) {
    showToast('用户不存在或暂时无法加载')
    router.back()
    loading.value = false
    return
  }
  profile.value = pack.profile
  moodPosts.value = pack.moodPosts
  capsulePosts.value = pack.capsulePosts
  loading.value = false
}

async function toggleFollow() {
  const id = userId.value
  if (!id || !userStore.isLoggedIn || followLoading.value) {
    return
  }
  followLoading.value = true
  const was = isFollowed.value
  try {
    const res = await request.post<{
      success?: boolean
      isFollowing?: boolean
    }>(`/follow/${encodeURIComponent(id)}`)
    if (res.data?.success) {
      const now = !!res.data.isFollowing
      if (profile.value) {
        profile.value.isFollowedByViewer = now
        const fc = profile.value.followerCount ?? 0
        profile.value.followerCount =
          now && !was ? fc + 1 : !now && was ? Math.max(0, fc - 1) : fc
      }
      if (now && !was) {
        void playLeafConfetti(followBtnRef.value)
      }
      toast.success(now ? '已与 Ta 建立连接' : '已取消关注')
    }
  } catch (e) {
    let msg = '操作失败'
    if (axios.isAxiosError(e)) {
      if (e.response?.status === 401) {
        msg = '请先登录'
      } else {
        const raw = (e.response?.data as { message?: string })?.message
        if (typeof raw === 'string' && raw.trim()) {
          msg = raw.trim()
        }
      }
    }
    toast.fail(msg)
  } finally {
    followLoading.value = false
  }
}

onMounted(load)
watch(userId, () => {
  void load()
})

function onPostDeleted(id: string) {
  moodPosts.value = moodPosts.value.filter((x) => x.id !== id)
  capsulePosts.value = capsulePosts.value.filter((x) => x.id !== id)
}
</script>

<template>
  <div class="user-detail-root pb-10">
    <van-nav-bar
      title="木心主页"
      left-arrow
      fixed
      placeholder
      class="user-detail-nav"
      @click-left="router.back()"
    />

    <div v-if="loading" class="flex justify-center py-16">
      <van-loading type="spinner" color="#8B7355" />
    </div>

    <template v-else-if="profile">
      <div class="user-page">
        <!-- 晨间秘境：背景栈与 .header-content 兄弟层级，模糊仅关在背景层 -->
        <div
          class="header-banner-container"
          :class="{ 'header-banner-container--fallback': headerTreeImageFailed }"
        >
          <!-- 填补全局顶栏与圆角横幅之间的空隙：轻量云朵 + 小花装饰 -->
          <div class="header-bridge-decor" aria-hidden="true">
            <div class="header-bridge-decor__cloud header-bridge-decor__cloud--left">
              <span class="header-bridge-decor__puff" />
              <span class="header-bridge-decor__puff" />
              <span class="header-bridge-decor__puff" />
            </div>
            <div class="header-bridge-decor__cloud header-bridge-decor__cloud--right">
              <span class="header-bridge-decor__puff" />
              <span class="header-bridge-decor__puff" />
            </div>
            <div class="header-bridge-decor__flower header-bridge-decor__flower--1" />
            <div class="header-bridge-decor__flower header-bridge-decor__flower--2" />
            <div class="header-bridge-decor__flower header-bridge-decor__flower--3" />
          </div>
          <!-- 仅用于探测实景图是否加载失败（不展示） -->
          <img
            v-if="!headerTreeImageFailed"
            :src="headerTreeSceneUrl"
            class="header-tree-probe"
            alt=""
            @error="onHeaderTreeImageError"
          />
          <div class="header-bg-stack" aria-hidden="true">
            <div class="header-bg-image" :style="headerBannerBgStyle" />
            <div class="header-bg-mask" />
            <div class="header-bottom-feather" />
          </div>
          <div class="header-content">
            <div class="user-info-section">
              <img
                :src="avatarDisplayUrl"
                :alt="profile.nickname"
                class="user-info-section__avatar h-24 w-24 rounded-full object-cover"
              />
              <div class="user-info-section__name-row mt-3">
                <h1 class="user-info-section__nickname text-xl font-semibold">
                  {{ profile.nickname }}
                </h1>
                <div v-if="profileStayInfo" class="stay-badge">
                  <span class="badge-text">
                    {{ profileStayInfo.icon }} {{ profileStayInfo.label }} (已入住
                    {{ profileStayInfo.days }} 天)
                  </span>
                </div>
              </div>
              <p class="user-info-section__bio mt-2 max-w-[280px] text-[14px] leading-relaxed">
                {{ profile.bio || '在这个树洞里，抱抱自己。' }}
              </p>
              <div class="user-info-section__stats-row">
                <span>关注 <b class="tabular-nums text-[#4a3d3d]">{{ followingCountDisplay }}</b></span>
                <span>被关注 <b class="tabular-nums text-[#4a3d3d]">{{ followerCountDisplay }}</b></span>
              </div>
              <div
                v-if="moodCloud.length"
                class="mood-stats mood-stats--in-header mt-6 rounded-2xl border border-[#E8DDD4]/70 bg-white/60 px-3 py-3"
              >
                <p class="mb-2 text-center text-[11px] font-medium tracking-wider text-[#9A8A7E]">
                  近七日心情
                </p>
                <div class="flex flex-wrap justify-center gap-2">
                  <span
                    v-for="m in moodCloud"
                    :key="m.mood"
                    class="rounded-full px-2.5 py-1 text-[12px] font-medium leading-none"
                    :class="resolveMoodBadgeClass(m.mood)"
                  >
                    {{ m.mood }}
                    <span class="ml-0.5 tabular-nums opacity-80">{{ m.count }}</span>
                  </span>
                </div>
              </div>
              <button
                v-if="showFollowBtn"
                ref="followBtnRef"
                type="button"
                class="mt-4 rounded-full border border-[#C4B5A0]/50 bg-white/80 px-5 py-1.5 text-[13px] font-medium text-[#6B5A5A] shadow-sm active:scale-[0.98]"
                :disabled="followLoading"
                @click="toggleFollow"
              >
                {{ isFollowed ? '已关注' : '关注 Ta' }}
              </button>
            </div>
          </div>
        </div>

        <section class="user-detail-sheet">
            <van-tabs
              :active="activeTab"
              class="user-detail-tabs"
              color="#8B7355"
              title-active-color="#5C4B4B"
              title-inactive-color="#9A8A7E"
              line-width="28px"
              @update:active="activeTab = $event"
            >
              <van-tab title="心情">
                <div class="px-3 pt-2">
                  <p
                    v-if="!moodPosts.length"
                    class="py-12 text-center text-[14px] text-[#9A8A7E]"
                  >
                    这里还没有心情叶子
                  </p>
                  <PostCard
                    v-for="p in moodPosts"
                    :key="p.id"
                    :post="p"
                    :hug-disabled="huggingPostId === p.id"
                    :favorite-disabled="favoritingPostId === p.id"
                    @favorite="postStore.toggleFavorite"
                    @comment="(id) => router.push(`/detail/${encodeURIComponent(id)}`)"
                    @open="(id) => router.push(`/detail/${encodeURIComponent(id)}`)"
                    @deleted="onPostDeleted"
                  />
                </div>
              </van-tab>
              <van-tab title="时间胶囊">
                <div class="px-3 pt-2">
                  <p
                    v-if="!capsulePosts.length"
                    class="py-12 text-center text-[14px] text-[#9A8A7E]"
                  >
                    还没有已开启的胶囊展示给他人
                  </p>
                  <PostCard
                    v-for="p in capsulePosts"
                    :key="p.id"
                    :post="p"
                    :hug-disabled="huggingPostId === p.id"
                    :favorite-disabled="favoritingPostId === p.id"
                    @favorite="postStore.toggleFavorite"
                    @comment="(id) => router.push(`/detail/${encodeURIComponent(id)}`)"
                    @open="(id) => router.push(`/detail/${encodeURIComponent(id)}`)"
                    @deleted="onPostDeleted"
                  />
                </div>
              </van-tab>
            </van-tabs>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.user-detail-root {
  min-height: 100vh;
  background-color: #faf9f6;
  animation: user-detail-fade-in 0.55s ease-out both;
}

@keyframes user-detail-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 导航栏半透明，避免实色块盖住下方实景顶栏（仅本页） */
:deep(.user-detail-nav.van-nav-bar) {
  background: rgba(250, 249, 246, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

:deep(.user-detail-nav .van-nav-bar__title),
:deep(.user-detail-nav .van-icon) {
  color: #5c4b4b;
}

:deep(.van-nav-bar__placeholder) {
  background: transparent;
}

/** 个人主页：晨间秘境 — 背景栈与前景隔离 */
.user-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background-color: #faf9f6;
  /* 拉近与上方 DHome / 木心顶栏之间的空白 */
  margin-top: -18px;
}

/* 1. 基底调色（装饰层可伸出圆角块上方，故用 visible） */
.header-banner-container {
  position: relative;
  overflow: visible;
  background-color: #faf9f6;
  min-height: 280px;
}

.header-tree-probe {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  opacity: 0;
  pointer-events: none;
}

/* 顶栏与横幅之间：云朵 + 小花（纯 CSS，低对比不抢主内容） */
.header-bridge-decor {
  position: absolute;
  top: -36px;
  left: 0;
  right: 0;
  height: 40px;
  z-index: 4;
  pointer-events: none;
}

.header-bridge-decor__cloud {
  position: absolute;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  opacity: 0.88;
}

.header-bridge-decor__cloud--left {
  left: max(18px, env(safe-area-inset-left, 0px));
}

.header-bridge-decor__cloud--right {
  right: max(22px, env(safe-area-inset-right, 0px));
  flex-direction: row;
}

.header-bridge-decor__puff {
  display: block;
  border-radius: 50%;
  background: rgba(255, 252, 250, 0.95);
  box-shadow: 0 1px 6px rgba(180, 160, 140, 0.12);
}

.header-bridge-decor__cloud--left .header-bridge-decor__puff:nth-child(1) {
  width: 26px;
  height: 20px;
  margin-right: -14px;
}

.header-bridge-decor__cloud--left .header-bridge-decor__puff:nth-child(2) {
  width: 34px;
  height: 24px;
  margin-right: -16px;
}

.header-bridge-decor__cloud--left .header-bridge-decor__puff:nth-child(3) {
  width: 22px;
  height: 18px;
}

.header-bridge-decor__cloud--right .header-bridge-decor__puff:nth-child(1) {
  width: 30px;
  height: 22px;
  margin-right: -12px;
}

.header-bridge-decor__cloud--right .header-bridge-decor__puff:nth-child(2) {
  width: 24px;
  height: 19px;
}

.header-bridge-decor__flower {
  position: absolute;
  bottom: 2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff6f4, #e8b4b8 55%, #c99aa0);
  box-shadow:
    9px -2px 0 -1px rgba(232, 180, 184, 0.85),
    -9px -2px 0 -1px rgba(232, 200, 160, 0.75),
    2px -10px 0 -1px rgba(240, 210, 190, 0.7),
    -3px 9px 0 -1px rgba(220, 180, 175, 0.65),
    8px 7px 0 -2px rgba(245, 220, 200, 0.55);
}

.header-bridge-decor__flower--1 {
  left: 42%;
  transform: scale(0.95);
  opacity: 0.9;
}

.header-bridge-decor__flower--2 {
  left: 58%;
  bottom: 6px;
  transform: scale(0.75) rotate(18deg);
  opacity: 0.75;
}

.header-bridge-decor__flower--3 {
  left: 72%;
  transform: scale(0.65) rotate(-12deg);
  opacity: 0.7;
}

/* 2. 背景栈：小圆角矩形，避免大半径「半圆顶」观感 */
.header-bg-stack {
  position: absolute;
  top: 0;
  left: max(14px, env(safe-area-inset-left, 0px));
  right: max(14px, env(safe-area-inset-right, 0px));
  width: auto;
  height: 280px;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  isolation: isolate;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(60, 48, 40, 0.06);
}

.header-banner-container--fallback .header-bg-stack {
  background: linear-gradient(
    165deg,
    #f0e4d8 0%,
    #ebe4dc 45%,
    #faf9f6 100%
  );
}

.header-banner-container--fallback .header-bg-image {
  display: none;
}

/* 底图：进一步减弱模糊与调色，树林层次更易辨认 */
.header-bg-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center 42%;
  background-repeat: no-repeat;
  transform: scale(1.01);
  transform-origin: center center;
  filter: blur(2px) saturate(1.06) brightness(1.02);
}

/* 蒙版极轻：略柔光即可，避免盖死细节 */
.header-bg-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(250, 249, 246, 0.22) 62%,
    rgba(250, 249, 246, 0.72) 100%
  );
}

/* 底部羽化：与正文区衔接即可，少遮挡实景 */
.header-bottom-feather {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 40%;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0%,
    rgba(250, 249, 246, 0.08) 55%,
    rgba(250, 249, 246, 0.55) 88%,
    #faf9f6 100%
  );
}

.header-content {
  position: relative;
  z-index: 1;
  padding-top: 0.35rem;
  padding-bottom: 0.5rem;
  text-align: center;
}

.user-info-section {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 1rem 0.75rem;
  text-align: center;
}

.user-info-section__stats-row {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1rem;
  font-size: 13px;
  color: #5c4b4b;
}

.user-info-section__avatar {
  border: 1px solid #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

/* 昵称与时光勋章同一行流式排列，禁止绝对定位 */
.user-info-section__name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 100%;
  width: 100%;
}

.user-info-section__nickname,
.user-info-section__bio {
  color: #4a4a4a;
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

.user-detail-sheet {
  position: relative;
  z-index: 2;
  margin-top: -14px;
  border-radius: 24px 24px 0 0;
  background-color: #faf9f6;
  padding: 1rem 1rem 0.5rem;
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.04);
}

.mood-stats--in-header {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 22rem;
}

.mood-stats {
  position: relative;
  z-index: 10;
}
</style>
