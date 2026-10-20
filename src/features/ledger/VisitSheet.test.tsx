// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import VisitSheet from './VisitSheet'

const { deleteVisit, listRecentNames } = vi.hoisted(() => ({ deleteVisit: vi.fn(), listRecentNames: vi.fn() }))
const repo = { deleteVisit, listRecentNames }
vi.mock('../../app/providers', () => ({
  useRepository: () => repo,
  useSettings: () => ({ lang: 'en', defaultFee: null }),
}))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('keeps a failed deletion open for retry without fetching patient suggestions', async () => {
  deleteVisit.mockRejectedValueOnce(new Error('Connection failed')).mockResolvedValueOnce(undefined)
  const onSaved = vi.fn()
  const onClose = vi.fn()
  render(<VisitSheet dateKey="2026-10-20" existing={{ id: 'visit-1', date: '2026-10-20', patientName: 'Patient', age: null, diagnosis: '', fee: 5000, createdAt: 0, updatedAt: 0 }} onSaved={onSaved} onClose={onClose} deleteOnly />)
  expect(listRecentNames).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Connection failed')
  expect(onSaved).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
  expect(deleteVisit).toHaveBeenNthCalledWith(1, 'visit-1')
  expect(deleteVisit).toHaveBeenNthCalledWith(2, 'visit-1')
})
