import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Calendar, Sliders, Sparkles, TriangleAlert } from 'lucide-react'
import type { RotationOut } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
import { IndicatorRow } from '../../app/components/ui'

/** Keep the backend's warning decision; only omit its repeated numeric suffix. */
export function shortPlanLimitation(plan: RotationOut, arabic: boolean) {
  const text = (arabic ? plan.main_limitation_ar : plan.main_limitation_en)
    || plan.main_limitation_en || plan.main_limitation_ar
  if (!text) return null
  if (text.startsWith('Relative weakness:') || text.startsWith('نقطة ضعف نسبية:')) {
    return text.replace(/\s*\([^)]*(?:normalized reference|مرجع معياري)\)\.?\s*$/, '')
  }
  return text
}

export function PlanCard({ plan }: { plan: RotationOut }) {
  const { t, i18n } = useTranslation()
  const arabic = i18n.language === 'ar'
  const limitation = shortPlanLimitation(plan, arabic)
  return <article data-testid="plan-card" data-plan-id={plan.plan_id}
    className={`min-w-0 flex flex-col rounded-2card border bg-white p-4 sm:p-5 ${plan.is_recommended
      ? 'border-leaf shadow-card-hover ring-2 ring-leaf/15' : 'border-line shadow-card'}`}>
    <header className="flex min-h-8 items-center justify-between gap-2">
      <h2 className="flex min-w-0 items-center gap-1.5 text-base font-extrabold text-forest">
        <bdi className="font-mono text-[11px] text-ink-light">#{plan.rank}</bdi>
        <bdi>{plan.label}</bdi>
      </h2>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${plan.is_recommended
        ? 'border-leaf/30 bg-leaf-soft text-forest' : 'border-line bg-cream-warm text-ink-muted'}`}>
        {plan.is_recommended && <Sparkles size={11} aria-hidden />}
        {t(plan.is_recommended ? 'plans.recommended' : 'plans.alternative')}
      </span>
    </header>

    <div className="mt-3 flex items-center justify-between rounded-xl bg-cream px-3 py-2">
      <span className="text-xs font-semibold text-ink-muted">{t('plans.overallScore')}</span>
      <bdi dir="ltr" className="font-mono tabular-nums text-xl font-extrabold text-forest" data-testid="plan-total">
        {plan.score.total === null ? '—' : plan.score.total.toFixed(1)}
        <span className="ms-1 text-[11px] font-normal text-ink-light">/100</span>
      </bdi>
    </div>

    <section className="mt-3 rounded-xl border border-line/70 bg-cream/50 p-2.5" aria-label={t('customize.sequence')}>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
        <Calendar size={12} aria-hidden />{t('plan.years', { n: plan.horizon_years })}
      </p>
      <ol className="grid grid-cols-3 gap-2">
        {plan.slots.map((slot, index) => <li key={slot.slot_id} data-crop-id={slot.crop_id ?? ''}
          data-year={slot.year_number} className="relative min-w-0 flex flex-col text-center">
          <span className="mb-1 text-[10px] font-semibold text-ink-light">{t('timeline.year', { n: slot.year_number })}</span>
          <CropVisual slot={slot} size="xs"
            className="h-full w-full !min-w-0 !px-1 break-words [&>span]:min-h-8 [&>span]:flex [&>span]:items-center [&>span]:justify-center" />
          {index < plan.slots.length - 1 && <span aria-hidden className="absolute -end-2.5 top-[60%] z-10 text-ink-light rtl:rotate-180">›</span>}
        </li>)}
      </ol>
    </section>

    <div className="mt-4 space-y-2.5 border-t border-line/70 pt-3" data-testid="plan-indicators">
      {['water', 'soil', 'yield', 'risk'].map(key => {
        const indicator = plan.score.indicators.find(item => item.key === key)
        return indicator && <div key={key} data-indicator-key={key} data-value={indicator.value ?? 'missing'}>
          <IndicatorRow compact label={arabic ? indicator.label_ar : indicator.label_en}
            value={indicator.value} status={indicator.status} />
        </div>
      })}
    </div>

    {limitation && <p data-testid="plan-warning" className="mt-3 flex items-start gap-1.5 rounded-xl border border-amber/30 bg-amber-soft px-2.5 py-2 text-[11px] leading-relaxed text-amber-dark">
      <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden /><bdi>{limitation}</bdi>
    </p>}

    <div className="mt-auto space-y-2 pt-4">
      <Link to={`/rotations/${plan.plan_id}`} className={`${plan.is_recommended ? 'btn-leaf' : 'btn-primary'} w-full !py-2.5 text-xs`}>
        {t('plans.viewDetails')}<ArrowRight size={14} className="rtl:rotate-180" aria-hidden />
      </Link>
      <Link to={`/rotations/${plan.plan_id}/customize`} className="btn-secondary w-full !py-2 text-xs">
        <Sliders size={13} aria-hidden />{t('plan.customize')}
      </Link>
    </div>
  </article>
}
