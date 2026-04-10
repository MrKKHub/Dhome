/** 时间胶囊详情页「拆封仪式」本地已读标记（与后端无关，增量体验） */
const PREFIX = 'muxin_capsule_revealed_'

export function capsuleRevealStorageKey(postId: string): string {
  return `${PREFIX}${postId}`
}

export function isCapsuleRevealedInStorage(postId: string): boolean {
  if (typeof localStorage === 'undefined' || !postId) {
    return false
  }
  return localStorage.getItem(capsuleRevealStorageKey(postId)) === '1'
}

export function setCapsuleRevealedInStorage(postId: string): void {
  if (typeof localStorage === 'undefined' || !postId) {
    return
  }
  localStorage.setItem(capsuleRevealStorageKey(postId), '1')
}
