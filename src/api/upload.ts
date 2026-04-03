import axios from 'axios'
import request from '@/api/request'
import { formDataUploadAxiosConfig } from '@/api/formDataUploadConfig'
import { compressImageToWebp } from '@/utils/compressImage'

const TAG = '[uploadPostImages]'

/** 正文配图：限制最大边，减轻体积与兼容移动端 HEIC/大图 */
const POST_IMG_MAX_W = 1600
const POST_IMG_QUALITY = 0.82

/**
 * 将单张图压成 WebP；失败则回退原文件，避免阻塞发布。
 */
async function toUploadableFile(file: File): Promise<File> {
  if (!file.type?.startsWith('image/')) {
    return file
  }
  try {
    const blob = await compressImageToWebp(file, POST_IMG_MAX_W, POST_IMG_QUALITY)
    const base = file.name.replace(/\.[^.]+$/i, '') || 'image'
    return new File([blob], `${base}.webp`, { type: 'image/webp' })
  } catch (e) {
    console.warn(TAG, '压缩失败，使用原文件', file.name, e)
    return file
  }
}

/**
 * 将本地选中的图片上传到后端，经 Supabase Storage 后返回 https URL。
 * 需登录（Axios 已带 Bearer）。
 * multipart 不手动设置 Content-Type，由浏览器生成 boundary（见 formDataUploadAxiosConfig）。
 */
export async function uploadPostImages(files: File[]): Promise<string[]> {
  if (!files.length) {
    return []
  }

  const prepared = await Promise.all(files.map((f) => toUploadableFile(f)))

  const form = new FormData()
  for (const f of prepared) {
    form.append('files', f)
  }

  // vConsole 可见：仅元数据，不打印二进制
  const formDebug: Record<string, string> = {}
  for (const [k, v] of form.entries()) {
    if (v instanceof File) {
      formDebug[k] = `${v.name} | ${v.size}B | ${v.type || 'no-type'}`
    } else {
      formDebug[k] = String(v)
    }
  }
  console.log(TAG, '请求前 FormData 条目', formDebug)
  console.log(TAG, 'axios baseURL', request.defaults.baseURL, '文件数', prepared.length)

  try {
    const res = await request.post<{ urls: string[] }>(
      '/uploads/post-images',
      form,
      formDataUploadAxiosConfig({ timeout: 120_000 }),
    )
    console.log(TAG, '上传成功', { urlCount: res.data?.urls?.length ?? 0 })
    return res.data?.urls ?? []
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error(TAG, '上传失败 Axios 详情', {
        status: e.response?.status,
        statusText: e.response?.statusText,
        data: e.response?.data,
        message: e.message,
        code: e.code,
      })
    } else {
      console.error(TAG, '上传失败（非 Axios）', e)
    }
    throw e
  }
}
