export interface SupabaseConfig {
  url: string
  anonKey: string
}

/** Returns null when the app is not configured for Supabase — it then runs in local mode. */
export function readSupabaseConfig(): SupabaseConfig | null {
  const env = import.meta.env
  const rawUrl = (env.VITE_SUPABASE_URL ?? '').trim()
  const anonKey = (env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (!rawUrl || !anonKey) return null

  // Clean URL in case user copied the PostgREST endpoint with /rest/v1
  const url = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  return { url, anonKey }
}
