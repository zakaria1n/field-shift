import { useEffect, useState } from 'react'
import { api, ApiError } from '../../api/client'

export interface GeographicValidation {
  status: string
  can_proceed: boolean
  agricultural_status: string
  source_status: string
  source_id: string
  detail: string
  fetched_at?: string
}

export function fieldValidationMessage(validation?: GeographicValidation, error?: string) {
  if (validation?.status === 'LAND_USE_UNCERTAIN') {
    if (validation.can_proceed) return 'LAND_COVER_REQUIRES_REVIEW'
    return validation.source_status === 'unavailable' ? 'LAND_WATER_UNAVAILABLE' : 'LAND_WATER_INCOMPLETE'
  }
  return validation?.status ?? error ?? 'INVALID_GEOMETRY'
}

/** Ignore stale responses when the farmer moves/removes a boundary. */
export function useFieldValidation(geometry: object | null) {
  const [result, setResult] = useState<{ key: string; validation?: GeographicValidation; error?: string }>({ key: '' })
  const [attempt, setAttempt] = useState(0)
  const key = geometry ? JSON.stringify(geometry) : ''
  useEffect(() => {
    if (!key) return
    let current = true
    const timer = setTimeout(() => {
      api.post<{ geographic_validation: GeographicValidation }>('/api/v1/fields/validate', { geometry: JSON.parse(key) })
        .then(data => { if (current) setResult({ key, validation: data.geographic_validation }) })
        .catch((error: unknown) => {
          const apiError = error instanceof ApiError ? error : undefined
          const message = !apiError ? 'VALIDATION_CONNECTION_ERROR'
            : [404, 405].includes(apiError.status) ? 'BACKEND_OUTDATED'
            : apiError.status === 422 ? 'INVALID_GEOMETRY' : 'VALIDATION_SERVICE_ERROR'
          if (current) setResult({ key, validation: apiError?.details?.geographic_validation as GeographicValidation | undefined, error: message })
        })
    }, 450)
    return () => { current = false; clearTimeout(timer) }
  }, [key, attempt])
  const pending = Boolean(key && key !== result.key)
  return { pending, validation: result.key === key ? result.validation : undefined,
    error: result.key === key ? result.error : undefined,
    messageKey: fieldValidationMessage(result.key === key ? result.validation : undefined, result.key === key ? result.error : undefined),
    canProceed: Boolean(key && key === result.key && result.validation?.can_proceed),
    retry: () => { setResult({ key: '' }); setAttempt(value => value + 1) } }
}
