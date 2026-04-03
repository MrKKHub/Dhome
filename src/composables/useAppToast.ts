import { showFailToast, showSuccessToast, showToast } from 'vant'

/**
 * 全局轻提示：统一走 Vant，便于日后替换实现或加埋点。
 */
export function useAppToast() {
  return {
    info: (message: string) => {
      showToast(message)
    },
    success: (message: string) => {
      showSuccessToast(message)
    },
    fail: (message: string) => {
      showFailToast(message)
    },
  }
}
