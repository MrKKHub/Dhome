<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useAttrs } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import html2canvas from 'html2canvas'
import QRCode from 'qrcode'
import {
  HeartHandshake,
  Leaf,
  Mail,
  MessageCircle,
  Share2,
  Sparkles,
  Star,
  Timer,
} from 'lucide-vue-next'
import {
  closeToast,
  showConfirmDialog,
  showDialog,
  showFailToast,
  showLoadingToast,
  showToast,
} from 'vant'
import { CAPSULE_LOCKED_TOAST } from '@/constants/capsule'
import ForestAnonymousAvatar from '@/components/ForestAnonymousAvatar.vue'
import {
  MOOD_CARD_SURFACE_COLOR,
  MOOD_CARD_SURFACE_COLOR_DARK,
  MOOD_OPTIONS,
  MOOD_WATERCOLOR_LAYERS,
  resolveMoodBadgeClass,
  type PostMood,
} from '@/constants/moods'
import { usePostStore } from '@/store/postStore'
import { useUserStore } from '@/store/userStore'
import { useThemeStore } from '@/store/themeStore'
import { playLeafConfetti } from '@/utils/leafConfetti'
import { playHugHeartConfetti } from '@/utils/hugHeartConfetti'
import PostShareMenu from '@/components/PostShareMenu.vue'
import SharePosterCard from '@/components/SharePosterCard.vue'
import {
  normalizeSrcForPosterHtml2Canvas,
  resolvePosterRasterDataUrl,
  stripRemoteImagesInHtml2CanvasClone,
  waitPosterImagesLoaded,
} from '@/utils/posterHtml2Canvas'
import { getPostShareUrl, isWeChatBrowser } from '@/utils/shareEnv'
import { getStayInfo } from '@/utils/getStayInfo'
import type { PostItem } from '@/store/postStore'

defineOptions({ inheritAttrs: false })

/** UI 开关：恢复卡片标题展示时改为 false（post.title 仍参与数据映射） */
const UI_HIDE_CARD_TITLE = true
/** UI 开关：关闭后缩略图不再打开全屏预览 */
const UI_IMAGE_PREVIEW_ENABLED = true

const attrs = useAttrs()

const postStore = usePostStore()
const userStore = useUserStore()
const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
const router = useRouter()
const leafBtnRef = ref<HTMLButtonElement | null>(null)
const hugBtnRef = ref<HTMLButtonElement | null>(null)
/** 暂时关闭「送出一个拥抱」底栏；点击拥抱直接送出（非匿名、无附言），保留涟漪与接口 */
const HUG_MESSAGE_PANEL_ENABLED = false

/** 发送拥抱前填写匿名与暖心话（仅 HUG_MESSAGE_PANEL_ENABLED 为 true 时使用） */
const hugPanelOpen = ref(false)
const hugAnonymous = ref(false)
const hugMessage = ref('')
/** 全屏大图预览：点击缩略图打开，点遮罩或图关闭 */
const imagePreviewUrl = ref<string | null>(null)

/** 分享面板与心情海报（html2canvas） */
const shareSheetOpen = ref(false)
const posterHostVisible = ref(false)
const posterQrDataUrl = ref('')
const posterCardRef = ref<InstanceType<typeof SharePosterCard> | null>(null)
const posterGenerating = ref(false)
/** 预拉成 data URL，避免 html2canvas 跨域/克隆下头像与配图不绘制 */
const sharePosterBgDataUrl = ref<string | null>(null)
const sharePosterAvatarDataUrl = ref<string | null>(null)
/** 海报结果：Blob URL + 原生 img 全屏预览（避免 Vant ImagePreview+Swipe 单图 data URL 异常与中央竖线） */
const posterResultUrl = ref<string | null>(null)

/**
 * 海报流程里 Loading 的 forbidClick、其它 Popup 的 lockScroll 偶发未完全清理时，
 * body 会残留 van-toast--unclickable（overflow:hidden + 子元素 pointer-events）或
 * van-overflow-hidden，导致关闭预览后页面无法滚动。
 */
function releasePosterFlowBodyScrollLocks() {
  if (typeof document === 'undefined') {
    return
  }
  document.body.classList.remove('van-toast--unclickable', 'van-overflow-hidden')
}

function closePosterResultPreview() {
  const u = posterResultUrl.value
  if (u?.startsWith('blob:')) {
    URL.revokeObjectURL(u)
  }
  posterResultUrl.value = null
  releasePosterFlowBodyScrollLocks()
}

onUnmounted(() => {
  closePosterResultPreview()
})

const openImagePreview = (url: string) => {
  if (!UI_IMAGE_PREVIEW_ENABLED || !url?.trim()) {
    return
  }
  imagePreviewUrl.value = url
}

const closeImagePreview = () => {
  imagePreviewUrl.value = null
}

const props = withDefaults(
  defineProps<{
    post: PostItem
    hugDisabled?: boolean
    favoriteDisabled?: boolean
    /**
     * 胶囊馆：作者看自己未到期胶囊时也显示信封壳与倒计时（与首页「已解密」展示区分）
     */
    museumMode?: boolean
    /**
     * 本人注册时间 ISO（仅「我的发布」等场景：帖体未带 authorRegisteredAt 时兜底）
     */
    fallbackAuthorRegisteredAt?: string
  }>(),
  {
    hugDisabled: false,
    favoriteDisabled: false,
    museumMode: false,
  },
)

