import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import Welcome from './Welcome'
import { WizardProvider } from '../../state/wizard'

// The dashboard query reports an existing farm only when the backend has data.
const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../../api/client', () => ({
  api: { get: mocks.get },
}))

function renderWelcome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <WizardProvider>
        <MemoryRouter initialEntries={['/welcome']}>
          <Welcome />
        </MemoryRouter>
      </WizardProvider>
    </QueryClientProvider>,
  )
}

describe('Welcome', () => {
  beforeEach(() => {
    cleanup()
    mocks.get.mockReset()
  })

  it('shows the value proposition and the primary action', async () => {
    mocks.get.mockResolvedValue([])
    renderWelcome()
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Earth data/)
    const cta = screen.getByRole('link', { name: /Analyze my field/ })
    expect(cta).toHaveAttribute('href', '/fields/new')
    expect(screen.queryByRole('link', { name: /Continue my farm/ })).toBeNull()
  })

  it('offers returning users a way back to their farm (T20 entry)', async () => {
    mocks.get.mockResolvedValue([{ field_id: 'f1' }])
    renderWelcome()
    expect(await screen.findByRole('link', { name: /Continue my farm/ })).toHaveAttribute('href', '/home')
  })

  it('shows the no-account notice and NASA attribution', async () => {
    mocks.get.mockResolvedValue([])
    renderWelcome()
    expect(await screen.findByText(/No account needed/)).toBeInTheDocument()
    expect(screen.getByText(/consult a local agronomist/)).toBeInTheDocument()
  })
})
