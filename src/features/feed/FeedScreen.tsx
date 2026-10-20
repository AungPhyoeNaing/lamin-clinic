import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, BookOpen, Eye, Image, PenLine, Search, X } from 'lucide-react'
import { useAuth } from '../../app/providers'
import { useArticles } from '../../data/article-hooks'
import type { ArticleQuery } from '../../data/types'
import { T } from '../../lib/i18n'
import { ArticleMeta, FeedError, FeedHeader, FeedSkeleton, PostMedia } from './FeedParts'
import { useFeedText } from './feed-copy'
import './feed.css'

export default function FeedScreen() {
  const auth = useAuth()
  const t = useFeedText()
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const filter = params.get('type')
  const kind: ArticleQuery['kind'] = filter === 'image' || filter === 'video' ? filter : 'all'
  const [debounced, setDebounced] = useState(search)
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(search), 300); return () => clearTimeout(timer) }, [search])
  const feed = useArticles(debounced, kind)
  const setFilter = (value: ArticleQuery['kind']) => setParams(current => { const next = new URLSearchParams(current); if (value === 'all') next.delete('type'); else next.set('type', value!); return next }, { replace: true })
  return <div className="knowledge-page">
    <a href="#knowledge-content" className="skip-link">Skip to articles</a>
    <FeedHeader />
    <main id="knowledge-content" className="knowledge-content">
      <section className="knowledge-intro">
        <h1><T k="feed" subClassName="block mt-2 text-sm font-medium text-muted" /></h1>
        <p>{t('intro')}</p>
        {feed.stats && <div className="knowledge-stats"><span><BookOpen size={15} aria-hidden="true" />{feed.stats.posts.toLocaleString()} {t('articles')}</span><span><Eye size={15} aria-hidden="true" />{feed.stats.views.toLocaleString()} {t('views')}</span></div>}
        {auth.ready && auth.user && <Link className="knowledge-write" to="/posts/new"><PenLine size={18} aria-hidden="true" />{t('write')}<ArrowUpRight size={18} aria-hidden="true" /></Link>}
      </section>
      <section className="knowledge-discovery" aria-label={t('search')}>
        <div className="knowledge-search"><Search size={19} aria-hidden="true" /><input type="search" aria-label={t('search')} placeholder={t('search')} value={search} maxLength={100} onChange={event => setParams(current => { const next = new URLSearchParams(current); if (event.target.value) next.set('q', event.target.value); else next.delete('q'); return next }, { replace: true })} />{search && <button type="button" aria-label={t('clear')} onClick={() => setParams(current => { const next = new URLSearchParams(current); next.delete('q'); return next }, { replace: true })}><X size={18} /></button>}</div>
        <div className="knowledge-filters" aria-label={t('all')}>{([['all', 'all'], ['image', 'photos'], ['video', 'videos']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => setFilter(value)}>{t(label)}</button>)}</div>
      </section>
      {feed.loading && <div role="status" aria-label={t('loading')}><FeedSkeleton /><FeedSkeleton /></div>}
      {feed.error && <FeedError retry={feed.refresh} />}
      {!feed.loading && !feed.error && !feed.articles.length && <div className="knowledge-state"><img src="/logo-mark.svg" width="72" height="72" alt="" /><h2>{t(search || kind !== 'all' ? 'noResults' : 'empty')}</h2><p>{t('emptyHint')}</p>{(search || kind !== 'all') && <button type="button" className="knowledge-secondary" onClick={() => setParams({})}>{t('clear')}</button>}</div>}
      <div className="knowledge-list" aria-busy={feed.loading}>
        {feed.articles.map(article => <article key={article.id} className="knowledge-card">
          {article.media.length > 0 && <Link to={`/posts/${encodeURIComponent(article.id)}`} aria-label={`${t('read')}: ${article.title}`} className="knowledge-cover-link" tabIndex={-1}><PostMedia item={article.media[0]} cover />{article.media.length > 1 && <span className="knowledge-media-count"><Image size={14} aria-hidden="true" />{article.media.length}</span>}</Link>}
          <div className="knowledge-card-content">
            <div className="knowledge-author"><img src="/logo-mark.svg" width="24" height="24" alt="" /><span>{t('team')}</span></div>
            <h2><Link to={`/posts/${encodeURIComponent(article.id)}`}>{article.title}</Link></h2>
            <p className="knowledge-excerpt">{article.body}</p>
            <ArticleMeta article={article} />
            <Link to={`/posts/${encodeURIComponent(article.id)}`} className="knowledge-read">{t('read')}<ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </article>)}
      </div>
      {feed.moreError && <p role="alert" className="knowledge-error">{t('failed')}</p>}
      {feed.hasMore && <button type="button" className="knowledge-load-more" disabled={feed.loadingMore} onClick={() => void feed.loadMore()}>{t(feed.loadingMore ? 'loading' : 'more')}</button>}
    </main>
    <footer className="knowledge-footer"><T k="appName" subClassName="ml-2" /><span><T k="city" subClassName="hidden" /></span></footer>
  </div>
}
