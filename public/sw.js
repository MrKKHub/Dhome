/**
 * 木心 PWA：最简 Service Worker，仅 install / activate + 预缓存 manifest 与图标，便于安装态识别资源。
 * 后续可在此增量扩展 fetch 缓存策略，勿删现有事件监听以免破坏已安装客户端。
 */
const CACHE_NAME = 'muxin-pwa-shell-v4'
const PRECACHE_URLS = [
  '/manifest.json',
  '/logo.png',
  '/apple-touch-icon.png',
  '/logo-192.png',
  '/logo-512.png',
  '/splash/1179x2556.png',
  '/splash/1290x2796.png',
  '/splash/1170x2532.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))),
        ),
      )
      .then(() => self.clients.claim()),
  )
})
