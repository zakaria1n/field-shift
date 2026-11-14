import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Info, RotateCcw } from 'lucide-react'

import { api, type FieldOut } from '../../api/client'
import { useWizard, type Priorities } from '../../state/wizard'

const KEYS = ['water', 'soil', 'yield', 'risk'] as const
type Key = (typeof KEYS)[number]

/**
 * Linked priority mixer: the four weights always total exactly 100.
 * Increasing one slider redistributes the remaining weight across the others,
 * preserving their relative proportions (or splitting evenly when all are 0).
 */
export function rebalance(current: Priorities, changed: Key, nextValue: number): Priorities {
  const clamped = Math.max(0, Math.min(100, Math.round(nextValue)))
  const others = KEYS.filter((k) => k !== changed)
  const remaining = 100 - clamped
  const othersSum = others.reduce((sum, k) => sum + current[k], 0)

  const result: Priorities = { ...current, [changed]: clamped } as Priorities
  if (othersSum === 0) {
    // Nothing to scale: distribute evenly.
    for (const k of others) result[k] = Math.floor(remaining / others.length)
    // Exactness: push the leftover onto the first other key.
    let assigned = others.reduce((sum, k) => sum + result[k], 0)
    result[others[0]] += remaining - assigned
  } else {
    let assigned = 0
    others.forEach((k, i) => {
      if (i === others.length - 1) {
        result[k] = remaining - assigned
      } else {
        const share = Math.round((current[k] / othersSum) * remaining)
        result[k] = share
        assigned += share
      }
    })
  }
  return result
}

export function totalOf(p: Priorities): number {
  return KEYS.reduce((sum, k) => sum + p[k], 0)
}

export default function Priorities() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { priorities, setPriorities, answers } = useWizard()
  const fieldId = (location.state as { fieldId?: string } | null)?.fieldId
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (totalOf(priorities) !== 100) setPriorities({ water: 25, soil: 25, yield: 25, risk: 25 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const labels: Record<Key, string> = {
    water: t('mixer.water'),
    soil: t('mixer.soil'),
    yield: t('mixer.yield'),
    risk: t('mixer.risk'),
  }
  const colors: Record<Key, string> = { water: 'bg-sky', soil: 'bg-leaf', yield: 'bg-amber', risk: 'bg-forest' }

  async function startAnalysis() {
    const target = fieldId
    try {
      let id = target
      if (!id) {
        // Wizard reached this page without a persisted field (session restore).
        return
      }
      const historyPayload = answers.crop_history.filter((r) => r.status === 'planted' || r.status === 'fallow' || r.status === 'unknown')
      await api.put(`/api/v1/fields/${id}/profile`, {
        irrigation_type: answers.irrigation_type,
        irrigation_method: answers.irrigation_type === 'rainfed' ? null : answers.irrigation_method,
        water_availability: answers.irrigation_type === 'rainfed' ? null : answers.water_availability,
        water_volume_note: answers.water_volume_note,
        purposes: answers.purposes,
        priorities,
        constraints: answers.banned_crops.length > 0 ? { banned_crops: answers.banned_crops } : null,
      })
      await api.put(`/api/v1/fields/${id}/crop-history`, historyPayload)
      const job = await api.post<{ job_id: string; status: string }>(`/api/v1/fields/${id}/analyses`, {})
      navigate(`/analyses/${job.job_id}/progress`, { state: { fieldId: id } })
    } catch (err) {
      navigate('/setup/questions', { state: { fieldId: target } })
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="kicker">{t('steps.priorities')}</p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-forest">{t('mixer.title')}</h1>
      <p className="mt-1 text-sm text-ink/70">{t('mixer.subtitle')}</p>

      <div className="card mt-5 p-5">
        {/* Linked total bar */}
        <div ref={barRef} className="flex h-4 w-full overflow-hidden rounded-full border border-line" aria-hidden>
          {KEYS.map((k) => (
            <div key={k} className={colors[k]} style={{ width: `${priorities[k]}%` }} />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-ink/60">{t('mixer.balanceNote')}</span>
          <span className="font-bold" aria-live="polite">
            {t('mixer.total')}: <span data-testid="mixer-total">{totalOf(priorities)}</span>%
          </span>
        </div>

        <div className="mt-5 space-y-5">
          {KEYS.map((k) => (
            <div key={k}>
              <div className="flex items-center justify-between">
                <label htmlFor={`slider-${k}`} className="text-sm font-semibold text-ink">
                  {labels[k]}
                </label>
                <span className="text-sm font-bold text-forest" aria-hidden>
                  <bdi>{priorities[k]}</bdi>%
                </span>
              </div>
              <input
                id={`slider-${k}`}
                data-testid={`slider-${k}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={priorities[k]}
                aria-label={t('aria.slider', { label: labels[k] })}
                aria-valuetext={`${priorities[k]} percent`}
                onChange={(e) => setPriorities(rebalance(priorities, k, Number(e.target.value)))}
                className="mt-2 w-full accent-[#299A61]"
              />
            </div>
          ))}
        </div>

        <button
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:underline"
          onClick={() => setPriorities({ water: 25, soil: 25, yield: 25, risk: 25 })}
        >
          <RotateCcw size={13} /> {t('mixer.reset')}
        </button>

        <p className="mt-4 flex items-start gap-2 rounded-lg border border-sky/30 bg-sky/10 p-3 text-xs text-ink/75">
          <Info size={14} className="mt-0.5 shrink-0 text-sky" />
          {t('mixer.yieldNote')}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button className="btn-secondary" onClick={() => navigate('/setup/questions', { state: fieldId ? { fieldId } : undefined })}>
          {t('nav.back')}
        </button>
        <button className="btn-leaf" disabled={totalOf(priorities) !== 100} onClick={startAnalysis}>
          {t('analysis.start')}
        </button>
      </div>
    </div>
  )
}
