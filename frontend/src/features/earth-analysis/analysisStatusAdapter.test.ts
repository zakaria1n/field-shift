import { describe, expect, it } from 'vitest'

import { deriveStages, PREVIEW_FIXTURES } from './analysisStatusAdapter'

describe('Earth Analysis stage status mapping', () => {
  it('keeps the active backend stage distinct from pending stages', () => {
    const stages = deriveStages(PREVIEW_FIXTURES.running)
    expect(stages.map((stage) => stage.status)).toEqual([
      'complete', 'running', 'pending', 'pending', 'pending', 'pending',
    ])
  })

  it('shows an unavailable provider as unavailable even if its stage completed partially', () => {
    const stages = deriveStages(PREVIEW_FIXTURES.partial)
    expect(stages.find((stage) => stage.key === 'soil')).toMatchObject({
      status: 'unavailable',
      sourceNote: 'source_unavailable',
    })
  })

  it('does not claim provider success when the backend has no matching source record', () => {
    const job = {
      ...PREVIEW_FIXTURES.complete,
      sources: [],
    }
    const climate = deriveStages(job).find((stage) => stage.key === 'climate')
    expect(climate).toMatchObject({ status: 'partial', sourceNote: 'source_unverified' })
  })

  it('keeps a retrieved SoilGrids cache successful and identifies its origin', () => {
    const job = {
      ...PREVIEW_FIXTURES.complete,
      sources: PREVIEW_FIXTURES.complete.sources.map((source) =>
        source.source_id === 'soilgrids' ? { ...source, status: 'cached' as const } : source,
      ),
    }
    expect(deriveStages(job).find((stage) => stage.key === 'soil')).toMatchObject({
      status: 'complete', sourceNote: 'source_cached',
    })
  })

  it.each([[4, false], [5, true], [8, false]])('keeps coverage truthful while emphasizing %s resolved references', (known, green) => {
    const job = {
      ...PREVIEW_FIXTURES.complete,
      stages: PREVIEW_FIXTURES.complete.stages.map(stage => stage.key === 'yield_reference'
        ? { ...stage, status: 'complete' as const, detail: `${known}/8 crops matched to GAEZ v5 layers` } : stage),
      sources: PREVIEW_FIXTURES.complete.sources.map(source => source.source_id === 'gaez_v5'
        ? { ...source, status: 'live' as const } : source),
    }
    const result = deriveStages(job).find(stage => stage.key === 'yield_reference')!
    expect(result.status).toBe(known === 8 ? 'complete' : 'partial')
    expect(result.goodCoverage).toBe(green)
  })
})
