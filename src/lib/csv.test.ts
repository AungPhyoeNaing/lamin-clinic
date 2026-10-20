import { describe, expect, it } from 'vitest'
import type { Visit } from '../data/types'
import { visitsToCsv } from './csv'

function visit(overrides: Partial<Visit>): Visit {
  return {
    id: 'v1',
    date: '2026-10-16',
    patientName: 'Daw Mya',
    age: 52,
    diagnosis: 'Headache',
    fee: 15000,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('visitsToCsv', () => {
  it('neutralizes spreadsheet formulas including leading whitespace', () => {
    const csv = visitsToCsv([visit({ patientName: '=1+1', diagnosis: '  @SUM(A1)' })])
    expect(csv).toContain("'=1+1")
    expect(csv).toContain("'  @SUM(A1)")
  })
  it('writes a header and one row per visit', () => {
    const csv = visitsToCsv([visit({}), visit({ id: 'v2', patientName: 'Ko Aung', fee: 10000 })])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Date,Patient,Age,Diagnosis,Fee (Ks)')
    expect(lines[1]).toBe('2026-10-16,Daw Mya,52,Headache,15000')
    expect(lines[2]).toBe('2026-10-16,Ko Aung,52,Headache,10000')
  })

  it('quotes cells containing commas, quotes, or newlines', () => {
    const csv = visitsToCsv([
      visit({
        patientName: 'Daw "Mya", Jr',
        diagnosis: 'Cough,\nlow fever',
      }),
    ])
    expect(csv).toContain('"Daw ""Mya"", Jr"')
    expect(csv).toContain('"Cough,\nlow fever"')
  })

  it('writes an empty age when missing', () => {
    const csv = visitsToCsv([visit({ age: null })])
    expect(csv.split('\r\n')[1]).toBe('2026-10-16,Daw Mya,,Headache,15000')
  })
})
