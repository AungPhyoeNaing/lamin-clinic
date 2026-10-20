// Read-only checks against public routes. Never signs in or requests patient data.
import { readFile } from 'node:fs/promises'

const site = new URL(process.argv[2] ?? 'https://lamin-clinic.vercel.app/')
if (site.protocol !== 'https:' && site.hostname !== 'localhost') throw new Error('Use an HTTPS site URL')
const env = await readFile(new URL('../.env', import.meta.url), 'utf8').catch(() => '')
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? env.match(/^VITE_SUPABASE_ANON_KEY\s*=\s*["']?([^\r\n"']+)/m)?.[1]?.trim()
const rows = []

async function measure(label, path, headers = {}) {
  const target = new URL(path, site)
  if (target.origin !== site.origin) throw new Error('Only the requested site can be measured')
  const started = performance.now()
  const response = await fetch(target, { headers, signal: AbortSignal.timeout(20000) })
  const headersMs = performance.now() - started
  const bytes = await response.arrayBuffer()
  rows.push({ label, status: response.status, headersMs: Math.round(headersMs), totalMs: Math.round(performance.now() - started),
    decodedBytes: bytes.byteLength, cacheControl: response.headers.get('cache-control'), edgeCache: response.headers.get('x-vercel-cache') })
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`)
  return new TextDecoder().decode(bytes)
}

try {
  const html = await measure('home', '/')
  const entry = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i)?.[1]
  if (entry) await measure('entry JavaScript', entry)
  await measure('sign-in HTML', '/login')
  if (anonKey) {
    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
    const feedPath = '/clinic-api/rest/v1/articles?select=id,title,excerpt,media,viewCount,createdAt,updatedAt&order=createdAt.desc,id.asc&limit=12'
    const articles = JSON.parse(await measure('public feed', feedPath, { ...headers, Prefer: 'count=exact' }))
    await measure('public feed stats', '/clinic-api/rest/v1/rpc/feed_stats', headers)
    const photo = articles.flatMap(article => article.media ?? []).find(item => item.kind === 'image')
    if (photo?.path) await measure('public photo', `/clinic-api/storage/v1/object/public/article-media/${photo.path.split('/').map(encodeURIComponent).join('/')}`)
    await measure('public feed repeat', feedPath, { ...headers, Prefer: 'count=exact' })
  }
} finally {
  console.log(JSON.stringify({ measuredAt: new Date().toISOString(), origin: site.origin,
    note: 'HTTP timings on this connection, not browser rendering or Core Web Vitals. No private routes or writes.', rows }, null, 2))
}
