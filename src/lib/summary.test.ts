import { describe, expect, it } from 'vitest'
import type { Visit } from '../data/types'
import { dashboardPeriods, summarizeByDay, summarizePeriod, totalFees } from './summary'

function visit(date: string, fee: number): Visit {
  return {
    id: `${date}-${fee}-${Math.random()}`,
    date,
    patientName: 'Patient',
    age: null,
    diagnosis: '',
    fee,
    createdAt: 0,
    updatedAt: 0,
  }
}

describe('summarizeByDay', () => {
  it('groups by day and sorts ascending', () => {
    const summary = summarizeByDay([
      visit('2026-10-16', 15000),
      visit('2026-10-14', 10000),
      visit('2026-10-16', 5000),
    ])
    expect(summary).toEqual([
      { date: '2026-10-14', count: 1, total: 10000 },
      { date: '2026-10-16', count: 2, total: 20000 },
    ])
  })

  it('returns an empty list for no visits', () => {
    expect(summarizeByDay([])).toEqual([])
  })
})

describe('totalFees', () => {
  it('sums fees', () => {
    expect(totalFees([visit('2026-10-16', 15000), visit('2026-10-16', 5000)])).toBe(20000)
    expect(totalFees([])).toBe(0)
  })
})

describe('dashboard summaries', () => {
  it('includes the full Monday–Sunday week across a year boundary', () => {
    expect(dashboardPeriods('2027-01-01')).toEqual({
      weekStart: '2026-12-28', weekEnd: '2027-01-03',
      monthStart: '2027-01-01', monthEnd: '2027-01-31',
      from: '2026-12-28', to: '2027-01-31',
    })
  })

  it('keeps Sunday in the previous week and Monday in the next week', () => {
    expect(dashboardPeriods('2026-11-01').weekStart).toBe('2026-10-26')
    expect(dashboardPeriods('2026-11-02').weekStart).toBe('2026-11-02')
    expect(dashboardPeriods('2026-10-31').to).toBe('2026-11-01')
    expect(dashboardPeriods('2028-02-29').monthEnd).toBe('2028-02-29')
  })

  it('counts repeat and zero-fee visits and includes both period boundaries', () => {
    const visits = [
      visit('2026-09-30', 9000), visit('2026-10-01', 5000),
      visit('2026-10-01', 0), visit('2026-10-31', 7000), visit('2026-11-01', 11000),
    ]
    expect(summarizePeriod(visits, '2026-10-01', '2026-10-31')).toEqual({ income: 12000, patients: 3 })
    expect(summarizePeriod([], '2026-10-01', '2026-10-31')).toEqual({ income: 0, patients: 0 })
  })
})
