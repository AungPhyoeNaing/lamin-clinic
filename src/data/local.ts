import { newId } from '../lib/id'
import type { RecentName, Visit, VisitRepository } from './types'
import { parseVisits, validateDraft } from './validation'

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = 'lamin.visits.v1'

interface StoreShape {
  version: 1
  visits: Visit[]
}

function byCreatedAt(a: Visit, b: Visit): number {
  return a.createdAt - b.createdAt
}

export function createLocalRepository(
  store: KeyValueStore,
  now: () => number = Date.now,
): VisitRepository {
  function read(): Visit[] {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as Partial<StoreShape>
      if (parsed.version !== 1) throw new Error('Unsupported storage version')
      return parseVisits(parsed.visits)
    } catch {
      throw new Error('Stored visits are damaged. Export the original browser storage before attempting recovery.')
    }
  }

  function write(visits: Visit[]): void {
    const shape: StoreShape = { version: 1, visits }
    store.setItem(STORAGE_KEY, JSON.stringify(shape))
  }

  return {
    async listByDate(date) {
      return read()
        .filter((visit) => visit.date === date)
        .sort(byCreatedAt)
    },

    async listByDateRange(from, to) {
      return read()
        .filter((visit) => visit.date >= from && visit.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date) || byCreatedAt(a, b))
    },

    async listRecentNames(sinceDate) {
      const latest = new Map<string, Visit>()
      for (const visit of read()) {
        if (visit.date < sinceDate) continue
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
      const visits = read()
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
      const index = visits.findIndex((item) => item.id === visit.id)
      if (index >= 0) {
        visits[index] = visit
      } else {
        visits.push(visit)
      }
      write(visits)
      return visit
    },

    async deleteVisit(id) {
      write(read().filter((visit) => visit.id !== id))
    },

    async exportAll() {
      return read().sort((a, b) => a.date.localeCompare(b.date) || byCreatedAt(a, b))
    },

    async importAll(importedVisits) {
      parseVisits(importedVisits)
      const current = read()
      const map = new Map<string, Visit>()
      for (const visit of current) map.set(visit.id, visit)
      let count = 0
      for (const visit of importedVisits) {
        const existing = map.get(visit.id)
        if (!existing || visit.updatedAt > existing.updatedAt) {
          map.set(visit.id, visit)
          count++
        }
      }
      const merged = [...map.values()]
      write(merged)
      return count
    },
  }
}
