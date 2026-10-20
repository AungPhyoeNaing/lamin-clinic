import { newId } from '../lib/id'
import type { RecentName, Visit, VisitRepository } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseVisits, validateDraft } from './validation'

const FAR_FUTURE = '9999-12-31'

export function createSupabaseRepository(
  client: SupabaseClient,
  now: () => number = Date.now,
): VisitRepository {
  async function listByDateRangeAll(from: string, to: string): Promise<Visit[]> {
    const visits: Visit[] = []
    let total: number | null = null
    for (;;) {
      const { data, count, error } = await client
        .from('visits')
        .select('*', visits.length === 0 ? { count: 'exact' } : undefined)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true })
        .order('createdAt', { ascending: true })
        .order('id', { ascending: true })
        .range(visits.length, visits.length + 499)
      if (error) throw error
      if (!data?.length) return visits
      visits.push(...data as Visit[])
      if (total === null && count != null) total = count
      if (total !== null && visits.length >= total) return visits
    }
  }

  return {
    async listByDate(date) {
      return listByDateRangeAll(date, date)
    },

    listByDateRange(from, to) {
      return listByDateRangeAll(from, to)
    },

    async listRecentNames(sinceDate) {
      const recent = await listByDateRangeAll(sinceDate, FAR_FUTURE)
      const latest = new Map<string, Visit>()
      for (const visit of recent) {
        const key = visit.patientName.trim().toLowerCase()
        if (!key) continue
        const current = latest.get(key)
        if (!current || visit.createdAt > current.createdAt) latest.set(key, visit)
      }
      return [...latest.values()]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 40)
        .map<RecentName>((visit) => ({ name: visit.patientName.trim(), age: visit.age }))
    },

    async saveVisit(draft, existing) {
      validateDraft(draft)
      const timestamp = now()
      const visit: Visit = {
        id: existing?.id ?? newId(),
        date: draft.date,
        patientName: draft.patientName.trim(),
        age: draft.age,
        diagnosis: draft.diagnosis.trim(),
        fee: draft.fee,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      }
      const { error } = await client.from('visits').upsert(visit)
      if (error) throw error
      return visit
    },

    async deleteVisit(id) {
      const { error } = await client.from('visits').delete().eq('id', id)
      if (error) throw error
    },

    async exportAll() {
      return listByDateRangeAll('0001-01-01', FAR_FUTURE)
    },

    async importAll(importedVisits) {
      parseVisits(importedVisits)
      if (importedVisits.length === 0) return 0
      const { data, error } = await client.rpc('restore_visits', { records: importedVisits })
      if (error) throw error
      return data as number
    },
  }
}
