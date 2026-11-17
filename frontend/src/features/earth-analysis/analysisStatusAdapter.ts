import type { AnalysisJobOut } from '../../api/client'

/** Maps the REAL backend job payload (stages + sources) onto the six UI
 * stages. No stage is ever marked complete/unavailable without a matching
 * backend signal. */

export type StageUiStatus = 'pending' | 'running' | 'complete' | 'partial' | 'unavailable' | 'failed'

export interface StageUi {
  key: 'geometry' | 'climate' | 'soil' | 'yield_reference' | 'suitability' | 'rotation'
  status: StageUiStatus
  /** Honest backend detail line, when the worker published one. */
  detail: string | null
  /** Source-level caveat (e.g. SoilGrids unreachable) shown as a note. */
  sourceNote: string | null
}

const STAGE_KEYS: StageUi['key'][] = ['geometry', 'climate', 'soil', 'yield_reference', 'suitability', 'rotation']

/** Source a stage depends on for its data retrieval. */
const STAGE_SOURCE: Partial<Record<StageUi['key'], string>> = {
  climate: 'nasa_power',
  soil: 'soilgrids',
  yield_reference: 'gaez_v5',
}

type SourceState = 'ok' | 'cached' | 'demo' | 'partial' | 'unavailable' | 'failed' | 'pending' | 'unknown'

function sourceState(job: AnalysisJobOut | null, sourceId: string | undefined): SourceState {
  if (!job || !sourceId) return 'unknown'
  const src = job.sources.find((s) => s.source_id === sourceId)
  if (!src) return 'unknown'
  if (src.status === 'unavailable') return 'unavailable'
  if (src.status === 'failed') return 'failed'
  if (src.status === 'missing') return 'partial'
  if (src.status === 'pending' || src.status === 'running') return 'pending'
  if (src.status === 'demo_fixture') return 'demo'
  if (src.status === 'cached') return 'cached'
  if (src.status === 'live' || src.status === 'ok' || src.status === 'complete') return 'ok'
  return 'unknown'
}

export function deriveStages(job: AnalysisJobOut | null): StageUi[] {
  return STAGE_KEYS.map((key) => {
    const stage = job?.stages.find((s) => s.key === key)
    const raw = stage?.status ?? 'pending'
    let status: StageUiStatus = raw === 'complete'
      ? 'complete'
      : raw === 'partial'
        ? 'partial'
        : raw === 'running'
          ? 'running'
          : raw === 'failed'
            ? 'failed'
            : raw === 'skipped'
              ? 'unavailable'
              : 'pending'

    // Honest degraded states: the worker finished, but its data source did not.
    let sourceNote: string | null = null
    const sourceId = STAGE_SOURCE[key]
    if ((status === 'complete' || status === 'partial') && sourceId) {
      const state = sourceState(job, sourceId)
      if (state === 'unavailable' || state === 'failed') {
        status = state
        sourceNote = state === 'failed' ? 'source_failed' : 'source_unavailable'
      } else if (state === 'partial') {
        status = 'partial'
        sourceNote = 'source_partial'
      } else if (state === 'demo') {
        status = 'partial'
        sourceNote = 'source_demo_fixture'
      } else if (state === 'cached') {
        if (key === 'soil') sourceNote = 'source_cached'
      } else if (state === 'pending') {
        status = 'pending'
        sourceNote = 'source_pending'
      } else if (state === 'unknown') {
        status = 'partial'
        sourceNote = 'source_unverified'
      }
    }

    // The backend can resolve some GAEZ layers while leaving others unmapped.
    // Preserve that coverage explicitly instead of presenting the stage as a
    // complete yield dataset lookup.
    if (key === 'yield_reference' && status === 'complete' && stage?.detail) {
      const coverage = stage.detail.match(/(\d+)\s*\/\s*(\d+)/)
      if (coverage && Number(coverage[1]) < Number(coverage[2])) {
        status = 'partial'
        sourceNote = sourceNote ?? 'source_partial'
      }
    }

    return { key, status, detail: stage?.detail ?? null, sourceNote }
  })
}

/** Fraction of stages actually completed — drives the arc reveal only when
 * the backend exposes real per-stage completion. */
