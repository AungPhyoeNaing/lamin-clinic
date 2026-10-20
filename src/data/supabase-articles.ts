import { newId } from '../lib/id'
import { ARTICLE_PAGE_SIZE, mediaExtension, normalizeArticle, validateArticle, validateMediaFile } from './article-validation'
import type { ArticleMedia, ArticleRepository } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

const FIELDS = 'id,title,body,media,viewCount,createdAt,updatedAt'
const SUMMARY_FIELDS = 'id,title,excerpt,media,viewCount,createdAt,updatedAt'
const BUCKET = 'article-media'

export function createSupabaseArticleRepository(client: SupabaseClient, now: () => number = Date.now): ArticleRepository {
  const removeMedia = async (media: ArticleMedia[]) => {
    if (!media.length) return
    const { error } = await client.storage.from(BUCKET).remove(media.map(item => item.path))
    if (error) throw error
  }
  // Resolve storage paths ourselves; a stored URL cannot send readers to another host.
  const hydrate = (row: Parameters<typeof normalizeArticle>[0] & { excerpt?: string }) => {
    const article = normalizeArticle({ ...row, body: row.body ?? row.excerpt ?? '' })
    article.media = article.media.map(item => ({ ...item, url: client.storage.from(BUCKET).getPublicUrl(item.path).data.publicUrl }))
    return article
  }
  return {
    async list({ offset = 0, search = '', kind = 'all' } = {}) {
      let query = client.from('articles').select(SUMMARY_FIELDS, { count: 'exact' })
      if (search.trim()) query = query.ilike('title', `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`)
      if (kind !== 'all') query = query.contains('media', [{ kind }])
      const { data, count, error } = await query.order('createdAt', { ascending: false })
        .order('id', { ascending: true }).range(offset, offset + ARTICLE_PAGE_SIZE - 1)
      if (error) throw error
      return { articles: (data ?? []).map(hydrate), total: count ?? 0 }
    },
    async get(id) {
      const { data, error } = await client.from('articles').select(FIELDS).eq('id', id).maybeSingle()
      if (error) throw error
      return data ? hydrate(data) : null
    },
    async stats() {
      const { data, error } = await client.rpc('feed_stats')
      if (error) throw error
      return { posts: Number(data.posts), views: Number(data.views) }
    },
    async recordView(id, visitorId) {
      const { data, error } = await client.rpc('record_article_view', { article_id: id, visitor_id: visitorId })
      if (error) throw error
      return Number(data)
    },
    async uploadMedia(file) {
      validateMediaFile(file)
      const path = `${newId()}.${mediaExtension(file.type)}`
      const { error } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
      if (error) throw error
      const { data } = client.storage.from(BUCKET).getPublicUrl(path)
      return { path, url: data.publicUrl, kind: file.type.startsWith('image/') ? 'image' : 'video', alt: '' }
    },
    removeMedia,
    async create(draft, authorEmail) {
      validateArticle(draft)
      const timestamp = now()
      const article = { id: newId(), title: draft.title.trim(), body: draft.body.trim(), authorEmail,
        media: draft.media ?? [], createdAt: timestamp, updatedAt: timestamp }
      const { data, error } = await client.from('articles').insert(article).select(FIELDS).single()
      if (error) throw error
      return hydrate(data)
    },
    async update(id, draft, expectedUpdatedAt) {
      validateArticle(draft)
      let query = client.from('articles').update({ title: draft.title.trim(), body: draft.body.trim(),
        media: draft.media ?? [], updatedAt: now() }).eq('id', id)
      if (expectedUpdatedAt !== undefined) query = query.eq('updatedAt', expectedUpdatedAt)
      const { data, error } = await query.select(FIELDS).single()
      if (error?.code === 'PGRST116') throw new Error('This article changed or was removed. Reload it before editing.')
      if (error) throw error
      return hydrate(data)
    },
    async delete(id) {
      const { data, error } = await client.from('articles').delete().eq('id', id).select('media')
      if (error) throw error
      if (!data?.length) throw new Error('Post could not be deleted. Check staff access and try again.')
      try { await removeMedia(data[0].media ?? []) } catch {
        throw new Error('The post was deleted, but media cleanup failed. Ask an administrator to remove unused files from storage.')
      }
    },
  }
}