/** 单图略大展示；多图沿用宫格小缩略 */
/** 呼吸动画在 .post-image 包裹层；内层 .post-card-feed-img 负责按压 transform（与 float 分层避免互斥） */
const postImageWrapClass = computed(() =>
  props.post.images.length === 1
    ? 'post-image w-full min-w-0'
    : 'post-image h-24 w-full min-w-0',
)

const postImageThumbClass = computed(() =>
  props.post.images.length === 1
    ? 'post-card-feed-img w-full max-h-[220px] min-h-0 cursor-zoom-in object-cover active:opacity-90'
    : 'post-card-feed-img h-full w-full cursor-zoom-in object-cover active:opacity-90',
)

const emit = defineEmits<{
  favorite: [id: string]
  comment: [id: string]
  open: [id: string]
  /** 软删成功后通知胶囊馆等本地列表同步 */
  deleted: [id: string]
}>()

/** 仅本人且已登录：与后端 isMine / authorId 一致 */
const showOwnerMenu = computed(() => {
  if (!props.post.isMine || !userStore.isLoggedIn) {
    return false
  }
  const uid = userStore.userInfo?.id
  if (!uid) {
    return false
  }
  if (props.post.authorId != null) {
    return String(props.post.authorId) === String(uid)
  }
  return true
})

const ownerSheetOpen = ref(false)
const ownerSheetActions = [{ name: '删除', color: '#ee0a24' }]

function openOwnerSheet(e: MouseEvent) {
  e.stopPropagation()
  ownerSheetOpen.value = true
}

function onOwnerSheetSelect(item: { name: string }) {
  ownerSheetOpen.value = false
  if (item.name === '删除') {
    void runDeletePostFlow()
  }
}

async function runDeletePostFlow() {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要永远忘记这段心情吗？删除后不可恢复。',
      confirmButtonText: '删除',
      cancelButtonText: '再想想',
    })
  } catch {
    return
  }
  const r = await postStore.deletePostByAuthor(props.post.id)
  if (!r.ok) {
    if (r.message) {
      showFailToast(r.message)
    }
    return
  }
  emit('deleted', props.post.id)
}

const imageClass = computed(() => {
  if (props.post.images.length === 1) {
    return 'grid-cols-1'
  }
  if (props.post.images.length === 2 || props.post.images.length === 4) {
    return 'grid-cols-2'
  }
  return 'grid-cols-3'
})

const moodClass = computed(() => resolveMoodBadgeClass(props.post.mood))
const watercolorLayers = computed(() => MOOD_WATERCOLOR_LAYERS[props.post.mood])
const moodSurfaceColor = computed(() => {
  const key = (props.post.mood ?? '').trim() as PostMood
  if (isDark.value && MOOD_OPTIONS.includes(key)) {
    return MOOD_CARD_SURFACE_COLOR_DARK[key]
  }
  return MOOD_CARD_SURFACE_COLOR[key] ?? MOOD_CARD_SURFACE_COLOR['平静']
})

/** 时光勋章：时间戳旁轻量展示作者入住天数（匿名帖不展示） */
const authorStayLine = computed(() => {
  if (props.post.isAnonymous) {
    return null
  }
  const fromPost = props.post.authorRegisteredAt?.trim()
  const fromFallback =
    props.post.isMine && props.fallbackAuthorRegisteredAt?.trim()
      ? props.fallbackAuthorRegisteredAt.trim()
      : ''
  const iso = fromPost || fromFallback
  if (!iso || Number.isNaN(Date.parse(iso))) {
    return null
  }
  return getStayInfo(iso)
})

/** 未开启胶囊：距解锁天数（向上取整） */
const capsuleDaysLeft = computed(() => {
  if (!props.post.unlockAtIso) {
    return 0
  }
  const t = Date.parse(props.post.unlockAtIso)
  if (Number.isNaN(t) || t <= Date.now()) {
    return 0
  }
  return Math.max(0, Math.ceil((t - Date.now()) / 86400000))
})

/**
 * 封存态 UI：优先 isLocked（与 capsuleLocked 同步）；胶囊馆作者视角未到期同视为封存展示。
 */
const capsuleSealedDisplay = computed(() => {
  if (props.post.isCapsule !== true) {
    return false
  }
  if (props.post.isLocked === true || props.post.capsuleLocked === true) {
    return true
  }
  if (
    props.museumMode &&
    props.post.unlockAtIso &&
    Date.parse(props.post.unlockAtIso) > Date.now()
  ) {
    return true
  }
  return false
})

/** 封存且未到 unlockAt：展示倒计时 */
const capsuleBeforeUnlock = computed(() => {
  if (!capsuleSealedDisplay.value || !props.post.unlockAtIso) {
    return false
  }
  const t = Date.parse(props.post.unlockAtIso)
  return !Number.isNaN(t) && t > Date.now()
})

const showLeafDecor = computed(
  () => (props.post.id.length + (props.post.id.charCodeAt(0) ?? 0)) % 2 === 0,
)

