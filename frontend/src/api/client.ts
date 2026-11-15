import { getAccessKey } from '../state/accessKey'

export class ApiError extends Error {
  code: string
  status: number
  details: Record<string, unknown>

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.code = code
    this.details = details ?? {}
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-FieldShift-Access-Key': getAccessKey(),
      ...(options.headers ?? {}),
    },
  })
  if (res.status === 204) return undefined as T
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string; details?: Record<string, unknown> } })?.error
    throw new ApiError(res.status, err?.code ?? 'unknown', err?.message ?? `HTTP ${res.status}`, err?.details)
  }
  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? '{}' : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// ---------------------------------------------------------------- types

export interface FieldOut {
  field_id: string
  name: string
  area_ha: number
  centroid_lat: number
  centroid_lon: number
  bbox: number[]
  geometry_geojson: { type: string; coordinates: unknown }
  created_at: string
  updated_at: string
  has_profile: boolean
  has_active_plan: boolean
}

export interface SlotOut {
  slot_id: string
  year_number: number
  crop_id: string | null
  name_en: string | null
  name_ar: string | null
  rotation_group: string | null
  fallow: boolean
  planting_window: {
    planting_months: [number, number]
    harvest_months: [number, number]
    source: { name: string | null; url: string | null; year: string | null }
  } | null
}

export interface IndicatorOut {
  key: string
  label_en: string
  label_ar: string
  value: number | null
  status: 'available' | 'unavailable' | 'partial'
  unit_note?: string
  rule_ids: string[]
}

export interface ScoreBreakdown {
  total: number | null
  weights_applied: Record<string, number>
  weight_redistribution_note?: string | null
  indicators: IndicatorOut[]
  yield_reference_coverage?: { known: number; total: number }
  evaluated_dimensions?: string[]
  partial_dimensions?: string[]
  comparison_basis?: string
  data_quality_note?: string
}

export interface RotationOut {
  plan_id: string
  version_id: string | null
  rank: number
  label: string
  status: string
  is_recommended: boolean
  horizon_years: number
  slots: SlotOut[]
  score: ScoreBreakdown
  summary_en: string
  summary_ar: string
  main_limitation_en: string | null
  main_limitation_ar: string | null
  evidence: {
    rule_ids: string[]
    observation_ids: string[]
    source_ids: string[]
    notes: string[]
    missing_information: string[]
  }
}

export interface RotationListOut {
  field_id: string
  analysis_id: string
  rotations: RotationOut[]
  insufficient_data_note: string | null
  current_practice_note: string | null
}

export interface StageOut { key: string; status: string; detail: string | null }
export interface SourceOut { source_id: string; status: string; detail: string | null; fetched_at: string | null; data_period: string | null }
export interface AnalysisJobOut {
  job_id: string
  field_id: string
  status: 'queued' | 'running' | 'complete' | 'partial' | 'failed'
  stages: StageOut[]
  sources: SourceOut[]
  error: { message: string; code: string } | null
  started_at: string | null
  finished_at: string | null
}

export interface SubstituteCandidate {
  crop_id: string
  name_en: string
  name_ar: string
  rotation_group: string | null
  why_available: string[]
  similar_impact: boolean
  similarity_note: string | null
}

export interface ComparisonRow {
  indicator: string
  label_en: string
  label_ar: string
  original_value: number | null
  modified_value: number | null
  delta: number | null
  status: 'changed' | 'unchanged' | 'unknown'
  note_en: string | null
  note_ar: string | null
}

export interface EvaluationOut {
  feasibility: 'feasible' | 'needs_review' | 'infeasible'
  conflicts: { rule_id: string; severity: string; message_en: string; message_ar: string; slot_ids: string[] }[]
  modified_score: ScoreBreakdown
  comparison: ComparisonRow[]
  sequence_after: SlotOut[]
  sequence_before: SlotOut[]
}

export interface AdoptedPlan {
  plan_id: string
  version_id: string
  field_id: string
  label: string
  status: string
  horizon_years: number
  slots: SlotOut[]
  score: ScoreBreakdown
  adopted_at: string
}

export interface ObservationOut {
  indicator: string
  value: number | null
  unit: string | null
  source_id: string
  source_layer: string | null
  period_start: string | null
  period_end: string | null
  spatial_support: string | null
  quality_status: string
  meta: Record<string, unknown>
}

export interface InsightsOut {
  field_id: string
  last_analysis_id: string | null
  last_analysis_at: string | null
  climate: ObservationOut[]
  soil: ObservationOut[]
  suitability: ObservationOut[]
  limitations: string[]
}

export interface CropOut {
  crop_id: string
  name_en: string
  name_ar: string
  scientific_name: string | null
  rotation_group: string | null
  agronomic_review_status: string | null
  calendar_status: string | null
  fixes_nitrogen: boolean | null
  animal_feed: string | null
}

export interface DashboardItem {
  field_id: string
  field_name: string
  area_ha: number
  active_plan: AdoptedPlan | null
  last_analysis: { analysis_id: string; status: string; finished_at: string | null; created_at: string } | null
  profile_summary: { irrigation_type: string; purposes: string[]; priorities: Record<string, number> } | null
}

export interface PlaceResult { display_name: string; lat: number; lon: number; type: string | null }
