// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseServices } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import routing from '../../vercel.json'

const clients: SupabaseClient[] = []
const config = { url: 'https://original-project.supabase.co', anonKey: 'public-anon-key' }
function setup() {
  const requests: { url: string; init?: RequestInit }[] = []
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    requests.push({ url, init })
    if (url.includes('/auth/v1/token')) return new Response(JSON.stringify({
      access_token: 'staff-access-token', refresh_token: 'staff-refresh-token',
      token_type: 'bearer', expires_in: 3600,
      user: { id: 'staff-id', email: 'staff@example.com' },
    }), { headers: { 'content-type': 'application/json' } })
    return new Response(JSON.stringify(url.includes('/storage/v1/') ? { Key: 'article-media/test.mp4' } : true), {
      headers: { 'content-type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetcher)
  const { client } = createSupabaseServices(config)
  client.auth.stopAutoRefresh()
  clients.push(client)
  return { client, requests }
}

afterEach(async () => {
  for (const client of clients.splice(0)) {
    await client.auth.signOut({ scope: 'local' })
    client.auth.stopAutoRefresh()
  }
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('same-origin Supabase transport', () => {
  it('routes sign-in and staff RPCs through the website with the staff bearer token', async () => {
    const { client, requests } = setup()
    const { error } = await client.auth.signInWithPassword({ email: 'staff@example.com', password: 'test-password' })
    expect(error).toBeNull()
    await client.rpc('is_staff')
    expect(requests.map(request => request.url)).toEqual([
      `${window.location.origin}/clinic-api/auth/v1/token?grant_type=password`,
      `${window.location.origin}/clinic-api/rest/v1/rpc/is_staff`,
    ])
    const headers = new Headers(requests[1].init?.headers)
    expect(headers.get('authorization')).toBe('Bearer staff-access-token')
    expect(headers.get('apikey')).toBe(config.anonKey)
    expect(localStorage.getItem('sb-original-project-auth-token')).toContain('staff-access-token')
  })

  it('keeps uploads and generated public media URLs on the proxy, including files over 4.5 MB', async () => {
    const { client, requests } = setup()
    const file = new File([new Uint8Array(6 * 1024 * 1024)], 'test.mp4', { type: 'video/mp4' })
    const { error } = await client.storage.from('article-media').upload('test.mp4', file, { contentType: 'video/mp4' })
    expect(error).toBeNull()
    expect(requests[0].url).toBe(`${window.location.origin}/clinic-api/storage/v1/object/article-media/test.mp4`)
    expect(requests[0].init?.method).toBe('POST')
    expect(requests[0].init?.body).toBeInstanceOf(FormData)
    const body = requests[0].init?.body as FormData
    expect((body.get('') as File).size).toBe(file.size)
    expect(client.storage.from('article-media').getPublicUrl('test.mp4').data.publicUrl)
      .toBe(`${window.location.origin}/clinic-api/storage/v1/object/public/article-media/test.mp4`)
  })

  it('places fixed upstream rewrites before SPA routing and keeps private API data uncached', () => {
    for (const service of ['auth', 'rest', 'storage']) {
      const route = routing.rewrites.find(item => item.source === `/clinic-api/${service}/v1/:path*`)
      expect(route).toBeDefined()
      expect(new URL(route!.destination).protocol).toBe('https:')
      expect(new URL(route!.destination).pathname).toBe(`/${service}/v1/:path*`)
    }
    expect(routing.rewrites.at(-1)?.destination).toBe('/index.html')
    const rule = routing.headers.find(item => item.source.startsWith('/clinic-api/:path('))!
    const privatePath = new RegExp(`^${rule.source.replace(':path', '')}$`)
    for (const path of ['/clinic-api/rest/v1/visits', '/clinic-api/auth/v1/user', '/clinic-api/storage/v1/object/article-media/file.webp']) {
      expect(privatePath.test(path)).toBe(true)
    }
    expect(privatePath.test('/clinic-api/storage/v1/object/public/article-media/file.webp')).toBe(false)
    const headers = rule.headers
    expect(headers).toContainEqual({ key: 'x-vercel-enable-rewrite-caching', value: '0' })
    expect(headers).toContainEqual({ key: 'Cache-Control', value: 'no-store' })
  })

  it('caches only public media in browsers and versioned static assets long-term', () => {
    const media = routing.headers.find(item => item.source === '/clinic-api/storage/v1/object/public/article-media/:path*')!
    expect(media.headers).toContainEqual({ key: 'Cache-Control', value: 'public, max-age=3600' })
    expect(media.headers).toContainEqual({ key: 'Vercel-CDN-Cache-Control', value: 'no-store' })
    expect(routing.headers.find(item => item.source === '/assets/:path*')?.headers)
      .toContainEqual({ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' })
    expect(routing.headers.some(item => item.source === '/index.html' || item.source === '/sw.js')).toBe(false)
  })
})