const hugRipple = ref(false)
const listenRipple = ref(false)
let hugTimer: ReturnType<typeof setTimeout> | null = null
let listenTimer: ReturnType<typeof setTimeout> | null = null

const triggerHug = async () => {
  if (props.hugDisabled) {
    return
  }
  if (!userStore.isLoggedIn) {
    void postStore.toggleLike(props.post.id)
    return
  }
  if (props.post.liked) {
    hugRipple.value = true
    if (hugTimer) {
      clearTimeout(hugTimer)
    }
    hugTimer = setTimeout(() => {
      hugRipple.value = false
      hugTimer = null
    }, 900)
    await postStore.toggleLike(props.post.id)
    return
  }
  hugAnonymous.value = false
  hugMessage.value = ''
  if (HUG_MESSAGE_PANEL_ENABLED) {
    hugPanelOpen.value = true
    return
  }
  await performHugSubmit()
}

/** 确认送出拥抱：心形粒子 + 接口；匿名成功时弹窗文案 */
async function performHugSubmit() {
  if (props.hugDisabled) {
    return
  }
  hugPanelOpen.value = false
  hugRipple.value = true
  if (hugTimer) {
    clearTimeout(hugTimer)
  }
  hugTimer = setTimeout(() => {
    hugRipple.value = false
    hugTimer = null
  }, 900)
  void playHugHeartConfetti(hugBtnRef.value)
  const r = await postStore.toggleLike(props.post.id, {
    isAnonymous: hugAnonymous.value,
    content: hugMessage.value,
  })
  if (r.ok && r.liked && r.hugAnonymous) {
    void showDialog({
      title: '温暖已传达',
      message: '已发送匿名拥抱，温暖已传达',
      theme: 'round-button',
      confirmButtonText: '好的',
    })
  }
}

const confirmHug = async () => {
  await performHugSubmit()
}

/** 未解锁胶囊：他人统一提示；作者在自己的胶囊馆点击不打扰 */
const onLockedCapsuleTap = () => {
  if (props.post.isMine && props.museumMode) {
    return
  }
  showToast(CAPSULE_LOCKED_TOAST)
}

const triggerListen = () => {
  emit('comment', props.post.id)
  listenRipple.value = true
  if (listenTimer) {
    clearTimeout(listenTimer)
  }
  listenTimer = setTimeout(() => {
    listenRipple.value = false
    listenTimer = null
  }, 900)
}

const toggleFavorite = () => {
  if (props.favoriteDisabled) {
    return
  }
  emit('favorite', props.post.id)
}
const openDetail = () => emit('open', props.post.id)

/** 海报正文：封存态统一占位；已解锁用 content */
const posterBodyForShare = computed(() => {
  if (capsuleSealedDisplay.value) {
    return '致未来的自己：这一刻的心声，正安静地睡在时光里。到期拆开，再与自己重逢～'
  }
  const t = props.post.content?.trim()
  return t || '（分享了一张心情卡片）'
})

const posterDateLine = computed(
  () => `记录于 ${props.post.createdAt}`,
)

/** 转为当前站点 `/uploads/...`，避免 html2canvas 克隆里被误删或跨域污染画布 */
const posterBgImage = computed(() => {
  if (capsuleSealedDisplay.value) {
    return null
  }
  return normalizeSrcForPosterHtml2Canvas(props.post.images[0] ?? null)
})

const posterAuthorNickname = computed(() => {
  if (props.post.isAnonymous) {
    return props.post.anonymousName?.trim() || '森林友人'
  }
  return props.post.nickname?.trim() || '木心友邻'
})

const posterAuthorAvatarNormalized = computed(() => {
  if (capsuleSealedDisplay.value || props.post.isAnonymous) {
    return null
  }
  return normalizeSrcForPosterHtml2Canvas(props.post.avatar)
})

function openShareSheet(e: MouseEvent) {
  e.stopPropagation()
  shareSheetOpen.value = true
}

async function copyPostLink() {
  const url = getPostShareUrl(props.post.id)
  try {
    await navigator.clipboard.writeText(url)
    showToast('链接已复制，去发给好友吧')
    return
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      showToast('链接已复制，去发给好友吧')
    } catch {
      showToast('复制失败，请长按链接手动复制')
    }
  }
}

