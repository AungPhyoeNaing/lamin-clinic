import type { Visit } from '../data/types'
import { addDays, daysOfMonth, fromDateKey } from './format'

export function dashboardPeriods(date: string) {
  const weekStart = addDays(date, -((fromDateKey(date).getDay() + 6) % 7))
  const weekEnd = addDays(weekStart, 6)
  const monthStart = `${date.slice(0, 7)}-01`
  const monthEnd = daysOfMonth(date.slice(0, 7)).at(-1)!
  return {
    weekStart, weekEnd, monthStart, monthEnd,
    from: weekStart < monthStart ? weekStart : monthStart,
    to: weekEnd > monthEnd ? weekEnd : monthEnd,
  }
}

export function summarizePeriod(visits: Visit[], from: string, to: string) {
  let income = 0
  let patients = 0
  for (const visit of visits) {
    if (visit.date < from || visit.date > to) continue
    income += visit.fee
    patients += 1
  }
  return { income, patients }
}

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
