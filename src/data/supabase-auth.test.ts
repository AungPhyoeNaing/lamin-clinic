import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { signIn, subscribeAuth } from './supabase-auth'

describe('staff sign-in', () => {
  it('finishes initial auth loading even when session recovery stalls', async () => {
    vi.useFakeTimers()
    try {
      const callback = vi.fn()
      const unsubscribe = vi.fn()
      const client = { auth: {
        getSession: () => new Promise(() => {}),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe } } }),
      } } as unknown as SupabaseClient
      const stop = subscribeAuth(client, callback)
      await vi.advanceTimersByTimeAsync(20000)
      expect(callback).toHaveBeenCalledWith(null)
      stop()
      expect(unsubscribe).toHaveBeenCalledOnce()
    } finally { vi.useRealTimers() }
  })
  it('signs out authenticated accounts that are not approved staff', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    const client = {
      auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: null }), signOut },
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as unknown as SupabaseClient
    await expect(signIn(client, 'guest@example.com', 'password')).rejects.toThrow('Staff access')
    expect(signOut).toHaveBeenCalledOnce()
  })

  it('allows approved staff and fails closed on an authorization error', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: null, error: new Error('Unavailable') })
    const signOut = vi.fn().mockResolvedValue({ error: null })
    const client = { auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: null }), signOut }, rpc } as unknown as SupabaseClient
    await expect(signIn(client, 'doctor@example.com', 'password')).resolves.toBeUndefined()
    expect(signOut).not.toHaveBeenCalled()
    await expect(signIn(client, 'doctor@example.com', 'password')).rejects.toThrow('Cannot reach')
    expect(signOut).not.toHaveBeenCalled()
  })
})