/** 离屏渲染 SharePosterCard → html2canvas → ImagePreview + 底部提示 */
async function generateSharePoster() {
  if (posterGenerating.value || typeof window === 'undefined') {
    return
  }
  posterGenerating.value = true
  showLoadingToast({
    message: '正在生成心情海报…',
    forbidClick: true,
    duration: 0,
    /** 全屏遮罩，盖住 z-index 低于 Toast 的海报截图层，避免闪屏；Toast 约 2000+ */
    overlay: true,
  })
  try {
    sharePosterBgDataUrl.value = null
    sharePosterAvatarDataUrl.value = null
    const link = getPostShareUrl(props.post.id)
    const cap = capsuleSealedDisplay.value
    const img0 = props.post.images[0] ?? null
    const [qr, bgData, avData] = await Promise.all([
      QRCode.toDataURL(link, {
        width: 152,
        margin: 1,
        color: { dark: '#5C4B4B', light: '#FFFFFF' },
      }),
      !cap ? resolvePosterRasterDataUrl(img0) : Promise.resolve(null),
      !cap && !props.post.isAnonymous
        ? resolvePosterRasterDataUrl(props.post.avatar)
        : Promise.resolve(null),
    ])
    posterQrDataUrl.value = qr
    sharePosterBgDataUrl.value = bgData
    sharePosterAvatarDataUrl.value = avData
    posterHostVisible.value = true
    /**
     * 强制在 DOM 完全挂载后再截图（nextTick 链 + 字体就绪 + 图 load）
     * 等价于在 nextTick(async () => { ... }) 内执行截图逻辑，避免空白画布
     */
    await nextTick()
    await nextTick()
    await new Promise<void>((r) => {
      nextTick(async () => {
        await nextTick()
        try {
          if (document.fonts?.ready) {
            await document.fonts.ready.catch(() => undefined)
          }
        } catch {
          /* ignore */
        }
        r()
      })
    })
    const root = posterCardRef.value?.getCaptureRoot()
    if (!root) {
      throw new Error('poster root missing')
    }
    await waitPosterImagesLoaded(root)
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    await new Promise<void>((r) => setTimeout(r, 120))
    /**
     * 勿用 left:-9999px：html2canvas 在内部 iframe 内按视口裁剪，易成极细竖条。
     * 宿主 z-index 低于 Loading 全屏 overlay（约 2000+），靠 overlay 盖住，避免用户看到闪动。
     */
    void root.offsetWidth
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#fdfbf7',
      logging: false,
      imageTimeout: 15000,
      onclone: (clonedDoc, clonedEl) => {
        stripRemoteImagesInHtml2CanvasClone(clonedDoc, clonedEl)
      },
    })
    if (canvas.width < 2 || canvas.height < 2) {
      throw new Error('poster canvas size invalid')
    }
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 0.95)
    })
    if (!blob) {
      throw new Error('poster blob failed')
    }
    posterHostVisible.value = false
    sharePosterBgDataUrl.value = null
    sharePosterAvatarDataUrl.value = null
    /**
     * 先关 Loading：去掉 body 上 van-toast--unclickable；再用 Blob URL + 原生 img 预览，
     * 避免 showImagePreview(dataUrl) 在部分环境下黑屏、Swiper 中央白竖线等问题。
     */
    closeToast()
    await nextTick()
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    /** 清掉旧 Blob 并释放 body 上可能残留的 Vant 锁类 */
    closePosterResultPreview()
    posterResultUrl.value = URL.createObjectURL(blob)
  } catch {
    posterHostVisible.value = false
    sharePosterBgDataUrl.value = null
    sharePosterAvatarDataUrl.value = null
    closeToast()
    closePosterResultPreview()
    showFailToast('海报生成失败，请重试')
  } finally {
    posterGenerating.value = false
  }
}

/** 非匿名且已登录、非本人：展示「种下思念」绿叶关注 */
const showForestFollow = computed(
  () =>
    userStore.isLoggedIn &&
    !props.post.isMine &&
    !props.post.isAnonymous &&
    !!props.post.authorId,
)

const onForestFollowClick = async (e: MouseEvent) => {
  e.stopPropagation()
  const aid = props.post.authorId
  if (!aid) {
    return
  }
  const was = props.post.followingAuthor ?? false
  const next = await postStore.toggleFollowOnPost(aid, props.post.id)
  if (next === true && !was) {
    void playLeafConfetti(leafBtnRef.value)
  }
}

/** 头像/昵称：匿名隔绝 + 未登录引导登录后再进主页 */
function onProfileHeaderClick(e: Event) {
  e.stopPropagation()
  if (props.post.isAnonymous) {
    showToast('Ta 选择了隐身，无法查看主页')
    return
  }
  const aid = props.post.authorId
  if (!aid) {
    return
  }
  if (!userStore.isLoggedIn) {
    router.push({
      path: '/login',
      query: { redirect: `/user/${encodeURIComponent(aid)}` },
    })
    return
  }
  router.push(`/user/${encodeURIComponent(aid)}`)
}
</script>

