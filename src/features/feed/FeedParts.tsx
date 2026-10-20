import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Eye, Film, ShieldCheck } from 'lucide-react'
import { useAuth, useSettings, type Lang } from '../../app/providers'
import type { Article, ArticleMedia } from '../../data/types'
import { T } from '../../lib/i18n'
import { useFeedText } from './feed-copy'

const dateFormats = {
  en: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  my: new Intl.DateTimeFormat('my-MM', { day: 'numeric', month: 'short', year: 'numeric' }),
}
const countFormats = { en: new Intl.NumberFormat('en'), my: new Intl.NumberFormat('my') }

export function FeedHeader({ back = false }: { back?: boolean }) {
  const auth = useAuth()
  const { lang, setLang } = useSettings()
  const t = useFeedText()
  return <header className="knowledge-header">
    <Link to="/" className="knowledge-brand" aria-label="La Min Clinic">
      <img src="/logo-glass.webp" alt="" width="40" height="40" />
      <T k="appName" className="font-bold text-sm" subClassName="block text-[11px] font-normal text-muted" />
    </Link>
    <div className="knowledge-header-actions">
      <select aria-label={t('language')} value={lang} onChange={event => setLang(event.target.value as Lang)}>
        <option value="my">မြန်မာ</option><option value="bi">မြန်မာ / EN</option><option value="en">English</option>
      </select>
      <Link to={auth.user ? '/admin' : '/login'} state={{ from: '/admin' }} className="knowledge-staff" aria-label={auth.user ? t('clinic') : t('staff')} title={t('staff')}><ShieldCheck size={20} aria-hidden="true" /></Link>
    </div>
    {back && <Link to="/" className="knowledge-back"><ArrowLeft size={17} aria-hidden="true" />{t('back')}</Link>}
  </header>
}

export function ArticleMeta({ article, count }: { article: Article; count?: number }) {
  const { lang } = useSettings()
  const t = useFeedText()
  return <div className="article-meta">
    <time dateTime={new Date(article.createdAt).toISOString()}>{dateFormats[lang === 'en' ? 'en' : 'my'].format(article.createdAt)}</time>
    <span><Eye size={15} aria-hidden="true" />{countFormats[lang === 'en' ? 'en' : 'my'].format(count ?? article.viewCount)} {t('views')}</span>
  </div>
}

export function PostMedia({ item, cover = false }: { item: ArticleMedia; cover?: boolean }) {
  const [failed, setFailed] = useState(false)
  const t = useFeedText()
  if (failed) return <div className="media-failed" role="status"><span>{t('mediaFailed')}</span><button type="button" onClick={() => setFailed(false)}>{t('reloadMedia')}</button></div>
  if (cover && item.kind === 'video') return <div className="video-cover"><Film size={34} aria-hidden="true" /><span>{t('video')}</span></div>
  if (item.kind === 'video') return <figure className="post-media"><video src={item.url} controls playsInline preload="none" onError={() => setFailed(true)} aria-label={item.alt || t('video')} />{item.alt && <figcaption>{item.alt}</figcaption>}</figure>
  return <figure className={cover ? 'post-cover' : 'post-media'}>
    <img src={item.url} alt={item.alt || t('photo')} width={item.width ?? 1200} height={item.height ?? 800} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    {!cover && item.alt && <figcaption>{item.alt}</figcaption>}
  </figure>
}

export function FeedError({ retry }: { retry: () => void }) {
  const t = useFeedText()
  return <div className="knowledge-state" role="alert"><p>{t('failed')}</p><button type="button" className="knowledge-secondary" onClick={retry}>{t('retry')}</button></div>
}

export function FeedSkeleton() {
  return <div className="feed-skeleton" aria-hidden="true"><div /><div /><div /></div>
}
