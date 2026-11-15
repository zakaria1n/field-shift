import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { api, ApiError } from '../../api/client'
import { fieldValidationMessage, useFieldValidation, type GeographicValidation } from './useFieldValidation'
vi.mock('../../api/client', async importOriginal => ({ ...await importOriginal<typeof import('../../api/client')>(), api: { post: vi.fn() } }))
afterEach(() => vi.clearAllMocks())

test('blocks advance for water and permits confirmed land only after the response', async () => {
  vi.mocked(api.post).mockRejectedValueOnce(new ApiError(422,'WATER_AREA','water',{ geographic_validation: {status:'WATER_AREA',can_proceed:false} }))
  const {result}=renderHook(()=>useFieldValidation({type:'Polygon',coordinates:[]}))
  expect(result.current.canProceed).toBe(false)
  await waitFor(()=>expect(result.current.validation?.status).toBe('WATER_AREA'))
  expect(result.current.canProceed).toBe(false)
})

test('stale positive result cannot approve a changed or removed polygon', async () => {
  let finish: (v: unknown) => void = () => {}
  vi.mocked(api.post).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
  const {result,rerender}=renderHook(({geo})=>useFieldValidation(geo),{initialProps:{geo:{a:1} as object|null}})
  await waitFor(()=>expect(api.post).toHaveBeenCalled())
  rerender({geo:null})
  await act(async()=>finish({geographic_validation:{status:'LAND_CONFIRMED',can_proceed:true}}))
  expect(result.current.canProceed).toBe(false)
})

test('network failure is uncertainty, not water or invalid geometry', async () => {
  vi.mocked(api.post).mockRejectedValueOnce(new TypeError('Failed to fetch'))
  const {result}=renderHook(()=>useFieldValidation({a:1}))
  await waitFor(()=>expect(result.current.error).toBe('VALIDATION_CONNECTION_ERROR'))
  expect(result.current.canProceed).toBe(false)
})

test('an old backend is not presented as a land cover classification', async () => {
  vi.mocked(api.post).mockRejectedValueOnce(new ApiError(404, 'unknown', 'Not Found'))
  const {result}=renderHook(()=>useFieldValidation({a:1}))
  await waitFor(()=>expect(result.current.messageKey).toBe('BACKEND_OUTDATED'))
  expect(result.current.canProceed).toBe(false)
})

test('source outage, incomplete coverage and incompatible land are separate messages', () => {
  const base = {status:'LAND_USE_UNCERTAIN',can_proceed:false,source_status:'unavailable'} as GeographicValidation
  expect(fieldValidationMessage(base)).toBe('LAND_WATER_UNAVAILABLE')
  expect(fieldValidationMessage({...base,source_status:'live'})).toBe('LAND_WATER_INCOMPLETE')
  expect(fieldValidationMessage({...base,source_status:'live',can_proceed:true})).toBe('LAND_COVER_REQUIRES_REVIEW')
})
