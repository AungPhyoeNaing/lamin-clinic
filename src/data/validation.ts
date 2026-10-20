import type { Visit, VisitDraft } from './types'

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validateDraft(value: VisitDraft): void {
  if (!isDateKey(value.date) || typeof value.patientName !== 'string' || !value.patientName.trim() ||
    typeof value.diagnosis !== 'string' || !Number.isSafeInteger(value.fee) || value.fee < 0 ||
    (value.age !== null && (!Number.isInteger(value.age) || value.age < 0 || value.age > 130))) {
    throw new Error('Invalid visit data')
  }
}

export function parseVisits(value: unknown): Visit[] {
  if (!Array.isArray(value)) throw new Error('Invalid visit data')
  const ids = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== 'object') throw new Error('Invalid visit data')
    const visit = item as Visit
    validateDraft(visit)
    if (typeof visit.id !== 'string' || !visit.id.trim() || ids.has(visit.id) ||
      !Number.isSafeInteger(visit.createdAt) || visit.createdAt < 0 ||
      !Number.isSafeInteger(visit.updatedAt) || visit.updatedAt < visit.createdAt) {
      throw new Error('Invalid visit data')
    }
    ids.add(visit.id)
  }
  return value as Visit[]
}
