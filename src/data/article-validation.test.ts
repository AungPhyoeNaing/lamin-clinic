import { describe, expect, it } from 'vitest'
import { IMAGE_LIMIT, VIDEO_LIMIT, validateArticle, validateMediaFile } from './article-validation'

describe('post validation', () => {
  it('accepts supported media and enforces separate image and video limits', () => {
    expect(() => validateMediaFile({ type: 'image/jpeg', size: IMAGE_LIMIT })).not.toThrow()
    expect(() => validateMediaFile({ type: 'video/mp4', size: VIDEO_LIMIT })).not.toThrow()
    for (const file of [{ type: 'image/jpeg', size: IMAGE_LIMIT + 1 }, { type: 'video/mp4', size: VIDEO_LIMIT + 1 }, { type: 'text/html', size: 100 }, { type: 'image/png', size: 0 }]) expect(() => validateMediaFile(file)).toThrow()
  })
  it('rejects script URLs, oversized text, and excessive media', () => {
    const media = { path: 'test', kind: 'image' as const, alt: 'Leaf', url: 'https://example.com/image.png' }
    const base = { title: 'Knowledge', body: 'Article' }
    expect(() => validateArticle({ ...base, title: 'x'.repeat(161) })).toThrow()
    expect(() => validateArticle({ ...base, body: 'x'.repeat(30001) })).toThrow()
    expect(() => validateArticle({ ...base, media: Array(5).fill(media) })).toThrow()
    expect(() => validateArticle({ ...base, media: [{ ...media, url: 'javascript:alert(1)' }] })).toThrow()
  })
})
