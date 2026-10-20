import type { Article, ArticleDraft } from './types'

export const ARTICLE_PAGE_SIZE = 12
export const MAX_ATTACHMENTS = 4
export const IMAGE_LIMIT = 8 * 1024 * 1024
export const VIDEO_LIMIT = 30 * 1024 * 1024
export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
export const MEDIA_ACCEPT = MEDIA_TYPES.join(',')

export function validateMediaFile(file: Pick<File, 'type' | 'size'>): void {
  if (!MEDIA_TYPES.includes(file.type)) throw new Error('Use JPG, PNG, WebP, MP4, or WebM. / သတ်မှတ်ထားသော ဖိုင်အမျိုးအစားကို ရွေးပါ။')
  if (!file.size || file.size > (file.type.startsWith('image/') ? IMAGE_LIMIT : VIDEO_LIMIT)) {
    throw new Error('Images: up to 8 MB. Videos: up to 30 MB. / ပုံ 8 MB၊ ဗီဒီယို 30 MB အထိသာ ရွေးပါ။')
  }
}

export function validateArticle(draft: ArticleDraft): void {
  if (!draft.title.trim() || draft.title.length > 160 || !draft.body.trim() || draft.body.length > 30000) {
    throw new Error('Add a title (up to 160 characters) and content (up to 30,000 characters).')
  }
  const media = draft.media ?? []
  if (media.length > MAX_ATTACHMENTS || media.some(item =>
    !item.path || !['image', 'video'].includes(item.kind) || typeof item.alt !== 'string' || item.alt.length > 300 ||
    (!item.url.startsWith('https://') && !item.url.startsWith('data:image/')))) {
    throw new Error('Invalid post media')
  }
}

export function normalizeArticle(row: Partial<Article>): Article {
  return { ...row, media: Array.isArray(row.media) ? row.media : [], viewCount: Number(row.viewCount) || 0 } as Article
}

export function mediaExtension(type: string): string {
  return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' } as Record<string, string>)[type]
}

let memoryReader: string | null = null
export function readerId(): string {
  if (memoryReader) return memoryReader
  try {
    const saved = localStorage.getItem('lamin.reader.v1')
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)) return (memoryReader = saved)
  } catch { /* A session identity still works when browser storage is blocked. */ }
  memoryReader = crypto.randomUUID()
  try { localStorage.setItem('lamin.reader.v1', memoryReader) } catch { /* Session only. */ }
  return memoryReader
}
