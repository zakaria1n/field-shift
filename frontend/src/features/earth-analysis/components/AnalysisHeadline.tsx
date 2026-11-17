import { useTranslation } from 'react-i18next'

import { Sprout } from 'lucide-react'

import type { StageUi } from '../analysisStatusAdapter'

/** Left-side headline block: kicker, two-tone title, supporting copy and the
 * real selected-field area (actual value from the farmer's GeoJSON). */
export default function AnalysisHeadline({
  fieldAreaHa,
  fieldName,
  stages,
  failed,
}: {
  fieldAreaHa: number | null
  fieldName: string | null
  stages: StageUi[]
  failed: boolean
}) {
  const { t } = useTranslation()
  const running = stages.some((s) => s.status === 'running')
  const allDone = stages.every((s) => s.status === 'complete' || s.status === 'partial' || s.status === 'unavailable')

  const kicker = failed
    ? t('ea.kicker.failed')
    : allDone
      ? t('ea.kicker.complete')
      : t('ea.kicker.progress')

  return (
    <div className="relative z-10 max-w-xl">
      <p className="ea-enter-soft font-mono text-[12px] font-bold uppercase tracking-[0.42em] text-[#CDE8C0]/85">
        {kicker}
      </p>

      <h1
        className="ea-enter-up mt-2 font-display text-[2.55rem] font-extrabold leading-[1.04] tracking-tight text-white sm:text-[3rem] lg:text-[3.1rem]"
        style={{ animationDelay: '0.2s' }}
      >
        {t('ea.title.a')}
        <br />
        <span className="text-[#8FE627]">{t('ea.title.b')}</span>
      </h1>

      <p
        className="ea-enter-up mt-2.5 max-w-[38rem] text-[.94rem] leading-relaxed text-white/80 sm:text-base"
        style={{ animationDelay: '0.45s' }}
      >
        {t('ea.subtitle')}
      </p>

      {/* real selected field: actual area from the farmer's GeoJSON */}
      <div
        className="ea-enter-up mt-4 flex items-center gap-3"
        style={{ animationDelay: '0.62s' }}
        data-testid="selected-field-chip"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#8FE627]/40 bg-[#0B1410]/60 text-[#A3E635]">
          <Sprout size={15} />
        </span>
        <span className="text-sm font-semibold text-white/85">{fieldName || t('ea.selectedField')}</span>
        <span className="h-5 w-px bg-white/25" aria-hidden="true" />
        <span className="font-mono text-lg font-extrabold text-white" data-testid="field-area">
          {fieldAreaHa != null ? (
            <>
              {fieldAreaHa.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="ms-1 text-sm font-bold text-white/70">ha</span>
            </>
          ) : (
            <span className="text-sm text-white/55">{t('ea.noArea')}</span>
          )}
        </span>
      </div>
    </div>
  )
}
