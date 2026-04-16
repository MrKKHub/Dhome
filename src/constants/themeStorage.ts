/** 深浅色偏好，与 userStore 的 dhome_* 命名一致，避免与其它站点 localStorage 冲突 */
export const THEME_STORAGE_KEY = 'dhome_theme'

/** 预留：后续可扩展 system / 多套主题 id */
export type ThemePreferencePersisted = 'light' | 'dark'