<template>
  <!-- 多根节点时 attrs 需手动落到 article；contents 避免破坏父级 flex 排版 -->
  <div class="contents">
  <article
    v-bind="attrs"
    class="card-shell relative mb-6 w-full overflow-hidden rounded-[28px] border border-soft"
    :class="post.isAnonymous ? 'post-card-anonymous-shell' : ''"
    @click="openDetail"
  >
    <!-- 心情主色：略透明以透出底层暖米底 -->
    <div
      class="card-mood-fill pointer-events-none absolute inset-0 transition-colors duration-700 ease-in-out"
      :style="{ backgroundColor: moodSurfaceColor }"
      aria-hidden="true"
    />
    <div
      v-for="(layer, idx) in watercolorLayers"
      :key="idx"
      class="pointer-events-none"
      :class="layer"
      aria-hidden="true"
    />

    <!-- 极淡叶片 / 云朵线稿感装饰 -->
    <svg
      v-if="showLeafDecor"
      class="pointer-events-none absolute bottom-6 right-2 h-28 w-28 text-warmInk/45"
      viewBox="0 0 120 120"
      fill="currentColor"
      aria-hidden="true"
    >
      <g class="opacity-[0.07]">
        <ellipse cx="62" cy="78" rx="28" ry="18" transform="rotate(-25 62 78)" />
        <path d="M58 78 Q45 45 70 28 Q88 38 82 65 Q75 72 58 78Z" />
      </g>
    </svg>
    <svg
      v-else
      class="pointer-events-none absolute right-4 top-24 h-24 w-32 text-warmInk/40"
      viewBox="0 0 140 80"
      fill="currentColor"
      aria-hidden="true"
    >
      <g class="opacity-[0.06]">
        <ellipse cx="45" cy="48" rx="32" ry="22" />
        <ellipse cx="78" cy="44" rx="38" ry="26" />
        <ellipse cx="108" cy="50" rx="28" ry="20" />
      </g>
    </svg>

    <div
      v-if="post.isAnonymous"
      class="post-card-anonymous-mist pointer-events-none absolute inset-0 rounded-[28px]"
      aria-hidden="true"
    />
    <div class="card-grain pointer-events-none absolute inset-0" aria-hidden="true" />

    <div class="card-inner relative z-[1] p-4">
      <div class="mb-3 flex items-start justify-between gap-2">
        <div
          class="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-0.5 pl-0.5 pr-2 transition-opacity active:opacity-85"
          :class="post.isAnonymous ? 'cursor-default' : 'cursor-pointer'"
          role="button"
          tabindex="0"
          @click="onProfileHeaderClick"
          @keydown.enter.prevent="onProfileHeaderClick"
        >
          <ForestAnonymousAvatar
            v-if="post.isAnonymous"
            :icon-key="post.anonymousAvatarKey"
            :size="40"
            class="shrink-0 border border-emerald-200/90 dark:border-emerald-800/50"
          />
          <img
            v-else
            :src="post.avatar"
            :alt="post.nickname"
            class="h-10 w-10 shrink-0 rounded-full border border-inkline object-cover"
          />
          <div class="min-w-0">
            <div class="flex min-w-0 items-center gap-1.5">
              <p class="truncate text-[15px] font-semibold text-warmInk">
                {{ post.nickname }}
              </p>
              <button
                v-if="showForestFollow"
                ref="leafBtnRef"
                type="button"
                title="种下思念"
                class="shrink-0 rounded-full p-1 transition-transform active:scale-90"
                :disabled="postStore.followTogglingAuthorId === post.authorId"
                @click="onForestFollowClick"
              >
                <Leaf
                  class="h-5 w-5 transition-colors duration-300"
                  :class="
                    post.followingAuthor
                      ? 'fill-emerald-600 text-emerald-600'
                      : 'fill-transparent text-warmInk/35'
                  "
                  :stroke-width="2"
                />
              </button>
            </div>
            <p
              class="post-card-date flex flex-wrap items-center gap-x-1 gap-y-0.5"
            >
              <span>{{ post.createdAt }}</span>
              <template v-if="authorStayLine">
                <span class="text-warmInk/40" aria-hidden="true">·</span>
                <span class="card-stay-days"
                  >{{ authorStayLine.icon }} {{ authorStayLine.days }}d</span
                >
              </template>
            </p>
          </div>
        </div>
        <div class="flex shrink-0 items-start gap-0.5">
          <button
            v-if="showOwnerMenu"
            type="button"
            class="rounded-full p-1.5 text-warmInk/45 transition-colors active:scale-95 active:bg-black/[0.04]"
            aria-label="更多操作"
            @click="openOwnerSheet"
          >
            <van-icon name="ellipsis" class="text-[18px]" />
          </button>
          <div class="flex flex-col items-end gap-1">
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-medium leading-none"
            :class="moodClass"
          >
            {{ post.mood }}
          </span>
          <span
            v-if="post.followsOnly"
            class="rounded-full bg-lilac/15 px-2 py-0.5 text-[11px] text-lilac dark:text-lilac/90"
          >
            仅关注
          </span>
          <span
            v-if="post.isCapsule"
            class="rounded-full bg-amber-100/90 px-2 py-0.5 text-[11px] text-amber-900/80"
          >
            时间胶囊
          </span>
          </div>
        </div>
      </div>

      <!-- 信封壳需要足够高度；未加壳时用 overflow-hidden 裁圆角。加壳时去掉 hidden，避免绝对定位层被裁切 -->
      <div
        class="relative mb-3 min-h-[4.5rem] rounded-2xl"
        :class="capsuleSealedDisplay ? 'min-h-[11rem]' : 'overflow-hidden'"
      >
        <div
          v-if="capsuleSealedDisplay"
          class="absolute inset-0 z-[2] flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-50/75 to-white/70 px-4 py-5 text-center shadow-inner backdrop-blur-md"
          role="button"
          tabindex="0"
          @click.stop="onLockedCapsuleTap"
          @keydown.enter.stop="onLockedCapsuleTap"
        >
          <template v-if="capsuleBeforeUnlock">
            <div
              class="flex items-center justify-center gap-3 text-amber-900/75"
              aria-hidden="true"
            >
              <Mail class="h-9 w-9 shrink-0" :stroke-width="1.5" />
              <Timer class="h-8 w-8 shrink-0" :stroke-width="1.75" />
            </div>
            <p class="text-[14px] font-semibold leading-snug text-warmInk">
              封存中
            </p>
            <p class="text-[13px] leading-normal text-warmInk/60">
              距离开启还有 {{ capsuleDaysLeft }} 天
            </p>
          </template>
          <template v-else-if="post.isMine">
            <div
              class="flex items-center justify-center gap-3 text-amber-900/75"
              aria-hidden="true"
            >
              <Mail class="h-9 w-9 shrink-0" :stroke-width="1.5" />
            </div>
            <p class="text-[14px] font-semibold leading-snug text-warmInk">
              胶囊已送达
            </p>
            <p class="text-[13px] leading-normal text-warmInk/60">
              在详情页点击「手动拆封」，完成拆封仪式
            </p>
          </template>
          <template v-else>
            <div
              class="flex items-center justify-center gap-3 text-amber-900/75"
              aria-hidden="true"
            >
              <Mail class="h-9 w-9 shrink-0" :stroke-width="1.5" />
            </div>
            <p class="text-[14px] font-semibold leading-snug text-warmInk">
              一颗未拆的胶囊
            </p>
            <p class="text-[13px] leading-normal text-warmInk/60">
              作者尚未拆封，内容仍安睡在时光里
            </p>
          </template>
        </div>
        <div v-if="!capsuleSealedDisplay" class="overflow-hidden rounded-2xl">
          <!--
            圆角 + overflow-hidden 会在左上角形成裁切带；正文贴边时首字笔画易被吃掉。
            仅给标题/正文加微量内边距，配图区仍顶满，避免影响图片栅格。
          -->
          <div class="px-1 pt-1">
            <!-- 标题字段仍由 post.title 承载，仅视觉隐藏以降噪 -->
            <h3
              v-if="!UI_HIDE_CARD_TITLE"
              class="mb-2 text-[17px] font-semibold leading-relaxed text-warmInk"
            >
              {{ post.title }}
            </h3>
            <p class="post-card-body-text text-[15px] leading-relaxed text-warmInk/80">
              {{ post.content }}
            </p>
          </div>

          <div
            v-if="post.images.length"
            class="post-card-media"
          >
            <div
              class="grid gap-2"
              :class="imageClass"
            >
              <div
                v-for="(image, idx) in post.images"
                :key="`${post.id}-${idx}`"
                :class="postImageWrapClass"
              >
                <img
                  :src="image"
                  alt="post-image"
                  :class="postImageThumbClass"
                  @click.stop="openImagePreview(image)"
                />
              </div>
            </div>
          </div>
        </div>
        <div
          v-else
          class="min-h-[11rem] rounded-2xl border border-amber-100/40 bg-amber-50/15"
          aria-hidden="true"
        />
      </div>

      <div
        class="post-card-actions flex items-center justify-between border-t border-soft"
        @click.stop
      >
        <div class="relative flex min-w-0 flex-1 justify-start">
          <button
            ref="hugBtnRef"
            type="button"
            class="ripple-host relative inline-flex min-w-0 max-w-full flex-row flex-nowrap items-center gap-1 overflow-hidden rounded-full px-1.5 py-2 text-[12px] text-warmInk/75 transition-colors duration-200 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none"
            :class="post.liked ? 'text-hugText' : ''"
            :disabled="
              hugDisabled ||
              (capsuleSealedDisplay === true && !post.isMine)
            "
            @click="triggerHug"
          >
            <span
              v-if="hugRipple"
              class="ripple-hug pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
              aria-hidden="true"
            />
            <HeartHandshake
              class="relative z-[1] h-4 w-4 shrink-0 transition-all duration-200"
              :class="post.liked ? 'animate-soft-bounce' : ''"
              :stroke-width="post.liked ? 2.25 : 2"
            />
            <span
              class="relative z-[1] shrink-0 whitespace-nowrap text-[11px]"
              :class="post.liked ? 'text-hugText' : 'text-warmInk/75'"
            >拥抱</span>
            <span
              class="relative z-[1] shrink-0 whitespace-nowrap text-[11px] tabular-nums"
              :class="post.liked ? 'text-hugSoft' : 'text-warmInk/50'"
            >{{ post.likes > 0 ? post.likes : '' }}</span>
          </button>
        </div>

        <div class="relative flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            class="ripple-host relative inline-flex max-w-full flex-row flex-nowrap items-center gap-1 overflow-hidden rounded-full px-1.5 py-2 text-[12px] text-warmInk/75 transition-colors duration-200 active:scale-[0.98]"
            @click="triggerListen"
          >
            <span
              v-if="listenRipple"
              class="ripple-listen pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
              aria-hidden="true"
            />
            <MessageCircle class="relative z-[1] h-4 w-4 shrink-0" />
            <span
              class="relative z-[1] shrink-0 whitespace-nowrap text-[11px] text-warmInk/75"
            >倾听</span>
          </button>
        </div>

        <button
          type="button"
          class="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-1 py-2 text-[12px] transition-all duration-200 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none"
          :class="post.favorited ? 'text-favorite' : 'text-warmInk/75'"
          :disabled="favoriteDisabled"
          @click="toggleFavorite"
        >
          <Star
            class="h-4 w-4"
            :class="post.favorited ? 'fill-favorite' : ''"
          />
          <span class="text-[11px]">收好</span>
        </button>

        <button
          type="button"
          class="flex min-w-0 flex-1 items-center justify-end gap-1 rounded-full px-1 py-2 text-[12px] text-warmInk/75 transition-all duration-200 active:scale-[0.98] disabled:opacity-45"
          :disabled="posterGenerating"
          @click.stop="openShareSheet"
        >
          <Share2 class="h-4 w-4" />
          <span class="text-[11px]">分享</span>
        </button>
      </div>

      <div
        v-if="post.comments > 0"
        class="mt-2 flex items-center gap-1 text-[11px] text-warmInk/50"
      >
        <Sparkles class="h-3 w-3 text-lilac/60" />
        <span>{{ post.comments }} 条温柔回声</span>
      </div>
    </div>
  </article>

  <van-action-sheet
    v-model:show="ownerSheetOpen"
    :actions="ownerSheetActions"
    cancel-text="取消"
    close-on-click-action
    @select="onOwnerSheetSelect"
  />

  <PostShareMenu
    v-model:show="shareSheetOpen"
    :description="
      isWeChatBrowser()
        ? '微信内还可通过右上角「···」分享网页'
        : undefined
    "
    @poster="generateSharePoster"
    @copy="copyPostLink"
  />

  <Teleport to="body">
    <div
      v-if="posterHostVisible"
      class="poster-html2canvas-host pointer-events-none"
      style="
        position: fixed;
        left: 0;
        top: 0;
        width: 360px;
        min-width: 360px;
        max-width: 360px;
        z-index: 1990;
        visibility: visible;
        opacity: 1;
        pointer-events: none;
      "
      aria-hidden="true"
    >
      <SharePosterCard
        ref="posterCardRef"
        :mood="post.mood"
        :body-text="posterBodyForShare"
        :date-line="posterDateLine"
        :bg-image="sharePosterBgDataUrl ?? posterBgImage"
        :author-nickname="posterAuthorNickname"
        :author-avatar-src="sharePosterAvatarDataUrl ?? posterAuthorAvatarNormalized"
        :author-is-anonymous="!!post.isAnonymous"
        :qr-data-url="posterQrDataUrl"
      />
    </div>
    <!-- 不透明白/黑层盖住 1990 的海报，避免 Toast overlay 半透明时透出半成品；html2canvas 仍截子树，不受此层影响 -->
    <div
      v-if="posterHostVisible"
      class="pointer-events-none fixed inset-0 z-[1995] bg-black"
      aria-hidden="true"
    />
  </Teleport>

  <van-popup
      v-if="HUG_MESSAGE_PANEL_ENABLED"
      :show="hugPanelOpen"
      position="bottom"
      round
      :style="{ padding: '0' }"
      teleport="body"
      @update:show="hugPanelOpen = $event"
    >
      <div class="border-t border-card bg-surface px-4 pb-6 pt-4">
        <p class="mb-3 text-[16px] font-semibold text-warmInk">送出一个拥抱</p>
        <textarea
          v-model="hugMessage"
          class="mb-3 min-h-20 w-full rounded-2xl border border-card bg-apricot/40 px-3 py-2.5 text-[14px] text-warmInk/85 outline-none placeholder:text-warmInk/35"
          maxlength="280"
          placeholder="选填：一句暖心话（最多 280 字）"
        />
        <label
          class="mb-4 flex cursor-pointer items-center justify-between rounded-xl bg-apricot/50 px-3 py-2.5"
        >
          <span class="text-[14px] text-warmInk/80">匿名拥抱</span>
          <input v-model="hugAnonymous" type="checkbox" class="h-4 w-4 accent-hugText" />
        </label>
        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-full border border-soft py-3 text-[14px] font-medium text-warmInk/70 active:scale-[0.98]"
            @click="hugPanelOpen = false"
          >
            取消
          </button>
          <button
            type="button"
            class="flex-1 rounded-full bg-gradient-to-r from-hug to-hugSoft py-3 text-[14px] font-semibold text-white shadow-warm active:scale-[0.98]"
            @click="confirmHug"
          >
            发送温暖
          </button>
        </div>
      </div>
  </van-popup>

  <Teleport to="body">
    <Transition name="img-preview-fade">
      <div
        v-if="imagePreviewUrl && UI_IMAGE_PREVIEW_ENABLED"
        class="fixed inset-0 z-[5000] flex cursor-zoom-out items-center justify-center bg-black/[0.76] p-4"
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
        @click="closeImagePreview"
      >
        <img
          :src="imagePreviewUrl"
          class="max-h-[88vh] max-w-full rounded-lg object-contain shadow-2xl"
          alt="大图预览"
          @click="closeImagePreview"
        />
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="img-preview-fade">
      <div
        v-if="posterResultUrl"
        class="fixed inset-0 z-[6000] flex flex-col items-center justify-center gap-3 bg-black/[0.82] px-4 pb-8 pt-14"
        role="dialog"
        aria-modal="true"
        aria-label="心情海报"
        @click.self="closePosterResultPreview"
      >
        <button
          type="button"
          class="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-[13px] text-white/95 backdrop-blur-sm active:scale-95"
          @click="closePosterResultPreview"
        >
          关闭
        </button>
        <p class="max-w-[min(360px,92vw)] text-center text-[13px] leading-snug text-white/88">
          长按下方图片保存到相册；也可截图分享
        </p>
        <img
          :src="posterResultUrl"
          class="max-h-[min(72dvh,560px)] w-auto max-w-[min(360px,92vw)] rounded-2xl object-contain shadow-2xl"
          alt="心情海报"
          @click.stop
        />
      </div>
    </Transition>
  </Teleport>
  </div>
