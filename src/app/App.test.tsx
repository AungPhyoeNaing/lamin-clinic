// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AppProviders } from './providers'
import { createLocalRepository } from '../data/local'
import { addDays, formatDateShort, formatDayShortEn, todayKey } from '../lib/format'

vi.mock('../data/supabase-config', () => ({ readSupabaseConfig: () => null }))

beforeEach(() => { window.history.replaceState({}, '', '/') })

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})

describe('App (local mode)', () => {
  it('keeps a bookmarked record date through sign-in', async () => {
    const date = addDays(todayKey(), -3)
    await createLocalRepository(localStorage).saveVisit({ date, patientName: 'Bookmarked patient', age: null, diagnosis: '', fee: 5000 })
    window.history.replaceState({}, '', `/admin?date=${date}`)
    render(<AppProviders><App /></AppProviders>)
    fireEvent.change(await screen.findByLabelText(/Email/), { target: { value: 'doctor@example.com' } })
    fireEvent.change(screen.getByLabelText(/Password/, { selector: 'input' }), { target: { value: 'local-demo' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }))
    await screen.findByText('Bookmarked patient')
    expect(window.location.search).toBe(`?date=${date}`)
    fireEvent.click(screen.getByRole('button', { name: 'လူနာမှတ်တမ်း ထည့်ရန်' }))
    expect(within(screen.getByRole('dialog')).getByText(formatDateShort(date))).toBeTruthy()
  })
  it('puts daily records first, saves with feedback, and scopes search and date navigation', async () => {
    const repo = createLocalRepository(localStorage)
    const date = todayKey()
    const yesterday = addDays(date, -1)
    await repo.saveVisit({ date: yesterday, patientName: 'Earlier patient', age: null, diagnosis: '', fee: 8000 })
    window.history.replaceState({}, '', '/admin')
    render(<AppProviders><App /></AppProviders>)
    fireEvent.change(await screen.findByLabelText(/Email/), { target: { value: 'doctor@example.com' } })
    fireEvent.change(screen.getByLabelText(/Password/, { selector: 'input' }), { target: { value: 'local-demo' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'လူနာမှတ်တမ်း ထည့်ရန်' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(formatDateShort(date))).toBeTruthy()
    fireEvent.change(within(dialog).getByLabelText(/လူနာအမည်/), { target: { value: 'New patient' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '5,000' }))
    fireEvent.click(within(dialog).getByRole('button', { name: /မှတ်တမ်း သိမ်းရန်/ }))
    await screen.findByText('New patient')
    expect(screen.getByRole('status').textContent).toContain('မှတ်တမ်း သိမ်းပြီးပါပြီ။')
    expect(screen.getByText('အပတ်နှင့် လ အနှစ်ချုပ်').closest('details')?.open).toBe(false)
    expect(screen.queryByRole('region', { name: 'အပတ်စဉ် အနှစ်ချုပ်' })).toBeNull()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Earlier patient' } })
    expect(screen.queryByText('Earlier patient')).toBeNull()
    expect(screen.getByText('ဤနေ့အတွင်း ကိုက်ညီသော မှတ်တမ်း မရှိပါ။')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ယမန်နေ့' }))
    await screen.findByText('Earlier patient')
    expect(window.location.search).toBe(`?date=${yesterday}`)
    expect(screen.getByRole('searchbox')).toHaveProperty('value', '')
    fireEvent.click(screen.getByRole('button', { name: /ယနေ့သို့ ပြန်ရန်/ }))
    await screen.findByText('New patient')
  })
  it('confirms record deletion from the ledger and refreshes daily, weekly, and monthly totals', async () => {
    const repo = createLocalRepository(localStorage)
    const date = todayKey()
    await repo.saveVisit({ date, patientName: 'Delete patient', age: null, diagnosis: '', fee: 10000 })
    await repo.saveVisit({ date, patientName: 'Keep patient', age: null, diagnosis: '', fee: 5000 })
    window.history.replaceState({}, '', '/admin')
    render(<AppProviders><App /></AppProviders>)
    fireEvent.change(await screen.findByLabelText(/Email/), { target: { value: 'doctor@example.com' } })
    fireEvent.change(screen.getByLabelText(/Password/, { selector: 'input' }), { target: { value: 'local-demo' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }))
    await screen.findByText('Delete patient')
    const openDelete = () => fireEvent.click(screen.getByRole('button', { name: /မှတ်တမ်း ဖျက်ရန်: Delete patient/ }))
    openDelete()
    let dialog = screen.getByRole('dialog', { name: 'မှတ်တမ်း ဖျက်ရန်' })
    expect(within(dialog).getByText('Delete patient')).toBeTruthy()
    expect(await repo.listByDate(date)).toHaveLength(2)
    fireEvent.click(within(dialog).getByRole('button', { name: 'ပယ်ဖျက်' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await repo.listByDate(date)).toHaveLength(2)
    openDelete()
    dialog = screen.getByRole('dialog', { name: 'မှတ်တမ်း ဖျက်ရန်' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'သေချာသည် — ဖျက်ပါ' }))
    await waitFor(() => expect(screen.queryByText('Delete patient')).toBeNull())
    expect((await repo.listByDate(date)).map(visit => visit.patientName)).toEqual(['Keep patient'])
    fireEvent.click(screen.getByText('အပတ်နှင့် လ အနှစ်ချုပ်'))
    await within(screen.getByRole('region', { name: 'အပတ်စဉ် အနှစ်ချုပ်' })).findByText('5,000 Ks')
    await within(screen.getByRole('region', { name: 'လစဉ် အနှစ်ချုပ်' })).findByText('5,000 Ks')
    expect(screen.getAllByText('5,000 Ks')).toHaveLength(4)
  })
  it('renders the health feed on the home route', async () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )
    await screen.findAllByText('Health feed')
    expect(screen.queryByRole('link', { name: /Write a post|ဆောင်းပါး ရေးရန်/ })).toBeNull()
  })

  it('requires sign-in when a guest opens the publishing route directly', async () => {
    window.history.replaceState({}, '', '/posts/new')
    render(<AppProviders><App /></AppProviders>)
    await screen.findByRole('button', { name: /Sign in/ })
    expect(window.location.pathname).toBe('/login')
    expect(screen.queryByRole('button', { name: /Publish post/ })).toBeNull()
  })

  it('allows signed-in local staff to publish and read a text article', async () => {
    window.history.replaceState({}, '', '/posts/new')
    render(<AppProviders><App /></AppProviders>)
    fireEvent.change(await screen.findByLabelText(/Email/), { target: { value: 'doctor@example.com' } })
    fireEvent.change(screen.getByLabelText(/Password/, { selector: 'input' }), { target: { value: 'local-demo' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }))
    fireEvent.change(await screen.findByLabelText(/ဆောင်းပါး ခေါင်းစဉ်/), { target: { value: 'A test clinic article' } })
    fireEvent.change(screen.getByLabelText(/ဆောင်းပါး အကြောင်းအရာ/), { target: { value: 'A readable article body.' } })
    fireEvent.click(screen.getByRole('button', { name: 'ဆောင်းပါး တင်ရန်' }))
    await screen.findByRole('heading', { name: 'A test clinic article' })
    expect(window.location.pathname).toMatch(/^\/posts\/(?!new)/)
  })

  it('opens the selected ledger day from the monthly report', async () => {
    const date = todayKey()
    await createLocalRepository(localStorage).saveVisit({ date, patientName: 'Report patient', age: 30, diagnosis: '', fee: 5000 })
    window.history.replaceState({}, '', '/admin/reports')
    render(<AppProviders><App /></AppProviders>)
    fireEvent.change(await screen.findByLabelText(/Email/), { target: { value: 'doctor@example.com' } })
    fireEvent.change(screen.getByLabelText(/Password/, { selector: 'input' }), { target: { value: 'local-demo' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }))
    const row = await screen.findByRole('button', { name: new RegExp(formatDayShortEn(date)) })
    fireEvent.click(row)
    await screen.findByText('Report patient')
    expect(window.location.pathname).toBe('/admin')
    expect(window.location.search).toBe(`?date=${date}`)
  })
})
