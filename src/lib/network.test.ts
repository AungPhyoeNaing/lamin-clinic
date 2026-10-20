import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clinicFetch, withTimeout } from './network'

beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('bounded backend requests', () => {
  it('releases an operation that never settles', async () => {
    const task = withTimeout(new Promise(() => {}))
    const assertion = expect(task).rejects.toThrow('Cannot reach the clinic server')
    await vi.advanceTimersByTimeAsync(20000)
    await assertion
  })
  it('aborts stalled API traffic after 15 seconds', async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    const assertion = expect(clinicFetch('https://example.test/rest/v1/articles')).rejects.toThrow('Cannot reach')
    await vi.advanceTimersByTimeAsync(15000)
    await assertion
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
  })
  it('allows longer media uploads without hanging forever', async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    const assertion = expect(clinicFetch('https://example.test/storage/v1/object/article-media/photo.webp', { method: 'POST' })).rejects.toThrow('Cannot reach')
    await vi.advanceTimersByTimeAsync(15000)
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(75000)
    await assertion
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
  })
  it('clears its timer after successful requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')))
    expect((await clinicFetch('https://example.test/rest/v1/articles')).status).toBe(200)
    expect(vi.getTimerCount()).toBe(0)
  })
})
