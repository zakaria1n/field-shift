import type { RotationOut } from '../../../api/client'

/** Translate structured result fields; comparison_basis is a diagnostic fingerprint. */
export function yieldCoverage(plan: RotationOut, ar: boolean): string | null {
  const coverage = plan.score.yield_reference_coverage
  if (!coverage || !Number.isFinite(coverage.known) || !Number.isFinite(coverage.total) || coverage.total <= 0) return null
  const { known, total } = coverage
  if (known <= 0) return ar ? `لا تتوفر مراجع الإنتاج للمحاصيل ${total} في هذه الدورة.` : `Yield references are unavailable for the ${total} crops in this rotation.`
  if (known < total) return ar ? `تتوفر مراجع الإنتاج لـ ${known} من أصل ${total} محاصيل؛ لذلك يعتمد تقييم الإنتاج على بيانات جزئية.` : `Yield references are available for ${known} of ${total} crops; the yield assessment uses partial data.`
  return ar ? `تتوفر مراجع الإنتاج لجميع المحاصيل ${total} في هذه الدورة.` : `Yield references are available for all ${total} crops in this rotation.`
}

export function missingInformation(key: string, ar: boolean): string {
  const labels: Record<string, [string, string]> = {
    soil_ph_estimate: ['Soil pH estimate', 'تقدير درجة حموضة التربة'],
    yield_reference_gaez: ['Yield reference', 'مرجع الإنتاج'],
    climate_observation: ['Climate observations', 'بيانات المناخ'],
    crop_history_full_coverage: ['Complete crop history', 'سجل المحاصيل الكامل'],
  }
  const label = labels[key]
  return label ? label[ar ? 1 : 0] : (ar ? 'معلومات إضافية' : 'Additional information')
}

export function sourceName(key: string, ar: boolean): string {
  const labels: Record<string, string> = { nasa_power: 'NASA POWER', soilgrids: 'SoilGrids', gaez_v5: 'FAO GAEZ' }
  return labels[key] ?? (ar ? 'مصدر آخر' : 'Other source')
}

export function readableEvidenceNotes(plan: RotationOut, ar: boolean): string[] {
  const evidence = plan.evidence as RotationOut['evidence'] & { notes_en?: string[]; notes_ar?: string[] }
  const notes = (ar ? evidence.notes_ar : evidence.notes_en) ?? evidence.notes ?? []
  return notes.filter(note => typeof note === 'string' && !/[{}\[\]_]|\b(?:traceback|exception|weights|known|total)\s*[:=]/i.test(note) && (ar ? /[\u0600-\u06ff]/.test(note) : !/[\u0600-\u06ff]/.test(note)))
}
