import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseRepository } from './supabase-repo'

describe('cloud visit repository', () => {
  it('stops at the reported count without an extra empty request, even with a smaller server page cap', async () => {
    const rows = Array.from({ length: 503 }, (_, id) => ({ id: String(id) }))
    const range = vi.fn(async (from: number) => ({ data: rows.slice(from, from + 200), count: from === 0 ? rows.length : null, error: null }))
    const query = { select: vi.fn(), gte: vi.fn(), lte: vi.fn(), order: vi.fn(), range }
    for (const method of [query.select, query.gte, query.lte, query.order]) method.mockReturnValue(query)
    const client = { from: vi.fn(() => query) } as unknown as SupabaseClient
    expect(await createSupabaseRepository(client).listByDateRange('2026-10-01', '2026-10-31')).toEqual(rows)
    expect(range).toHaveBeenCalledTimes(3)
    expect(query.select).toHaveBeenNthCalledWith(1, '*', { count: 'exact' })
    expect(query.select).toHaveBeenNthCalledWith(2, '*', undefined)
  })
  it('exports every page even when the server cap is smaller than the requested page', async () => {
    const rows = Array.from({ length: 1203 }, (_, id) => ({ id: String(id) }))
    const range = vi.fn(async (from: number) => ({ data: rows.slice(from, from + 200), error: null }))
    const query = { select: vi.fn(), gte: vi.fn(), lte: vi.fn(), order: vi.fn(), range }
    for (const method of [query.select, query.gte, query.lte, query.order]) method.mockReturnValue(query)
    const client = { from: vi.fn(() => query) } as unknown as SupabaseClient
    expect(await createSupabaseRepository(client).exportAll()).toEqual(rows)
    expect(range).toHaveBeenLastCalledWith(1203, 1702)
  })

  it('fails the export if a later page fails', async () => {
    const query = { select: vi.fn(), gte: vi.fn(), lte: vi.fn(), order: vi.fn(), range: vi.fn()
      .mockResolvedValueOnce({ data: [{ id: '1' }], error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('Network failed') }) }
    for (const method of [query.select, query.gte, query.lte, query.order]) method.mockReturnValue(query)
    await expect(createSupabaseRepository({ from: () => query } as unknown as SupabaseClient).exportAll()).rejects.toThrow('Network failed')
  })

  it('restores through the atomic database function and returns the affected count', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 0, error: null })
    const repo = createSupabaseRepository({ rpc } as unknown as SupabaseClient)
    const records = [{ id: '1', date: '2026-10-20', patientName: 'Patient', age: null, diagnosis: '', fee: 5000, createdAt: 1, updatedAt: 2 }]
    expect(await repo.importAll!(records)).toBe(0)
    expect(rpc).toHaveBeenCalledWith('restore_visits', { records })
    await expect(repo.importAll!([{ ...records[0], fee: -1 }])).rejects.toThrow()
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})
