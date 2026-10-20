const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const EN_MONTHS_SHORT = EN_MONTHS.map((m) => m.slice(0, 3))

const EN_WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export const BURMESE_MONTHS = [
  'ဇန်နဝါရီ',
  'ဖေဖော်ဝါရီ',
  'မတ်',
  'ဧပြီ',
  'မေ',
  'ဇွန်',
  'ဇူလိုင်',
  'ဩဂုတ်',
  'စက်တင်ဘာ',
  'အောက်တိုဘာ',
  'နိုဝင်ဘာ',
  'ဒီဇင်ဘာ',
]

export const BURMESE_WEEKDAYS = [
  'တနင်္ဂနွေ',
  'တနင်္လာ',
  'အင်္ဂါ',
  'ဗုဒ္ဓဟူး',
  'ကြာသပတေး',
  'သောကြာ',
  'စနေ',
]

const amountFormat = new Intl.NumberFormat('en-US')

export function formatAmount(amount: number): string {
  return amountFormat.format(amount)
}

export function formatKs(amount: number): string {
  return `${amountFormat.format(amount)} Ks`
}

/** Local-timezone date key, e.g. 2026-10-16 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDays(key: string, delta: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + delta)
  return toDateKey(date)
}

export function monthKeyOf(key: string): string {
  return key.slice(0, 7)
}

export function addMonths(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function daysOfMonth(monthKey: string): string[] {
  const [y, m] = monthKey.split('-').map(Number)
  const count = new Date(y, m, 0).getDate()
  const days: string[] = []
  for (let day = 1; day <= count; day++) {
    days.push(`${monthKey}-${String(day).padStart(2, '0')}`)
  }
  return days
}

export function formatDateShort(key: string): string {
  const date = fromDateKey(key)
  return `${date.getDate()} ${EN_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDateLong(key: string): string {
  const date = fromDateKey(key)
  return `${date.getDate()} ${EN_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDateMy(key: string): string {
  const date = fromDateKey(key)
  return `${date.getDate()} ${BURMESE_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatWeekdayEn(key: string): string {
  return EN_WEEKDAYS[fromDateKey(key).getDay()]
}

export function formatWeekdayMy(key: string): string {
  return BURMESE_WEEKDAYS[fromDateKey(key).getDay()]
}

export function formatMonthShort(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${EN_MONTHS_SHORT[m - 1]} ${y}`
}

export function formatMonthEn(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${EN_MONTHS[m - 1]} ${y}`
}

export function formatMonthMy(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${BURMESE_MONTHS[m - 1]} ${y}`
}

export function formatDayShortEn(key: string): string {
  const date = fromDateKey(key)
  return `${EN_WEEKDAYS[date.getDay()].slice(0, 3)}, ${date.getDate()} ${EN_MONTHS_SHORT[date.getMonth()]}`
}
