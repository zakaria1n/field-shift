import { describe, expect, it } from 'vitest'

import { boundsOfGeometry, buildTracePlan, easeInOutCubic, flattenRings, zoomToFitBounds } from './globe/geometryTrace'
import { focusCountryGeometryNearPoint, normalizeRows } from './globe/boundaryData'
import { buildGpsJourney, buildSearchJourney } from './globe/journeyPlan'

describe('nominatim response normalization', () => {
  it('wraps the single reverse-geocode object so the GPS flow can read it', () => {
    const reverse = { display_name: 'Chefchaouen', address: { country: 'Morocco', country_code: 'ma' }, geojson: { type: 'Polygon', coordinates: [] } }
    const rows = normalizeRows(reverse)
    expect(rows).toHaveLength(1)
    expect(rows[0].address?.country).toBe('Morocco')
  })

  it('keeps search arrays as-is and drops unusable payloads', () => {
    expect(normalizeRows([{ display_name: 'a' }, { display_name: 'b' }])).toHaveLength(2)
    expect(normalizeRows(null)).toHaveLength(0)
    expect(normalizeRows('text')).toHaveLength(0)
    expect(normalizeRows({ error: 'Unable to geocode' })).toHaveLength(1)
  })

  it('frames the country region containing the search place and nearby islands', () => {
    const country = {
      type: 'MultiPolygon',
      coordinates: [
        [[[-5, 42], [8, 42], [8, 51], [-5, 51], [-5, 42]]],
        [[[8.3, 41.2], [9.6, 41.2], [9.6, 43.2], [8.3, 43.2], [8.3, 41.2]]],
        [[[-54, 2], [-51, 2], [-51, 6], [-54, 6], [-54, 2]]],
      ],
    }
    const focused = focusCountryGeometryNearPoint(country, 48.86, 2.32) as typeof country
    expect(focused.coordinates).toHaveLength(2)
    expect(focused.coordinates).toContain(country.coordinates[0])
    expect(focused.coordinates).toContain(country.coordinates[1])
    expect(country.coordinates).toHaveLength(3)
  })

  it('handles country rings with more vertices than the JS argument limit', () => {
    const ring: number[][] = Array.from({ length: 130_000 }, (_, index) => {
      const angle = (index / 129_999) * Math.PI * 2
      return [Math.cos(angle), Math.sin(angle)]
    })
    ring[ring.length - 1] = ring[0]
    const geometry = { type: 'MultiPolygon', coordinates: [[ring]] }

    expect(() => focusCountryGeometryNearPoint(geometry, 0, 0)).not.toThrow()
  })
})

const SQUARE = {
  type: 'Polygon',
  coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
}

describe('geometryTrace', () => {
  it('flattens polygon and multipolygon rings in order', () => {
    expect(flattenRings(SQUARE)).toHaveLength(1)
    const multi = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        [[[5, 5], [6, 5], [6, 6], [5, 5]]],
      ],
    }
    expect(flattenRings(multi)).toHaveLength(2)
    expect(flattenRings(null)).toHaveLength(0)
    expect(flattenRings({ type: 'Point', coordinates: [0, 0] })).toHaveLength(0)
  })

  it('builds progressive frames with a head track anchored to real coordinates', () => {
    const plan = buildTracePlan(SQUARE, 44)
    expect(plan).not.toBeNull()
    expect(plan!.frames).toHaveLength(45)
    expect(plan!.headTrack).toHaveLength(45)
    // the trace starts at the first vertex and ends at the closed ring tip
    expect(plan!.headTrack[0]).toEqual([0, 0])
    expect(plan!.headTrack[44]).toEqual([0, 0])
    // halfway around the perimeter (8 units total) the head sits at (2, 2)
    const mid = plan!.headTrack[22]
    expect(mid[0]).toBeCloseTo(2, 5)
    expect(mid[1]).toBeCloseTo(2, 5)
    // the final frame contains the complete outline
    expect(plan!.frames[44].features).toHaveLength(1)
    const finalLine = plan!.frames[44].features[0].geometry as GeoJSON.LineString
    expect(finalLine.coordinates.length).toBeGreaterThanOrEqual(4)
    // frames grow monotonically
    for (let k = 1; k <= 44; k++) {
      const prev = (plan!.frames[k - 1].features[0]?.geometry as GeoJSON.LineString | undefined)?.coordinates.length ?? 0
      const curr = (plan!.frames[k].features[0]?.geometry as GeoJSON.LineString | undefined)?.coordinates.length ?? 0
      expect(curr).toBeGreaterThanOrEqual(prev)
    }
  })

  it('rejects geometries that cannot be traced', () => {
    expect(buildTracePlan(null)).toBeNull()
    expect(buildTracePlan({ type: 'Polygon', coordinates: [[[0, 0], [1, 1]]] })).toBeNull()
  })

  it('frames a country from its real bounds at the first country zoom', () => {
    const bounds = boundsOfGeometry(SQUARE)
    expect(bounds).toEqual([0, 0, 2, 2])
    const zoom = zoomToFitBounds(0, 0, 2, 2, 1366, 768)
    // the 2° test square fits comfortably; tiny countries cap, huge ones floor
    expect(zoom).toBeGreaterThan(2.2)
    expect(zoom).toBeLessThanOrEqual(6.4)
    expect(zoomToFitBounds(-170, -80, 170, 80, 1366, 768)).toBeLessThan(3)
    expect(zoomToFitBounds(0, 0, 0.01, 0.01, 1366, 768)).toBeCloseTo(6.4, 5)
    expect(boundsOfGeometry(null)).toBeNull()
  })

  it('uses the smallest longitude interval for a country crossing the antimeridian', () => {
    const datelineCountry = {
      type: 'MultiPolygon',
      coordinates: [
        [[[170, -10], [179, -10], [179, 10], [170, 10], [170, -10]]],
        [[[-179, -8], [-170, -8], [-170, 8], [-179, 8], [-179, -8]]],
      ],
    }
    expect(boundsOfGeometry(datelineCountry)).toEqual([170, -10, 190, 10])
  })

  it('eases with a symmetric in-out curve', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10)
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25)
    expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75)
  })
})

