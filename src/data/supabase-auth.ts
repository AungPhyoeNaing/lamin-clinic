import type { SupabaseClient } from '@supabase/supabase-js'
import { CONNECTION_ERROR, withTimeout } from '../lib/network'

export interface AuthUser {
  email: string | null
}

export function subscribeAuth(
  client: SupabaseClient,
  callback: (user: AuthUser | null) => void,
): () => void {
  let revision = 0
  let disposed = false
  const update = async (user: { email?: string } | null) => {
    if (disposed) return
    const current = ++revision
    if (!user) { callback(null); return }
    try {
      const { data, error } = await withTimeout(client.rpc('is_staff'))
      if (current === revision) callback(!error && data === true ? { email: user.email ?? null } : null)
    } catch {
      if (current === revision) callback(null)
    }
  }
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null
    // Defer API calls until the auth callback releases its session lock.
    setTimeout(() => { void update(user) }, 0)
  })
  withTimeout(client.auth.getSession()).then(({ data: { session } }) => {
    const user = session?.user ?? null
    void update(user)
  }).catch(() => { if (!disposed) callback(null) })
  return () => { disposed = true; revision++; data.subscription.unsubscribe() }
}

export async function signIn(client: SupabaseClient, email: string, password: string): Promise<void> {
  const { error } = await withTimeout(client.auth.signInWithPassword({ email: email.trim(), password }))
  if (error) throw error
  const { data: allowed, error: accessError } = await withTimeout(client.rpc('is_staff'))
  // A connection failure must not be reported as a staff-permission rejection.
  if (accessError) throw new Error(CONNECTION_ERROR)
  if (allowed !== true) {
    await withTimeout(client.auth.signOut({ scope: 'local' }))
    throw new Error('Staff access is required. Ask the clinic administrator to approve your account.')
  }
}

export async function signOut(client: SupabaseClient): Promise<void> {
  const { error } = await withTimeout(client.auth.signOut())
  if (error) throw error
}
