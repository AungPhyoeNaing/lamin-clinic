// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AppProviders } from './providers'
import { createLocalRepository } from '../data/local'
import { formatDayShortEn, todayKey } from '../lib/format'

vi.mock('../data/supabase-config', () => ({ readSupabaseConfig: () => null }))

beforeEach(() => { window.history.replaceState({}, '', '/') })

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})

describe('App (local mode)', () => {
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
