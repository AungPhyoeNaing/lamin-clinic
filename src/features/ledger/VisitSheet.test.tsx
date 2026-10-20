// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import VisitSheet from './VisitSheet'

const { deleteVisit, listRecentNames, saveVisit } = vi.hoisted(() => ({ deleteVisit: vi.fn(), listRecentNames: vi.fn().mockResolvedValue([]), saveVisit: vi.fn() }))
const repo = { deleteVisit, listRecentNames, saveVisit }
vi.mock('../../app/providers', () => ({
  useRepository: () => repo,
  useSettings: () => ({ lang: 'en', defaultFee: null }),
}))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('preserves a draft when closing is cancelled and discards only after confirmation', () => {
  listRecentNames.mockResolvedValue([])
  const onClose = vi.fn()
  render(<VisitSheet dateKey="2026-10-19" existing={null} onSaved={vi.fn()} onClose={onClose} />)
  expect(screen.getByText('19 Oct 2026')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Patient name'), { target: { value: 'Draft patient' } })
  const unload = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(unload)
  expect(unload.defaultPrevented).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeTruthy()
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect(screen.getByLabelText('Patient name')).toHaveProperty('value', 'Draft patient')
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
  expect(onClose).toHaveBeenCalledOnce()
  expect(saveVisit).not.toHaveBeenCalled()
})

it('focuses the first invalid field and saves a valid record for the displayed day', async () => {
  listRecentNames.mockResolvedValue([])
  saveVisit.mockResolvedValue({})
  const onSaved = vi.fn()
  render(<VisitSheet dateKey="2026-10-19" existing={null} onSaved={onSaved} onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }))
  expect(document.activeElement).toBe(screen.getByLabelText(/Patient name/))
  expect(saveVisit).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText(/Patient name/), { target: { value: 'Patient' } })
  fireEvent.click(screen.getByRole('button', { name: '5,000' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith('saved'))
  expect(saveVisit).toHaveBeenCalledWith({ date: '2026-10-19', patientName: 'Patient', age: null, diagnosis: '', fee: 5000 }, undefined)
})

it('prevents duplicate saves and retains the entered record after a connection failure', async () => {
  listRecentNames.mockResolvedValue([])
  let rejectSave!: (error: Error) => void
  saveVisit.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject }))
    .mockResolvedValueOnce({})
  const onSaved = vi.fn()
  render(<VisitSheet dateKey="2026-10-19" existing={null} onSaved={onSaved} onClose={vi.fn()} />)
  const name = screen.getByLabelText('Patient name') as HTMLInputElement
  fireEvent.change(name, { target: { value: 'Unsaved patient' } })
  fireEvent.click(screen.getByRole('button', { name: '5,000' }))
  const save = screen.getByRole('button', { name: 'Save record' })
  const form = save.closest('form')!
  fireEvent.click(save)
  expect(name.closest('fieldset')?.disabled).toBe(true)
  fireEvent.submit(form)
  expect(saveVisit).toHaveBeenCalledOnce()
  rejectSave(new Error('Connection failed'))
  await screen.findByRole('alert')
  expect(name.value).toBe('Unsaved patient')
  expect(name.closest('fieldset')?.disabled).toBe(false)
  expect(onSaved).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith('saved'))
})

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
