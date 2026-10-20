import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseConfig } from './supabase-config'

export function createSupabaseServices(config: SupabaseConfig): { client: SupabaseClient } {
  const client = createClient(config.url, config.anonKey)
  return { client }
}
