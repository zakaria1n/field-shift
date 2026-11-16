import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2, Info, Loader2 } from 'lucide-react'

import type { GeographicValidation } from '../../field-map/useFieldValidation'
import { fieldValidationMessage } from '../../field-map/useFieldValidation'

/** Canonical right-side confirmation card (07_Confirm_Field.png): name,
 * computed area, validation state and the CTA wired to the backend flow. */
export default function FieldConfirmation({
  name,
  onNameChange,
  areaHa,
  validation,
  validationPending,
  validationMessageKey,
  onValidationRetry,
  error,
  saving,
  canConfirm,
  onConfirm,
}: {
  name: string
  onNameChange: (value: string) => void
  areaHa: number | null
  validation?: GeographicValidation
  validationPending: boolean
  validationMessageKey: string
  onValidationRetry: () => void
  error: string | null
  saving: boolean
  canConfirm: boolean
  onConfirm: () => void
}) {
  const { t, i18n } = useTranslation()
  const showValidation = areaHa !== null && !canConfirm

  return (
    <aside className="pointer-events-auto absolute end-4 top-24 z-30 w-[min(92vw,340px)]" data-testid="field-confirmation">
      <div className="rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf">
            <CheckCircle2 size={20} className="text-white" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold leading-tight text-[#17352D]">{t('obs.confirm.title')}</h2>
            <p className="text-xs text-[#4A6359]">{t('obs.confirm.subtitle')}</p>
          </div>
        </div>

        <label className="mt-4 block text-xs font-bold text-[#4A6359]" htmlFor="observatory-field-name">
          {t('field.name')}
        </label>
        <input
          id="observatory-field-name"
          className="mt-1 w-full rounded-xl border border-[#DFE8E1] bg-white px-3 py-2.5 text-sm font-semibold text-[#17352D] outline-none transition-colors focus:border-leaf"
          placeholder={t('field.defaultName')}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />

        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#EAF7E4] px-4 py-3">
          <svg viewBox="0 0 24 24" className="h-9 w-9 shrink-0" fill="none" aria-hidden="true">
            <path d="M5 7 L15 4 L20 10 L16 18 L7 16 Z" stroke="#65A30D" strokeWidth="1.6" strokeDasharray="4 3" strokeLinejoin="round" />
          </svg>
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-[#4A6359]">{t('field.area')}</p>
            <p className="text-xl font-extrabold text-[#17352D]">
              {areaHa === null ? '—' : areaHa.toLocaleString(i18n.language)}
              <span className="ms-1 text-sm font-bold text-[#4A6359]">{t('common.hectare')}</span>
            </p>
          </div>
        </div>

        {showValidation && (
          <div role="status" aria-live="polite" data-testid="field-validation" className="mt-3 rounded-xl border border-amber/40 bg-amber-soft p-3 text-xs text-[#17352D]">
            <span className="inline-flex items-center gap-2">
              {validationPending && <Loader2 size={13} className="animate-spin text-amber-dark" />}
              {validationPending
                ? t('field.validation.checking')
                : t(`field.validation.${validationMessageKey}`, { defaultValue: validationMessageKey })}
            </span>
            {!validationPending && !validation?.can_proceed && (
              <button type="button" className="mt-2 rounded-full border border-amber/50 px-3 py-1 text-xs font-bold text-amber-dark hover:bg-amber/10" onClick={onValidationRetry}>
                {t('common.retry')}
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600">{error}</p>
        )}

        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#A3E635] py-3 text-sm font-extrabold text-[#17352D] shadow-lg transition-all hover:bg-[#B5F05B] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canConfirm || saving}
          onClick={onConfirm}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {t('obs.confirm.cta')}
          <ArrowRight size={16} className="rtl:rotate-180" />
        </button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#4A6359]">
          <Info size={12} className="shrink-0" />
          {t('obs.confirm.note')}
        </p>
      </div>
    </aside>
  )
}
