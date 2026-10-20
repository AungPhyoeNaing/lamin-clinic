// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ComposerScreen from './ComposerScreen'

const repo = vi.hoisted(() => ({ create: vi.fn(), uploadMedia: vi.fn(), removeMedia: vi.fn(), get: vi.fn() }))
vi.mock('../../app/providers', () => ({
  useArticleRepository: () => repo,
  useAuth: () => ({ user: { email: 'staff@example.com' }, mode: 'supabase' }),
  useSettings: () => ({ lang: 'en' }),
}))
vi.mock('./prepare-media', () => ({ prepareMedia: async (file: File) => ({ file }) }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  repo.uploadMedia.mockResolvedValue({ path: 'image.webp', url: 'https://project.supabase.co/storage/image.webp', kind: 'image', alt: '' })
  repo.create.mockRejectedValue(new Error('Network failed'))
  repo.removeMedia.mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks() })

describe('publishing failure recovery', () => {
  it('cleans uploaded media and keeps the text draft when publishing fails', async () => {
    const { container } = render(<MemoryRouter><ComposerScreen /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/Article title/), { target: { value: 'Test article' } })
    fireEvent.change(screen.getByLabelText(/Article content/), { target: { value: 'Test content' } })
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['image'], 'image.png', { type: 'image/png' })] } })
    fireEvent.change(screen.getByLabelText('Image description'), { target: { value: 'A leaf' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publish post' }))
    await waitFor(() => expect(repo.removeMedia).toHaveBeenCalledWith([expect.objectContaining({ path: 'image.webp' })]))
    expect(repo.create).toHaveBeenCalledOnce()
    expect((await screen.findByRole('alert')).textContent).toContain('Network failed')
    expect((screen.getByLabelText(/Article title/) as HTMLInputElement).value).toBe('Test article')
    expect(sessionStorage.getItem('lamin.postDraft.new')).toContain('Test article')
  })
  it('rejects unsupported files before any upload starts', () => {
    const { container } = render(<MemoryRouter><ComposerScreen /></MemoryRouter>)
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['html'], 'page.html', { type: 'text/html' })] } })
    expect(screen.getByRole('alert').textContent).toContain('JPG')
    expect(repo.uploadMedia).not.toHaveBeenCalled()
  })
})
