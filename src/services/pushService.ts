/**
 * 木心 Web Push：OneSignal v16 解耦封装（配置走环境变量，业务通过 backup 落库）
 */
import request from '@/api/request'

export type PushServiceInitOptions = {
  /** OneSignal 应用 ID（VITE_ONESIGNAL_APP_ID） */
  appId: string
  /** 获取当前业务用户 id；未登录返回 null（与 Pinia userInfo.id 一致，多为 string） */
  getUserId: () => string | number | null
}

let initOptions: PushServiceInitOptions | null = null
let subscriptionListenerBound = false

/** 与 window 上 OneSignal 延迟队列类型对齐（避免引入官方 typings 体积） */
type OneSignalRuntime = {
  init: (opts: Record<string, unknown>) => Promise<void>
  login: (externalId: string) => Promise<void>
  User: {
    onesignalId?: string | null
    externalId?: string | null
    PushSubscription: {
      id?: string | null
      token?: string | null
      optedIn?: boolean
      addEventListener: (ev: 'change', fn: (e: unknown) => void) => void
    }
  }
  Notifications: { isPushSupported: () => Promise<boolean> }
  Slidedown: { promptPush: () => Promise<void> }
}

function pushOneSignalDeferred(
  fn: (os: OneSignalRuntime) => void | Promise<void>,
): void {
  const g = window as unknown as {
    OneSignalDeferred?: Array<(os: OneSignalRuntime) => void | Promise<void>>
  }
  g.OneSignalDeferred = g.OneSignalDeferred || []
  g.OneSignalDeferred.push(fn)
}

/**
 * 从 SDK 读取当前推送订阅快照（v16 无统一 getSubscription()，由字段拼装 + 原始 JSON）
 */
function collectSubscriptionSnapshot(OneSignal: OneSignalRuntime) {
  const ps = OneSignal.User?.PushSubscription as
    | OneSignalRuntime['User']['PushSubscription']
    | Record<string, unknown>
    | undefined
  const id =
    (typeof (ps as { id?: unknown })?.id === 'string'
      ? (ps as { id: string }).id
      : null) ??
    (typeof (ps as { subscriptionId?: unknown })?.subscriptionId === 'string'
      ? (ps as { subscriptionId: string }).subscriptionId
      : null)
  const token =
    (typeof (ps as { token?: unknown })?.token === 'string'
      ? (ps as { token: string }).token
      : null) ??
    (typeof (ps as { endpoint?: unknown })?.endpoint === 'string'
      ? (ps as { endpoint: string }).endpoint
      : null)
  const osPlayerId = OneSignal.User?.onesignalId ?? null
  const raw = {
    pushSubscription: {
      id,
      token,
      optedIn: ps?.optedIn ?? null,
    },
    onesignalId: OneSignal.User?.onesignalId ?? null,
    externalId: OneSignal.User?.externalId ?? null,
  }
  return { subscriptionId: id, pushToken: token, osPlayerId, raw }
}

/** 将订阅备份到自建后端（需登录态，由 axios 带 JWT）；订阅变更时也会自动调用 */
export async function backupSubscription(): Promise<void> {
  const uid = initOptions?.getUserId?.() ?? null
  if (uid == null) {
    return
  }
  const w = window as unknown as { OneSignal?: OneSignalRuntime }
  const OneSignal = w.OneSignal
  if (!OneSignal) {
    return
  }
  const snap = collectSubscriptionSnapshot(OneSignal)
  // 仅 token/id 会漏掉「已 login 且已有 OneSignal 用户 id、但 PushSubscription 字段尚未异步就绪」的阶段
  if (!snap.pushToken && !snap.subscriptionId && !snap.osPlayerId) {
    return
  }
  try {
    await request.post('/notification/save-subscription', {
      subscriptionId: snap.subscriptionId,
      pushToken: snap.pushToken,
      osPlayerId: snap.osPlayerId,
      raw: snap.raw,
    })
  } catch (e) {
    console.warn('[PushService] backupSubscription failed', e)
  }
}

/** 订阅在 promptPush / login 后常延迟几百毫秒才写入 SDK，短延迟重试可提高落库成功率 */
function scheduleSubscriptionBackupRetries(): void {
  const delaysMs = [500, 2000, 5000]
  for (const ms of delaysMs) {
    window.setTimeout(() => void backupSubscription(), ms)
  }
}

function bindSubscriptionChangeOnce(OneSignal: OneSignalRuntime) {
  if (subscriptionListenerBound) {
    return
  }
  subscriptionListenerBound = true
  try {
    OneSignal.User.PushSubscription.addEventListener('change', () => {
      void backupSubscription()
    })
  } catch (e) {
    console.warn('[PushService] PushSubscription.addEventListener failed', e)
  }
}

/**
 * OneSignal v16：Deferred 队列里多个任务可能并发/乱序执行，`login` 若早于 `init` 完成会触发
 * LoginManager 内部 undefined（如 reading 'Qe'）。所有入口必须先 await 本 Promise。
 */
let initOncePromise: Promise<boolean> | null = null

function sdkErrorMessage(e: unknown): string {
  return e instanceof Error
    ? e.message
    : typeof e === 'string'
      ? e
      : ''
}

function isSdkAlreadyInitializedError(e: unknown): boolean {
  return /already initialized/i.test(sdkErrorMessage(e))
}

/** OneSignal 控制台 Web 站点只允许了生产域时，在 localhost 会抛类似 “Can only be used on: https://…” */
function isDomainRestrictedError(e: unknown): boolean {
  return /can only be used on:/i.test(sdkErrorMessage(e))
}

