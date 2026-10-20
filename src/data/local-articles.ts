import { newId } from '../lib/id'
import { ARTICLE_PAGE_SIZE, normalizeArticle, validateArticle, validateMediaFile } from './article-validation'
import type { Article, ArticleRepository } from './types'

const STORAGE_KEY = 'lamin.articles.v1'

export function createLocalArticleRepository(
  store: { getItem(key: string): string | null; setItem(key: string, value: string): void },
  now: () => number = Date.now,
): ArticleRepository {
  function read(): Article[] {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as { version: number; articles: Article[] }
      if (parsed.version !== 1 || !Array.isArray(parsed.articles) || parsed.articles.some(article =>
        !article || typeof article.id !== 'string' || typeof article.title !== 'string' ||
        typeof article.body !== 'string' || !Number.isFinite(article.createdAt))) throw new Error('Invalid articles')
      return parsed.articles.map(normalizeArticle)
    } catch {
      throw new Error('Stored articles are damaged. Preserve browser storage before attempting recovery.')
    }
  }
  function write(articles: Article[]): void {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 1, articles }))
  }

  return {
    async list({ offset = 0, search = '', kind = 'all' } = {}) {
      const articles = read().filter(article => article.title.toLowerCase().includes(search.toLowerCase()) &&
        (kind === 'all' || article.media.some(item => item.kind === kind)))
        .sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id))
      return { articles: articles.slice(offset, offset + ARTICLE_PAGE_SIZE), total: articles.length }
    },
    async get(id) { return read().find(article => article.id === id) ?? null },
    async stats() {
      const articles = read()
      return { posts: articles.length, views: articles.reduce((sum, article) => sum + article.viewCount, 0) }
    },
    async recordView(id, visitorId) {
      const articles = read()
      const article = articles.find(item => item.id === id)
      if (!article) throw new Error('Post not found')
      const key = `lamin.view.${id}.${visitorId}`
      const day = new Date(now()).toISOString().slice(0, 10)
      if (store.getItem(key) !== day) {
        article.viewCount++
        write(articles)
        store.setItem(key, day)
      }
      return article.viewCount
    },
    async uploadMedia(file) {
      validateMediaFile(file)
      // Local mode is a device-only demo; videos require cloud storage.
      if (file.type.startsWith('video/')) throw new Error('Video uploads require cloud mode. / ဗီဒီယိုအတွက် Cloud လိုအပ်သည်။')
      if (file.size > 1024 * 1024) throw new Error('Local mode supports images up to 1 MB. Use cloud mode for larger files.')
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Could not read the image'))
        reader.readAsDataURL(file)
      })
      return { path: newId(), url, kind: 'image', alt: '' }
    },
    async removeMedia() { /* Data URLs are removed with their post. */ },
    async create(draft, authorEmail) {
      validateArticle(draft)
      const timestamp = now()
      const article: Article = { id: newId(), title: draft.title.trim(), body: draft.body.trim(), authorEmail,
        media: draft.media ?? [], viewCount: 0, createdAt: timestamp, updatedAt: timestamp }
      const articles = read()
      articles.push(article)
      write(articles)
      return article
    },
    async update(id, draft, expectedUpdatedAt) {
      validateArticle(draft)
      const articles = read()
      const index = articles.findIndex(article => article.id === id)
      if (index < 0) throw new Error('Post not found')
      if (expectedUpdatedAt !== undefined && articles[index].updatedAt !== expectedUpdatedAt) throw new Error('This article changed. Reload it before editing.')
      articles[index] = { ...articles[index], title: draft.title.trim(), body: draft.body.trim(), media: draft.media ?? [], updatedAt: now() }
      write(articles)
      return articles[index]
    },
    async delete(id) { write(read().filter(article => article.id !== id)) },
  }
}
