import { describe, expect, it } from 'vitest'
import { createLocalRepository, type KeyValueStore } from './local'

class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>()

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

function setup() {
  const store = new MemoryStore()
  let time = 1000
  const repo = createLocalRepository(store, () => time++)
  return { store, repo, tick: () => time }
}

const draft = {
  date: '2026-10-16',
  patientName: 'Daw Mya',
  age: 52,
  diagnosis: 'Headache',
  fee: 15000,
}

describe('createLocalRepository', () => {
  it('saves and lists visits for a day', async () => {
    const { repo } = setup()
    const saved = await repo.saveVisit(draft)
    expect(saved.id).toBeTruthy()
    expect(saved.createdAt).toBe(1000)
    expect(saved.patientName).toBe('Daw Mya')

    const visits = await repo.listByDate('2026-10-16')
    expect(visits).toHaveLength(1)
    expect(visits[0].fee).toBe(15000)

    expect(await repo.listByDate('2026-10-17')).toEqual([])
  })

  it('trims whitespace on save', async () => {
    const { repo } = setup()
    const saved = await repo.saveVisit({ ...draft, patientName: '  Ko Aung  ', diagnosis: ' Flu ' })
    expect(saved.patientName).toBe('Ko Aung')
    expect(saved.diagnosis).toBe('Flu')
  })

  it('updates an existing visit and keeps createdAt', async () => {
    const { repo } = setup()
    const saved = await repo.saveVisit(draft)
    const updated = await repo.saveVisit({ ...draft, fee: 20000 }, saved)
    expect(updated.id).toBe(saved.id)
    expect(updated.createdAt).toBe(saved.createdAt)
    expect(updated.updatedAt).toBeGreaterThan(saved.updatedAt)

    const visits = await repo.listByDate('2026-10-16')
    expect(visits).toHaveLength(1)
    expect(visits[0].fee).toBe(20000)
  })

  it('deletes a visit', async () => {
    const { repo } = setup()
    const saved = await repo.saveVisit(draft)
    await repo.deleteVisit(saved.id)
    expect(await repo.listByDate('2026-10-16')).toEqual([])
  })

  it('lists visits in a date range inclusive and sorted', async () => {
    const { repo } = setup()
    await repo.saveVisit({ ...draft, date: '2026-10-01' })
    await repo.saveVisit({ ...draft, date: '2026-10-15' })
    await repo.saveVisit({ ...draft, date: '2026-11-01' })

    const range = await repo.listByDateRange('2026-10-01', '2026-10-31')
    expect(range.map((visit) => visit.date)).toEqual(['2026-10-01', '2026-10-15'])
  })

  it('deduplicates recent patient names case-insensitively', async () => {
    const { repo } = setup()
    await repo.saveVisit({ ...draft, patientName: 'Daw Mya', age: 52 })
    await repo.saveVisit({ ...draft, patientName: 'daw mya', age: 53 })
    await repo.saveVisit({ ...draft, patientName: 'Ko Aung', age: 30, date: '2026-01-01' })

    const names = await repo.listRecentNames('2026-10-01')
    expect(names).toHaveLength(1)
    expect(names[0]).toEqual({ name: 'daw mya', age: 53 })
  })

  it('persists across repository instances sharing a store', async () => {
    const { store, repo } = setup()
    await repo.saveVisit(draft)
    const second = createLocalRepository(store)
    expect(await second.listByDate('2026-10-16')).toHaveLength(1)
  })

  it('exports all visits sorted by date', async () => {
    const { repo } = setup()
    await repo.saveVisit({ ...draft, date: '2026-10-16' })
    await repo.saveVisit({ ...draft, date: '2026-10-02' })
    const all = await repo.exportAll()
    expect(all.map((visit) => visit.date)).toEqual(['2026-10-02', '2026-10-16'])
  })

  it('preserves malformed stored data instead of overwriting it', async () => {
    const store = new MemoryStore()
    store.setItem('lamin.visits.v1', 'not json')
    const repo = createLocalRepository(store)
    await expect(repo.listByDate('2026-10-16')).rejects.toThrow('damaged')
    await expect(repo.saveVisit(draft)).rejects.toThrow('damaged')
    expect(store.getItem('lamin.visits.v1')).toBe('not json')
  })

  it('keeps newer records when restoring an old backup', async () => {
    const { repo } = setup()
    const original = await repo.saveVisit(draft)
    await repo.saveVisit({ ...draft, fee: 20000 }, original)
    expect(await repo.importAll!([original])).toBe(0)
    expect((await repo.exportAll())[0].fee).toBe(20000)
  })

  it('rejects a whole import before writing any invalid records', async () => {
    const { repo } = setup()
    const saved = await repo.saveVisit(draft)
    await expect(repo.importAll!([{ ...saved, id: 'new' }, { ...saved, fee: -1 }])).rejects.toThrow()
    expect(await repo.exportAll()).toEqual([saved])
  })
})
