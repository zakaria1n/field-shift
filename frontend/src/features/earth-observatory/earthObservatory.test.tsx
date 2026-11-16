import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import EarthObservatoryPage from './EarthObservatoryPage'
import { WizardProvider } from '../../state/wizard'
import {
  countryFromDisplayName,
  isBoundaryPolygon,
  leafletZoomForGlobeZoom,
  polygonAreaHa,
  simplifyBoundaryGeometry,
  webglSupported,
} from './utils/observatoryMath'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../../api/client', () => ({
  api: { get: mocks.get, post: vi.fn() },
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <WizardProvider>
        <MemoryRouter initialEntries={['/fields/new']}>
          <EarthObservatoryPage />
        </MemoryRouter>
      </WizardProvider>
    </QueryClientProvider>,
  )
}

describe('observatoryMath', () => {
  it('extracts the country from the trailing display-name segment', () => {
    expect(countryFromDisplayName('Taroudant, Morocco')).toBe('Morocco')
    expect(countryFromDisplayName('Paris, Île-de-France, France')).toBe('France')
    expect(countryFromDisplayName('Atacama')).toBe('Atacama')
  })

  it('maps the globe arrival zoom onto the drawing map at matching scale', () => {
    expect(leafletZoomForGlobeZoom(12.6)).toBe(12.5)
    expect(leafletZoomForGlobeZoom(3)).toBe(12.5)
    expect(leafletZoomForGlobeZoom(20)).toBe(14)
  })

  it('computes the hectare area of a WGS84 polygon', () => {
    // ~1°×1° square near the equator ≈ 12,321 km² ≈ 1.2321 M ha
    const square = {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    }
    const ha = polygonAreaHa(square)
    expect(ha).not.toBeNull()
    expect(ha!).toBeGreaterThan(1_150_000)
    expect(ha!).toBeLessThan(1_320_000)
    expect(polygonAreaHa({ type: 'Polygon', coordinates: 'bad' as unknown as never })).toBeNull()
  })

  it('keeps polygon boundaries and rejects other geometry kinds', () => {
    const polygon = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }
    expect(isBoundaryPolygon(simplifyBoundaryGeometry(polygon))).toBe(true)
    expect(isBoundaryPolygon(simplifyBoundaryGeometry({ type: 'Point', coordinates: [1, 2] }))).toBe(false)
    expect(isBoundaryPolygon(simplifyBoundaryGeometry(null))).toBe(false)
  })

  it('reports WebGL support accurately for the globe fallback', () => {
    // jsdom has no WebGL context: the page must fall back to the flat map.
    expect(webglSupported()).toBe(false)
  })
})

describe('EarthObservatoryPage', () => {
  beforeEach(() => {
    cleanup()
    mocks.get.mockReset()
    mocks.get.mockResolvedValue({ results: [] })
  })

  it('renders the canonical top bar with search and language controls', async () => {
    renderPage()
    expect(await screen.findByPlaceholderText(/Search a country, city or place/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'العربية' })).toBeInTheDocument()
    // navbar crosshair + toolbar locate shortcut both offer geolocation
    expect(screen.getAllByLabelText(/Use my location/i).length).toBeGreaterThanOrEqual(1)
  })

  it('falls back to the drawing map with its guidance when WebGL is unavailable', async () => {
    renderPage()
    // jsdom has no WebGL, so the page opens directly on the drawing map.
    expect(await screen.findByTestId('drawing-hint')).toHaveTextContent(/Trace your field boundary/i)
    expect(screen.getByRole('button', { name: /Draw field boundary/i })).toBeInTheDocument()
    // the confirmation card only appears once a boundary is actually drawn
    expect(screen.queryByTestId('field-confirmation')).not.toBeInTheDocument()
  })
})
