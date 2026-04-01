import request from '@/api/request'

/**
 * 将本地选中的图片上传到后端，经 Supabase Storage 后返回 https URL。
 * 需登录（Axios 已带 Bearer）。
 */
export async function uploadPostImages(files: File[]): Promise<string[]> {
  if (!files.length) {
    return []
  }
  const form = new FormData()
  for (const f of files) {
    form.append('files', f)
  }
  const res = await request.post<{ urls: string[] }>(
    '/uploads/post-images',
    form,
    { timeout: 120_000 },
  )
  return res.data?.urls ?? []
}
