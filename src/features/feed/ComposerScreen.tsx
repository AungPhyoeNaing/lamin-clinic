import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Upload, X } from 'lucide-react'
import { useArticleRepository, useAuth } from '../../app/providers'
import { useArticle } from '../../data/article-hooks'
import { MAX_ATTACHMENTS, MEDIA_ACCEPT, validateArticle, validateMediaFile } from '../../data/article-validation'
import type { Article, ArticleMedia } from '../../data/types'
import { ArticleMeta, FeedError, FeedHeader, FeedSkeleton } from './FeedParts'
import { useFeedText } from './feed-copy'
import { prepareMedia } from './prepare-media'
import './feed.css'

type Attachment = { key: string; url: string; kind: 'image' | 'video'; alt: string; file?: File; saved?: ArticleMedia }

function Editor({ article }: { article: Article | null }) {
  const repo = useArticleRepository()
  const auth = useAuth()
  const t = useFeedText()
  const navigate = useNavigate()
  const draftKey = `lamin.postDraft.${article?.id ?? 'new'}`
  const [text, setText] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? 'null') as { title: string; body: string; base: number } | null
      if (saved && saved.base === (article?.updatedAt ?? 0) && typeof saved.title === 'string' && typeof saved.body === 'string') return { title: saved.title, body: saved.body }
    } catch { /* Start with published content if the local draft is invalid. */ }
    return { title: article?.title ?? '', body: article?.body ?? '' }
  })
  const [attachments, setAttachments] = useState<Attachment[]>(() => (article?.media ?? []).map(item => ({ key: item.path, url: item.url, kind: item.kind, alt: item.alt, saved: item })))
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [draftFailed, setDraftFailed] = useState(false)
  const [preview, setPreview] = useState(false)
  const [previewTime] = useState(Date.now)
  const urls = useRef(new Set<string>())
  const inputRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)
  const dirty = text.title !== (article?.title ?? '') || text.body !== (article?.body ?? '') || attachments.some(item => item.file || item.saved && item.alt !== item.saved.alt) || attachments.length !== (article?.media.length ?? 0)
  const changeText = (field: 'title' | 'body', value: string) => {
    const next = { ...text, [field]: value }
    setText(next)
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ ...next, base: article?.updatedAt ?? 0 }))
      setDraftFailed(false)
    } catch { setDraftFailed(true) }
  }
  useEffect(() => {
    const items = urls.current
    return () => { for (const url of items) URL.revokeObjectURL(url) }
  }, [])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const choose = (files: FileList | null) => {
    if (!files) return
    try {
      if (files.length + attachments.length > MAX_ATTACHMENTS) throw new Error(t('fileError'))
      const selected = Array.from(files)
      for (const file of selected) {
        validateMediaFile(file)
        if (auth.mode === 'local' && (file.type.startsWith('video/') || file.size > 1024 * 1024)) throw new Error(t('localMedia'))
      }
      const added = selected.map(file => { const url = URL.createObjectURL(file); urls.current.add(url); return { key: crypto.randomUUID(), url, kind: file.type.startsWith('image/') ? 'image' as const : 'video' as const, alt: '', file } })
      setAttachments(current => [...current, ...added])
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('fileError')) }
    if (inputRef.current) inputRef.current.value = ''
  }
  const remove = (key: string) => {
    const item = attachments.find(value => value.key === key)
    if (item?.file) { URL.revokeObjectURL(item.url); urls.current.delete(item.url) }
    setAttachments(current => current.filter(value => value.key !== key))
  }
  const leave = () => {
    if (!busy && (!attachments.some(item => item.file) || window.confirm(t('leave')))) navigate(article ? `/posts/${encodeURIComponent(article.id)}` : '/')
  }
  const publish = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth.user || busyRef.current) return
    setError('')
    if (attachments.some(item => item.kind === 'image' && !item.alt.trim())) { setError(t('descriptions')); return }
    // Validate text before starting any upload.
    try { validateArticle(text) } catch { setError(t('saveFailed')); return }
    busyRef.current = true
    setBusy(true)
    const uploaded: ArticleMedia[] = []
    let published = false
    try {
      const media: ArticleMedia[] = []
      let index = 0
      const total = attachments.filter(item => item.file).length
      for (const item of attachments) {
        if (item.file) {
          setProgress(`${t('progress')} ${++index} / ${total}`)
          const prepared = await prepareMedia(item.file)
          const result = { ...await repo.uploadMedia(prepared.file), width: prepared.width, height: prepared.height }
          uploaded.push(result)
          media.push({ ...result, alt: item.alt.trim() })
        } else if (item.saved) media.push({ ...item.saved, alt: item.alt.trim() })
      }
      setProgress(t('publishing'))
      const draft = { title: text.title, body: text.body, media }
      const post = article ? await repo.update(article.id, draft, article.updatedAt) : await repo.create(draft, auth.user.email)
      published = true
      try { sessionStorage.removeItem(draftKey) } catch { /* No stored draft. */ }
      const removed = (article?.media ?? []).filter(item => !media.some(value => value.path === item.path))
      try { await repo.removeMedia(removed) } catch { /* Published content is safe; unused files can be cleaned in Storage. */ }
      navigate(`/posts/${encodeURIComponent(post.id)}`, { replace: true })
    } catch (cause) {
      let cleanupFailed = false
      if (!published) try { await repo.removeMedia(uploaded) } catch { cleanupFailed = true }
      setError(`${t('saveFailed')} ${cause instanceof Error ? cause.message : ''}${cleanupFailed ? ' Uploaded files may need cleanup in Storage.' : ''}`)
    } finally { busyRef.current = false; setBusy(false); setProgress('') }
  }

  const previewArticle: Article = { id: article?.id ?? 'preview', title: text.title, body: text.body, authorEmail: null, createdAt: article?.createdAt ?? previewTime, updatedAt: previewTime, viewCount: article?.viewCount ?? 0, media: [] }
  return <div className="knowledge-page">
    <div className="composer-toolbar"><button type="button" onClick={leave} disabled={busy}><ArrowLeft size={20} aria-hidden="true" />{t('back')}</button><button type="button" onClick={() => setPreview(value => !value)} disabled={busy}>{t(preview ? 'finish' : 'preview')}</button></div>
    <main className="knowledge-editor">
      <h1>{t(article ? 'edit' : 'write')}</h1><p className="composer-note">{t('publicHint')}</p>
      {preview ? <article className="composer-preview"><h2>{text.title || t('title')}</h2><ArticleMeta article={previewArticle} />{attachments.map(item => item.kind === 'image' ? <img key={item.key} src={item.url} alt={item.alt} width="1200" height="800" /> : <video key={item.key} src={item.url} controls playsInline preload="none" />)}<div className="knowledge-body">{text.body || t('content')}</div></article> : <form onSubmit={event => void publish(event)}>
        <fieldset disabled={busy}>
          <label className="composer-label" htmlFor="post-title">{t('title')}<span>{text.title.length} / 160</span></label>
          <input id="post-title" name="title" required maxLength={160} value={text.title} onChange={event => changeText('title', event.target.value)} placeholder={t('title')} />
          <label className="composer-label" htmlFor="post-body">{t('content')}<span>{text.body.length.toLocaleString()} / 30,000</span></label>
          <textarea id="post-body" name="content" required rows={9} maxLength={30000} value={text.body} onChange={event => changeText('body', event.target.value)} placeholder={t('content')} />
          <div className="composer-media-heading"><h2>{t('upload')}</h2><span>{attachments.length} / {MAX_ATTACHMENTS}</span></div>
          <p className="composer-note" id="media-help">{t(auth.mode === 'local' ? 'localMedia' : 'mediaHint')}</p>
          <input ref={inputRef} type="file" accept={MEDIA_ACCEPT} multiple hidden aria-label={t('upload')} onChange={event => choose(event.target.files)} />
          <div className="composer-attachments">{attachments.map(item => <div key={item.key} className="composer-attachment">
            {item.kind === 'image' ? <img src={item.url} alt={item.alt} width="600" height="400" /> : <video src={item.url} controls playsInline preload="metadata" />}
            <button type="button" className="attachment-remove" aria-label={t('remove')} onClick={() => remove(item.key)}><X size={18} /></button>
            <label>{t(item.kind === 'image' ? 'alt' : 'caption')}<input required={item.kind === 'image'} maxLength={300} value={item.alt} onChange={event => setAttachments(current => current.map(value => value.key === item.key ? { ...value, alt: event.target.value } : value))} /></label>
          </div>)}</div>
          <button type="button" aria-describedby="media-help" className="composer-upload" disabled={attachments.length >= MAX_ATTACHMENTS} onClick={() => inputRef.current?.click()}><ImagePlus size={23} aria-hidden="true" />{t('upload')}</button>
        </fieldset>
        {error && <p className="knowledge-error" role="alert">{error}</p>}
        <p className="composer-note" role={draftFailed ? 'alert' : undefined}>{t(draftFailed ? 'draftFailed' : 'draft')}</p>
        <div className="composer-publish-bar"><button type="submit" disabled={busy || !auth.user} className="knowledge-primary"><Upload size={18} aria-hidden="true" />{busy ? progress || t('publishing') : t(article ? 'save' : 'publish')}</button><span role="status" className="sr-only">{progress}</span></div>
      </form>}
    </main>
  </div>
}

export default function ComposerScreen() {
  const { id = '' } = useParams()
  const state = useArticle(id)
  const t = useFeedText()
  if (!id) return <Editor article={null} />
  if (state.loading) return <div className="knowledge-page"><FeedHeader back /><FeedSkeleton /></div>
  if (state.error) return <div className="knowledge-page"><FeedHeader back /><FeedError retry={state.retry} /></div>
  if (!state.article) return <div className="knowledge-state"><h1>{t('notFound')}</h1><Link to="/">{t('back')}</Link></div>
  return <Editor key={state.article.id} article={state.article} />
}
