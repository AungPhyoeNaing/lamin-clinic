import type { Visit } from '../data/types'

export interface DaySummary {
  date: string
  count: number
  total: number
}

export function summarizeByDay(visits: Visit[]): DaySummary[] {
  const map = new Map<string, DaySummary>()
  for (const visit of visits) {
    const summary = map.get(visit.date) ?? { date: visit.date, count: 0, total: 0 }
    summary.count += 1
    summary.total += visit.fee
    map.set(visit.date, summary)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function totalFees(visits: Visit[]): number {
  return visits.reduce((sum, visit) => sum + visit.fee, 0)
}
