import { defineStore } from 'pinia'
import { ref } from 'vue'
import { THEME_STORAGE_KEY, type ThemePreferencePersisted } from '@/constants/themeStorage'

/** 将主题类挂到 html，便于全局 CSS 与 Tailwind darkMode: 'class' 共用 */
function applyDom(dark: boolean) {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

/**
 * 全局外观主题（深浅色）；后续可扩展 themeId、跟随系统等，不破坏现有 API。
 */
export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)

  /** 启动时：优先读 localStorage，否则跟随 prefers-color-scheme */
  function initFromStorage() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return
    }
    const raw = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreferencePersisted | null
    if (raw === 'dark') {
      isDark.value = true
    } else if (raw === 'light') {
      isDark.value = false
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyDom(isDark.value)
  }

  function toggleDarkMode() {
    isDark.value = !isDark.value
    applyDom(isDark.value)
    const next: ThemePreferencePersisted = isDark.value ? 'dark' : 'light'
    localStorage.setItem(THEME_STORAGE_KEY, next)
  }

  return {
    isDark,
    initFromStorage,
    toggleDarkMode,
  }
})