export function completedFraction(stages: StageUi[]): number {
  const done = stages.filter((s) => s.status === 'complete' || s.status === 'partial' || s.status === 'unavailable').length
  return stages.length ? done / stages.length : 0
}

export function isTerminalJob(job: AnalysisJobOut | null): boolean {
  return Boolean(job && ['complete', 'partial', 'failed'].includes(job.status))
}

/** DEV PREVIEW FIXTURES — synthetic payloads for the visual preview route.
 * Clearly labelled in the UI as test fixtures; never sent to the backend and
 * never shown as genuine analysis in normal operation. */
export type PreviewState = 'pending' | 'running' | 'partial' | 'complete' | 'failed'

export const PREVIEW_FIXTURES: Record<PreviewState, AnalysisJobOut> = {
  pending: {
    job_id: 'preview', field_id: 'preview', status: 'queued', error: null,
    started_at: null, finished_at: null,
    stages: STAGE_KEYS.map((key) => ({ key, status: 'pending', detail: null })),
    sources: [],
  },
  running: {
    job_id: 'preview', field_id: 'preview', status: 'running', error: null,
    started_at: null, finished_at: null,
    stages: [
      { key: 'geometry', status: 'complete', detail: 'Preview fixture — geometry validated' },
      { key: 'climate', status: 'running', detail: 'Querying NASA POWER 2004–2023 climatology' },
      { key: 'soil', status: 'pending', detail: null },
      { key: 'yield_reference', status: 'pending', detail: null },
      { key: 'suitability', status: 'pending', detail: null },
      { key: 'rotation', status: 'pending', detail: null },
    ],
    sources: [
      { source_id: 'nasa_power', status: 'running', detail: null, fetched_at: null, data_period: null },
      { source_id: 'soilgrids', status: 'pending', detail: null, fetched_at: null, data_period: null },
      { source_id: 'gaez_v5', status: 'pending', detail: null, fetched_at: null, data_period: null },
    ],
  },
  partial: {
    job_id: 'preview', field_id: 'preview', status: 'running', error: null,
    started_at: null, finished_at: null,
    stages: [
      { key: 'geometry', status: 'complete', detail: 'Preview fixture — geometry validated' },
      { key: 'climate', status: 'complete', detail: 'NASA POWER 2004–2023 climatology retrieved' },
      { key: 'soil', status: 'complete', detail: null },
      { key: 'yield_reference', status: 'running', detail: 'GAEZ v5 partial coverage' },
      { key: 'suitability', status: 'pending', detail: null },
      { key: 'rotation', status: 'pending', detail: null },
    ],
    sources: [
      { source_id: 'nasa_power', status: 'ok', detail: null, fetched_at: null, data_period: null },
      { source_id: 'soilgrids', status: 'unavailable', detail: 'Synthetic provider outage for visual status testing', fetched_at: null, data_period: null },
      { source_id: 'gaez_v5', status: 'ok', detail: null, fetched_at: null, data_period: null },
    ],
  },
  complete: {
    job_id: 'preview', field_id: 'preview', status: 'complete', error: null,
    started_at: null, finished_at: null,
    stages: STAGE_KEYS.map((key) => ({
      key,
      status: 'complete',
      detail: key === 'geometry' ? 'Preview fixture — geometry validated' : `${key} retrieved successfully`,
    })),
    sources: [
      { source_id: 'nasa_power', status: 'ok', detail: null, fetched_at: null, data_period: null },
      { source_id: 'soilgrids', status: 'ok', detail: null, fetched_at: null, data_period: null },
      { source_id: 'gaez_v5', status: 'ok', detail: null, fetched_at: null, data_period: null },
    ],
  },
  failed: {
    job_id: 'preview', field_id: 'preview', status: 'failed',
    error: { message: 'NASA POWER request timed out after 30s', code: 'provider_timeout' },
    started_at: null, finished_at: null,
    stages: [
      { key: 'geometry', status: 'complete', detail: 'Preview fixture — geometry validated' },
      { key: 'climate', status: 'failed', detail: 'NASA POWER unreachable' },
      { key: 'soil', status: 'pending', detail: null },
      { key: 'yield_reference', status: 'pending', detail: null },
      { key: 'suitability', status: 'pending', detail: null },
      { key: 'rotation', status: 'pending', detail: null },
    ],
    sources: [],
  },
}
