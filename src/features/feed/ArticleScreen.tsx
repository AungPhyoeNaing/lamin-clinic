import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Share2, Trash2 } from 'lucide-react'
import { useArticleRepository, useAuth } from '../../app/providers'
import { useArticle } from '../../data/article-hooks'
import { readerId } from '../../data/article-validation'
import { ArticleMeta, FeedError, FeedHeader, FeedSkeleton, PostMedia } from './FeedParts'
import { useFeedText } from './feed-copy'
import './feed.css'

export default function ArticleScreen() {
  const { id = '' } = useParams()
  const { article, loading, error, retry } = useArticle(id)
  const repo = useArticleRepository()
  const auth = useAuth()
  const t = useFeedText()
  const navigate = useNavigate()
  const [count, setCount] = useState<{ id: string; value: number } | null>(null)
  const [status, setStatus] = useState('')
  const [deleting, setDeleting] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (!article) return
    const previous = document.title
    document.title = `${article.title} | La Min Clinic`
    return () => { document.title = previous }
  }, [article?.title, article])
  useEffect(() => {
    if (!article) return
    let cancelled = false
    let sent = false
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      clearTimeout(timer)
      if (document.visibilityState !== 'visible' || sent) return
      timer = setTimeout(() => {
        sent = true
        try { void repo.recordView(id, readerId()).then(value => { if (!cancelled) setCount({ id, value }) }).catch(() => { /* Counting must never block reading. */ }) } catch { /* A private browser can still read. */ }
      }, 1500)
    }
    schedule()
    document.addEventListener('visibilitychange', schedule)
    return () => { cancelled = true; clearTimeout(timer); document.removeEventListener('visibilitychange', schedule) }
  }, [article?.id, article, id, repo])

  const share = async () => {
    if (!article) return
    try {
      const url = `${window.location.origin}/posts/${encodeURIComponent(article.id)}`
      if (navigator.share) await navigator.share({ title: article.title, url })
      else { await navigator.clipboard.writeText(url); setStatus(t('copied')) }
    } catch (cause) { if (!(cause instanceof Error && cause.name === 'AbortError')) setStatus(t('copyFailed')) }
  }
  const remove = async () => {
    if (deleting || !auth.user) return
    setDeleting(true)
    try { await repo.delete(id); navigate('/', { replace: true }) }
    catch (cause) { setStatus(cause instanceof Error ? cause.message : t('deleteFailed')); dialogRef.current?.close(); setDeleting(false) }
  }
  return <div className="knowledge-page">
    <FeedHeader back />
    <main className="article-reader">
      {loading && <div role="status" aria-label={t('loading')}><FeedSkeleton /></div>}
      {error && <FeedError retry={retry} />}
      {!loading && !error && !article && <div className="knowledge-state"><h1>{t('notFound')}</h1><Link to="/" className="knowledge-secondary">{t('back')}</Link></div>}
      {article && <article className="knowledge-detail">
        <div className="knowledge-author"><img src="/logo-mark.svg" width="28" height="28" alt="" /><span>{t('team')}</span></div>
        <h1>{article.title}</h1>
        <ArticleMeta article={article} count={count?.id === id ? count.value : undefined} />
        <div className="knowledge-post-actions"><button type="button" onClick={() => void share()}><Share2 size={18} aria-hidden="true" />{t('share')}</button>{auth.user && <><Link to={`/posts/${encodeURIComponent(id)}/edit`}><Pencil size={17} aria-hidden="true" />{t('edit')}</Link><button type="button" ref={deleteRef} onClick={() => dialogRef.current?.showModal()} aria-label={t('delete')}><Trash2 size={18} aria-hidden="true" /></button></>}</div>
        {status && <p role="status" className="knowledge-notice">{status}</p>}
        <div className="knowledge-media-gallery">{article.media.map(item => <PostMedia key={item.path} item={item} />)}</div>
        <div className="knowledge-body">{article.body}</div>
        <Link to="/" className="knowledge-return"><ArrowLeft size={18} aria-hidden="true" />{t('back')}</Link>
      </article>}
    </main>
    <dialog ref={dialogRef} className="knowledge-confirm" aria-label={t('delete')} onCancel={event => { if (deleting) event.preventDefault() }} onClose={() => deleteRef.current?.focus()}>
      <h2>{t('delete')}</h2><p>{t('deleteConfirm')}</p><div><button type="button" autoFocus disabled={deleting} onClick={() => dialogRef.current?.close()}>{t('cancel')}</button><button type="button" className="knowledge-danger" disabled={deleting} onClick={() => void remove()}>{deleting ? t('loading') : t('delete')}</button></div>
    </dialog>
  </div>
}
