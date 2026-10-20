import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  daysOfMonth,
  formatDateMy,
  formatDateShort,
  formatKs,
  formatMonthEn,
  formatMonthMy,
  formatWeekdayEn,
  formatWeekdayMy,
  fromDateKey,
  monthKeyOf,
  toDateKey,
} from './format'

describe('date keys', () => {
  it('round-trips a date through key and back', () => {
    const date = new Date(2026, 9, 16)
    expect(toDateKey(date)).toBe('2026-10-16')
    expect(fromDateKey('2026-10-16').getDate()).toBe(16)
    expect(fromDateKey('2026-10-16').getMonth()).toBe(9)
    expect(fromDateKey('2026-10-16').getFullYear()).toBe(2026)
  })

  it('adds days across month boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('adds months across year boundaries', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-10', 0)).toBe('2026-10')
  })

  it('lists every day of a month', () => {
    expect(daysOfMonth('2026-02')).toHaveLength(28)
    expect(daysOfMonth('2028-02')).toHaveLength(29)
    expect(daysOfMonth('2026-10')).toHaveLength(31)
    expect(daysOfMonth('2026-10')[0]).toBe('2026-10-01')
    expect(daysOfMonth('2026-10')[30]).toBe('2026-10-31')
  })

  it('extracts the month key', () => {
    expect(monthKeyOf('2026-10-16')).toBe('2026-10')
  })
})

describe('formatting', () => {
  it('formats amounts with thousand separators', () => {
    expect(formatKs(0)).toBe('0 Ks')
    expect(formatKs(15000)).toBe('15,000 Ks')
    expect(formatKs(1234567)).toBe('1,234,567 Ks')
  })

  it('formats dates in English', () => {
    expect(formatDateShort('2026-10-16')).toBe('16 Oct 2026')
    expect(formatMonthEn('2026-10')).toBe('October 2026')
  })

  it('formats dates in Burmese', () => {
    expect(formatDateMy('2026-10-16')).toBe('16 အောက်တိုဘာ 2026')
    expect(formatMonthMy('2026-01')).toBe('ဇန်နဝါရီ 2026')
  })

  it('formats weekdays', () => {
    expect(formatWeekdayEn('2026-10-16')).toBe('Friday')
    expect(formatWeekdayMy('2026-10-16')).toBe('သောကြာ')
  })
})
