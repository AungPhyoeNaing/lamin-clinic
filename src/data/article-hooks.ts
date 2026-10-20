import { useCallback, useEffect, useRef, useState } from 'react'
import { useArticleRepository } from '../app/providers'
import type { Article, ArticleQuery, FeedStats } from './types'

export function useArticles(search: string, kind: ArticleQuery['kind']) {
  const repo = useArticleRepository()
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify([search, kind, revision])
  const request = useRef(0)
  const [loaded, setLoaded] = useState<{ key: string; articles: Article[]; total: number; error: string | null } | null>(null)
  const [more, setMore] = useState<{ key: string; busy: boolean; error: string | null } | null>(null)
  const [stats, setStats] = useState<FeedStats | null>(null)
  const current = loaded?.key === key ? loaded : null

  useEffect(() => {
    const id = ++request.current
    repo.list({ search, kind }).then(page => {
      if (id === request.current) setLoaded({ ...page, key, error: null })
    }).catch(() => {
      if (id === request.current) setLoaded({ key, articles: [], total: 0, error: 'load' })
    })
    return () => { request.current = id + 1 }
  }, [repo, search, kind, key])

  useEffect(() => {
    let cancelled = false
    repo.stats().then(value => { if (!cancelled) setStats(value) }).catch(() => { /* Feed remains usable without summary metrics. */ })
    return () => { cancelled = true }
  }, [repo, revision])

  const loadMore = async () => {
    if (!current || more?.busy && more.key === key) return
    const id = request.current
    setMore({ key, busy: true, error: null })
    try {
      const page = await repo.list({ search, kind, offset: current.articles.length })
      if (id === request.current) setLoaded({ key, total: page.total, articles: [...current.articles, ...page.articles.filter(article => !current.articles.some(item => item.id === article.id))], error: null })
    } catch {
      if (id === request.current) setMore({ key, busy: false, error: 'load' })
      return
    }
    if (id === request.current) setMore({ key, busy: false, error: null })
  }
  return { articles: current?.articles ?? [], total: current?.total ?? 0, loading: !current, error: current?.error,
    stats, loadMore, loadingMore: more?.key === key && more.busy, moreError: more?.key === key && more.error,
    hasMore: !!current && current.articles.length < current.total, refresh: useCallback(() => setRevision(value => value + 1), []) }
}

export function useArticle(id: string) {
  const repo = useArticleRepository()
  const [revision, setRevision] = useState(0)
  const key = `${id}:${revision}`
  const [loaded, setLoaded] = useState<{ key: string; article: Article | null; error: boolean } | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(id ? repo.get(id) : Promise.resolve(null)).then(article => { if (!cancelled) setLoaded({ key, article, error: false }) })
      .catch(() => { if (!cancelled) setLoaded({ key, article: null, error: true }) })
    return () => { cancelled = true }
  }, [repo, id, key])
  const current = loaded?.key === key ? loaded : null
  return { article: current?.article ?? null, loading: !current, error: current?.error ?? false, retry: () => setRevision(value => value + 1) }
}
