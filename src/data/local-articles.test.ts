import { describe, expect, it } from 'vitest'
import { createLocalArticleRepository } from './local-articles'

const draft = { title: 'Clinic update', body: 'An article for readers.' }
function setup() {
  const map = new Map<string, string>()
  const store = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value) } }
  let now = Date.UTC(2026, 9, 20)
  return { repo: createLocalArticleRepository(store, () => now++), store, tomorrow: () => { now += 86400000 } }
}

describe('knowledge repository', () => {
  it('paginates and searches without duplicating records', async () => {
    const { repo } = setup()
    for (let index = 0; index < 15; index++) await repo.create({ ...draft, title: `Post ${index}` }, null)
    const first = await repo.list()
    const second = await repo.list({ offset: first.articles.length })
    expect(first.total).toBe(15)
    expect(first.articles).toHaveLength(12)
    expect(second.articles).toHaveLength(3)
    expect(new Set([...first.articles, ...second.articles].map(article => article.id)).size).toBe(15)
    expect((await repo.list({ search: 'POST 14' })).articles[0].title).toBe('Post 14')
  })
  it('counts repeat opens once per browser per UTC day and preserves counts on edit', async () => {
    const { repo, tomorrow } = setup()
    const article = await repo.create(draft, null)
    expect(await repo.recordView(article.id, 'reader-a')).toBe(1)
    expect(await repo.recordView(article.id, 'reader-a')).toBe(1)
    expect(await repo.recordView(article.id, 'reader-b')).toBe(2)
    tomorrow()
    expect(await repo.recordView(article.id, 'reader-a')).toBe(3)
    await repo.update(article.id, { ...draft, title: 'Edited title' })
    await expect(repo.update(article.id, draft, article.updatedAt)).rejects.toThrow('changed')
    expect((await repo.get(article.id))?.viewCount).toBe(3)
    expect(await repo.stats()).toEqual({ posts: 1, views: 3 })
  })
  it('filters media and preserves legacy text posts', async () => {
    const { repo, store } = setup()
    store.setItem('lamin.articles.v1', JSON.stringify({ version: 1, articles: [{ id: 'old', ...draft, authorEmail: null, createdAt: 1, updatedAt: 1 }] }))
    expect((await repo.get('old'))?.media).toEqual([])
    expect((await repo.get('old'))?.viewCount).toBe(0)
    await repo.create({ ...draft, media: [{ path: 'photo', url: 'data:image/png;base64,AA', kind: 'image', alt: 'A leaf' }] }, null)
    expect((await repo.list({ kind: 'image' })).total).toBe(1)
    expect((await repo.list({ kind: 'video' })).total).toBe(0)
  })
  it('rejects malformed or unsupported uploads and protects damaged storage', async () => {
    const { repo, store } = setup()
    await expect(repo.uploadMedia({ type: 'image/svg+xml', size: 100 } as File)).rejects.toThrow()
    await expect(repo.create({ title: '', body: 'text' }, null)).rejects.toThrow()
    store.setItem('lamin.articles.v1', 'broken')
    await expect(repo.create(draft, null)).rejects.toThrow('damaged')
    expect(store.getItem('lamin.articles.v1')).toBe('broken')
  })
})
