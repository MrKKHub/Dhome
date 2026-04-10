/**
 * 时光勋章：按账号注册日计算入住天数与称谓（与发布页心情档位独立）。
 * 30–99 天未在需求中写明，使用「茂叶」补档，避免逻辑空洞。
 */
export type StayInfo = {
  days: number
  label: string
  icon: string
}

export function getStayInfo(
  registerDate: string | Date | null | undefined,
): StayInfo | null {
  if (registerDate == null || registerDate === '') {
    return null
  }
  const start = new Date(
    typeof registerDate === 'string' ? registerDate : registerDate,
  )
  if (Number.isNaN(start.getTime())) {
    return null
  }
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const days = Math.max(
    0,
    Math.floor((now.getTime() - start.getTime()) / 86_400_000),
  )

  if (days < 30) {
    return { days, label: '新芽', icon: '🌱' }
  }
  if (days < 100) {
    return { days, label: '茂叶', icon: '🌿' }
  }
  if (days <= 365) {
    return { days, label: '老友', icon: '🤝' }
  }
  return { days, label: '常青', icon: '🌲' }
}