function afterInitSideEffects(OneSignal: OneSignalRuntime): void {
  bindSubscriptionChangeOnce(OneSignal)
  void backupSubscription()
  scheduleSubscriptionBackupRetries()
}

/**
 * `login` / Slidedown 等对 SDK 有写操作；多路 Deferred 同时跑时并发 `login` 会在 LoginManager 里炸（reading 'Qe'）。
 * 通过尾部 Promise 链强制串行执行。
 */
let sdkWriteChain: Promise<void> = Promise.resolve()

function enqueueSdkWrite(work: () => Promise<void>): Promise<void> {
  const next = sdkWriteChain.then(() => work())
  sdkWriteChain = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

async function ensureOneSignalInitialized(
  OneSignal: OneSignalRuntime,
): Promise<boolean> {
  if (initOncePromise) {
    return initOncePromise
  }
  const appId = initOptions?.appId?.trim()
  if (!appId) {
    return false
  }

  initOncePromise = (async () => {
    try {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        // 显式指定集成类型为典型站点，有时能解决配置未找到的问题
        integration: {
          kind: 'typical'
        },
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
        notifyButton: { enable: false },
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: 'push',
                autoPrompt: false,
                text: {
                  actionMessage: '开启后可在树洞外收到温柔提醒。',
                  acceptButton: '允许',
                  cancelButton: '稍后再说',
                },
              },
            ],
          },
        },
      })
      afterInitSideEffects(OneSignal)
      return true
    } catch (e) {
      // 多路 Deferred 几乎同时 init、或 Vite HMR 重置模块但 window 上 SDK 仍在，会抛此错；视为已就绪
      if (isSdkAlreadyInitializedError(e)) {
        afterInitSideEffects(OneSignal)
        return true
      }
      if (isDomainRestrictedError(e)) {
        console.warn(
          '[PushService] 当前域名不在 OneSignal 该 App 的允许列表（见下方 Error 文案）。仅改 Site URL 往往不够：请在控制台 Web 配置中查找「Additional allowed origins / 允许的来源」等项并加入 http://localhost:5173 与 http://127.0.0.1:5173；或新建开发专用 App。改完后请「硬刷新」并到开发者工具 → Application → Service Workers 勾选 Update on reload / 注销本域 SW，避免旧配置缓存。',
          e,
        )
        // 勿置 null：否则多路 Deferred 会反复 init 刷屏，且半初始化态下仍可能走到 login 报 Qe
        initOncePromise = Promise.resolve(false)
        return false
      }
      console.warn(
        '[PushService] OneSignal init 失败。若在控制台看到 “App not configured for web push”，请到 OneSignal 控制台为该 App 启用「Web / Web Push」并填写站点 URL（本地可填 http://localhost:5173）。',
        e,
      )
      initOncePromise = null
      return false
    }
  })()

  return initOncePromise
}

/** 初始化 OneSignal：禁用默认铃铛、关闭自动 Slidedown、注册订阅变更备份 */
export function init(options: PushServiceInitOptions): void {
  initOptions = options
  const appId = options.appId?.trim()
  if (!appId) {
    console.warn('[PushService] init skipped: empty VITE_ONESIGNAL_APP_ID')
    return
  }

  pushOneSignalDeferred(async (OneSignal: OneSignalRuntime) => {
    await ensureOneSignalInitialized(OneSignal)
  })
}

/** 请求推送权限（欢迎页「开启树洞」等）：先 login 业务用户（若已登录），再 Slidedown */
export async function requestPermission(): Promise<void> {
  const appId = initOptions?.appId?.trim()
  if (!appId) {
    return
  }
  pushOneSignalDeferred(async (OneSignal: OneSignalRuntime) => {
    try {
      const ready = await ensureOneSignalInitialized(OneSignal)
      if (!ready) {
        return
      }
      // init resolve 后 SDK 内部仍可能差一拍再挂好 LoginManager；让出一次 macrotask
      await new Promise<void>((r) => setTimeout(r, 0))
      const supported = await OneSignal.Notifications.isPushSupported()
      if (!supported) {
        return
      }
      const uid = initOptions?.getUserId?.() ?? null
      if (uid != null) {
        await enqueueSdkWrite(() => OneSignal.login(String(uid)))
      }
      await enqueueSdkWrite(() => OneSignal.Slidedown.promptPush())
      void backupSubscription()
      scheduleSubscriptionBackupRetries()
    } catch (e) {
      console.warn('[PushService] requestPermission 失败', e)
    }
  })
}

/** 登录态恢复后同步 OneSignal external_id（与订阅关联） */
export function syncUserLogin(userId: string | number): void {
  const appId = initOptions?.appId?.trim()
  if (!appId) {
    return
  }
  pushOneSignalDeferred(async (OneSignal: OneSignalRuntime) => {
    try {
      const ready = await ensureOneSignalInitialized(OneSignal)
      if (!ready) {
        return
      }
      await new Promise<void>((r) => setTimeout(r, 0))
      await enqueueSdkWrite(() => OneSignal.login(String(userId)))
      void backupSubscription()
      scheduleSubscriptionBackupRetries()
    } catch (e) {
      console.warn('[PushService] syncUserLogin / login 失败', e)
    }
  })
}

/** 任务书命名：PushService 默认导出，便于 `import PushService from '@/services/pushService'` */
export default {
  init,
  requestPermission,
  backupSubscription,
  syncUserLogin,
}