</template>

<style scoped>
/* 大图预览淡入淡出，便于日后关闭开关时一并移除 */
.img-preview-fade-enter-active,
.img-preview-fade-leave-active {
  transition: opacity 0.24s ease;
}

.img-preview-fade-enter-from,
.img-preview-fade-leave-to {
  opacity: 0;
}

/* 卡片：暖米底、10s 极轻呼吸、0.4s 全量过渡；悬停/按压上浮与阴影增强 */
.card-shell {
  background-color: #faf9f6;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.045);
  animation: post-card-breathe 10s ease-in-out infinite;
  transition: all 0.4s ease;
}

.card-shell:hover {
  animation-play-state: paused;
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
}

.card-shell:active {
  animation-play-state: paused;
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
}

@keyframes post-card-breathe {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.045);
    transform: scale(1);
  }
  50% {
    opacity: 0.985;
    box-shadow: 0 9px 26px rgba(0, 0, 0, 0.052);
    transform: scale(1.002);
  }
}

.card-mood-fill {
  opacity: 0.88;
}

/* 匿名帖：雾气蒙层 + 微冷调边框，与实名卡片区分 */
.post-card-anonymous-shell {
  border-color: rgba(186, 199, 215, 0.55);
}

.post-card-anonymous-mist {
  z-index: 0;
  background: linear-gradient(
    132deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(228, 233, 242, 0.35) 42%,
    rgba(238, 232, 248, 0.3) 100%
  );
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.22);
}

