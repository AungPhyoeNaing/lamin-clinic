import { describe, expect, it } from 'vitest'
import type { Visit } from '../data/types'
import { summarizeByDay, totalFees } from './summary'

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
