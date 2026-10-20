import { describe, expect, it } from 'vitest'
import { isDateKey, parseVisits } from './validation'

const visit = { id: 'v1', date: '2026-10-20', patientName: 'Patient', age: null, diagnosis: '', fee: 5000, createdAt: 1, updatedAt: 2 }

describe('visit validation', () => {
  it('accepts real calendar dates only', () => {
    expect(isDateKey('2028-02-29')).toBe(true)
    for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', 'bad']) expect(isDateKey(date)).toBe(false)
  })
  it('rejects malformed records, duplicates, and unsafe numeric values', () => {
    for (const records of [[null], [{}], [visit, visit], [{ ...visit, fee: Infinity }], [{ ...visit, age: 131 }], [{ ...visit, updatedAt: 0 }]]) {
      expect(() => parseVisits(records)).toThrow()
    }
    expect(parseVisits([visit])).toEqual([visit])
  })
})