describe('journeyPlan', () => {
  const squarePlan = buildTracePlan(SQUARE, 10)!

  it('never invents a city stage for a country-only selection', () => {
    const stages = buildSearchJourney({
      isCountryLevel: true,
      country: { name: 'France', geometry: SQUARE, lat: 46.6, lon: 2.4 },
      selected: { name: 'France', geometry: SQUARE, lat: 46.6, lon: 2.4 },
      selectedPlace: { lat: 46.6, lon: 2.4 },
      countryPlan: squarePlan,
      selectedPlan: squarePlan,
      reducedMotion: false,
      viewport: { width: 1366, height: 768 },
    })
    expect(stages.filter((s) => s.kind === 'fly')).toHaveLength(2) // approach + final arrive
    expect(stages.some((s) => s.kind === 'marker')).toBe(false)
    const zooms = stages.filter((s) => s.kind === 'fly').map((s) => (s as { zoom: number }).zoom)
    expect(zooms[0]).toBeLessThan(6.5)
    expect(zooms[1]).toBeGreaterThan(12)
  })

  it('draws country then city for a city selection', () => {
    const stages = buildSearchJourney({
      isCountryLevel: false,
      country: { name: 'Morocco', geometry: SQUARE, lat: 31.7, lon: -7.1 },
      selected: { name: 'Taroudant', geometry: SQUARE, lat: 30.47, lon: -8.87 },
      selectedPlace: { lat: 30.47, lon: -8.87 },
      countryPlan: squarePlan,
      selectedPlan: squarePlan,
      reducedMotion: false,
      viewport: { width: 1366, height: 768 },
    })
    const kinds = stages.map((s) => s.kind)
    expect(kinds).toEqual(['fly', 'trace', 'dimTrace', 'fly', 'trace', 'fadeTrace', 'fly'])
    expect(stages[0]).toMatchObject({ kind: 'fly', countryBounds: [0, 0, 2, 2] })
    expect(stages[1].kind).toBe('trace')
    expect(stages[3]).toMatchObject({ kind: 'fly', lat: 30.47, lon: -8.87, zoom: 9.8 })
    expect(stages.some((s) => s.kind === 'marker')).toBe(false)
  })

  it('falls back to a precise marker when the city boundary is missing', () => {
    const stages = buildSearchJourney({
      isCountryLevel: false,
      country: { name: 'Morocco', geometry: SQUARE, lat: 31.7, lon: -7.1 },
      selected: null,
      selectedPlace: { lat: 30.47, lon: -8.87 },
      countryPlan: squarePlan,
      selectedPlan: null,
      reducedMotion: false,
      viewport: { width: 1366, height: 768 },
    })
    expect(stages.some((s) => s.kind === 'marker')).toBe(true)
    expect(stages.some((s) => s.kind === 'trace' && (s as { plan?: unknown }).plan === squarePlan)).toBe(true)
  })

  it('keeps the GPS journey centered on the real coordinates', () => {
    const bare = buildGpsJourney({
      gps: { lat: 35.1, lon: -5.2 },
      country: null,
      local: null,
      countryPlan: null,
      localPlan: null,
      reducedMotion: false,
      viewport: { width: 1366, height: 768 },
    })
    // no boundaries available: still a staged approach (country view → GPS)
    expect(bare.map((s) => s.kind)).toEqual(['fly', 'fly', 'marker'])
    const zooms = bare.filter((s) => s.kind === 'fly').map((s) => (s as { zoom: number }).zoom)
    expect(zooms[0]).toBeLessThan(5)
    expect(zooms[1]).toBeGreaterThan(12)
    const gpsFly = bare[1] as { lat: number; lon: number }
    expect(gpsFly.lat).toBe(35.1)
    expect(gpsFly.lon).toBe(-5.2)

    const full = buildGpsJourney({
      gps: { lat: 35.1, lon: -5.2 },
      country: { name: 'Morocco', geometry: SQUARE, lat: 31.7, lon: -7.1 },
      local: { name: 'Chefchaouen', geometry: SQUARE, lat: 35.17, lon: -5.26 },
      countryPlan: squarePlan,
      localPlan: squarePlan,
      reducedMotion: false,
      viewport: { width: 1366, height: 768 },
    })
    expect(full.map((s) => s.kind)).toEqual(['fly', 'trace', 'dimTrace', 'fly', 'trace', 'fadeTrace', 'fly', 'marker'])
  })
})
