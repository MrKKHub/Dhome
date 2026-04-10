/** 是否微信内置浏览器（分享与保存能力提示） */
export function isWeChatBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  return /MicroMessenger/i.test(navigator.userAgent)
}

/** 帖子详情页完整分享链接（与路由 /detail/:id 一致） */
export function getPostShareUrl(postId: string): string {
  const id = postId?.trim() ?? ''
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : ''
  return `${origin}/detail/${encodeURIComponent(id)}`
}