/* 正文与配图、配图与操作栏之间各 16px 留白 */
.post-card-body-text {
  margin-bottom: 16px;
}

.post-card-media {
  margin-bottom: 16px;
}

.post-card-actions {
  padding-top: 16px;
}

/* 配图容器：全局呼吸浮动（7s，介于 6–8s，不依赖 :hover） */
.post-image {
  animation: post-card-img-float 7s ease-in-out infinite;
  will-change: transform;
  -webkit-tap-highlight-color: transparent;
}

/* 图片壳：圆角、细白边 + 极淡外轮廓 */
.post-card-feed-img {
  border-radius: 16px;
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  outline: 1px solid rgba(0, 0, 0, 0.02);
}

/**
 * 内层图：定向 drop-shadow + 触摸按压（:active）
 * transform 只写在内层，与外层 translateY 浮动合成，互不覆盖
 */
.post-image .post-card-feed-img {
  filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.15));
  will-change: transform;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.post-image .post-card-feed-img:active {
  transform: scale(0.98) translateY(2px);
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.08));
}

@keyframes post-card-img-float {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
  100% {
    transform: translateY(0);
  }
}

/* 日期：纤细楷体栈（见 style.css 变量与 index.html Noto Serif SC） */
.post-card-date {
  margin-top: 2px;
  font-family: var(--font-post-card-date);
  font-size: 13px;
  font-weight: 300;
  line-height: 1.5;
  color: #8c8c8c;
  letter-spacing: 0.02em;
}

