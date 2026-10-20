import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseConfig } from './supabase-config'
import { clinicFetch } from '../lib/network'

export function createSupabaseServices(config: SupabaseConfig): { client: SupabaseClient } {
  // Keep all browser traffic (including generated public media URLs) on our domain.
  // Preserve the original project-specific session key when switching endpoints.
  const endpoint = typeof window === 'undefined'
    ? config.url
    : new URL('/clinic-api', window.location.origin).href
  const storageKey = `sb-${new URL(config.url).hostname.split('.')[0]}-auth-token`
  const client = createClient(endpoint, config.anonKey, {
    auth: { storageKey },
    global: { fetch: clinicFetch },
  })
  return { client }
}
