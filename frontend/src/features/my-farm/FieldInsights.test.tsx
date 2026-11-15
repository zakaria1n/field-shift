import { beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FieldInsights from './FieldInsights'
import '../../i18n'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('../../api/client', () => ({ api: mocks }))

beforeEach(() => {
  cleanup()
  mocks.get.mockReset().mockResolvedValue({ climate: [], soil: [], limitations: [] })
  mocks.post.mockReset()
})

function showInsights() {
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
    <MemoryRouter initialEntries={['/fields/f1/insights']}>
      <Routes>
        <Route path="/fields/:fieldId/insights" element={<FieldInsights />} />
        <Route path="/analyses/:jobId/progress" element={<p>New analysis progress</p>} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>)
}

test('an unavailable stored soil result can start a fresh analysis with saved settings', async () => {
  mocks.post.mockResolvedValue({job_id:'new-job'})
  showInsights()
  fireEvent.click(await screen.findByRole('button',{name:'Update field analysis'}))
  expect(await screen.findByText('New analysis progress')).toBeInTheDocument()
  expect(mocks.post).toHaveBeenCalledWith('/api/v1/fields/f1/analyses',{})
})

test('a rejected refresh remains visible and permits retry without fabricating observations', async () => {
  mocks.post.mockRejectedValue(new Error('Land/water source temporarily unavailable'))
  showInsights()
  fireEvent.click(await screen.findByRole('button',{name:'Update field analysis'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('Land/water source temporarily unavailable')
  expect(screen.getByRole('button',{name:'Update field analysis'})).toBeEnabled()
  expect(screen.getByText(/Properties available: 0\/6/)).toBeInTheDocument()
})
