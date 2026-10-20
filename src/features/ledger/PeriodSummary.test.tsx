// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Visit } from '../../data/types'
import PeriodSummary from './PeriodSummary'

const { listByDateRange } = vi.hoisted(() => ({ listByDateRange: vi.fn() }))
const repo = { listByDateRange }
vi.mock('../../app/providers', () => ({
  useRepository: () => repo,
  useSettings: () => ({ lang: 'en' }),
}))

afterEach(() => { cleanup(); vi.resetAllMocks() })

function visit(date: string, fee: number): Visit {
  return { id: `${date}-${fee}`, date, fee, patientName: 'Patient', age: null, diagnosis: '', createdAt: 0, updatedAt: 0 }
}

describe('PeriodSummary', () => {
  it('loads across the month boundary and shows separate week and month totals', async () => {
    listByDateRange.mockResolvedValue([
      visit('2026-12-28', 2000), visit('2027-01-01', 5000),
      visit('2027-01-03', 0), visit('2027-01-31', 10000),
    ])
    render(<PeriodSummary dateKey="2027-01-01" />)
    await screen.findByText('7,000 Ks')
    expect(listByDateRange).toHaveBeenCalledWith('2026-12-28', '2027-01-31')
    expect(within(screen.getByRole('region', { name: 'Weekly summary' })).getByText('3')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Monthly summary' })).getByText('15,000 Ks')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Monthly summary' })).getByText('3')).toBeTruthy()
  })

  it('hides stale totals when the selected period changes, then shows empty totals', async () => {
    listByDateRange.mockResolvedValueOnce([visit('2027-01-01', 5000)])
    const { rerender } = render(<PeriodSummary dateKey="2027-01-01" />)
    await screen.findAllByText('5,000 Ks')
    let resolve!: (visits: Visit[]) => void
    listByDateRange.mockImplementationOnce(() => new Promise<Visit[]>((done) => { resolve = done }))
    rerender(<PeriodSummary dateKey="2027-02-15" />)
    expect(screen.queryByText('5,000 Ks')).toBeNull()
    expect(screen.getAllByText('—')).toHaveLength(4)
    resolve([])
    expect(await screen.findAllByText('0 Ks')).toHaveLength(2)
    expect(screen.getAllByText('0')).toHaveLength(2)
  })

  it('shows a failed request with a retry and recovers', async () => {
    listByDateRange.mockRejectedValueOnce(new Error('Connection failed')).mockResolvedValueOnce([])
    render(<PeriodSummary dateKey="2027-01-01" />)
    await screen.findByRole('alert')
    expect(screen.getAllByText('—')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findAllByText('0 Ks')).toHaveLength(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