.card-stay-days {
  font-size: 11px;
  color: #8c8c8c;
  font-weight: 300;
}

.card-grain {
  opacity: 0.055;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.ripple-host {
  -webkit-tap-highlight-color: transparent;
}

.ripple-hug {
  background: radial-gradient(
    circle,
    rgba(255, 182, 168, 0.42) 0%,
    rgba(196, 164, 132, 0.22) 45%,
    transparent 70%
  );
  animation: ripple-soft-hug 0.88s cubic-bezier(0.22, 0.82, 0.28, 1) forwards;
}

.ripple-listen {
  background: radial-gradient(
    circle,
    rgba(196, 164, 132, 0.38) 0%,
    rgba(160, 140, 120, 0.18) 50%,
    transparent 72%
  );
  animation: ripple-soft-listen 0.92s cubic-bezier(0.2, 0.85, 0.32, 1) forwards;
}

@keyframes ripple-soft-hug {
  0% {
    transform: translate(-50%, -50%) scale(0.15);
    opacity: 0.65;
  }
  55% {
    opacity: 0.32;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.85);
    opacity: 0;
  }
}

@keyframes ripple-soft-listen {
  0% {
    transform: translate(-50%, -50%) scale(0.12);
    opacity: 0.55;
  }
  50% {
    opacity: 0.28;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.95);
    opacity: 0;
  }
}
</style>
