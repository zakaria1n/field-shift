import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { CircleHelp, Plus, Trash2 } from 'lucide-react'

import { api, type CropOut } from '../../api/client'
import { useWizard, type CropHistoryRow } from '../../state/wizard'

type Step = 0 | 1 | 2 | 3
const TOTAL = 4

function nextYears(n: number): number[] {
  const y = new Date().getFullYear()
  // oldest first so the history reads chronologically
  return Array.from({ length: n }, (_, i) => y - n + i)
}

export default function Questions() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { answers, setAnswers } = useWizard()

  const [step, setStep] = useState<Step>(0)
  const fieldId = (location.state as { fieldId?: string } | null)?.fieldId

  const { data: catalog } = useQuery({
    queryKey: ['crops'],
    queryFn: () => api.get<{ crops: CropOut[] }>('/api/v1/crops'),
    staleTime: 3600_000,
  })
  const crops = catalog?.crops ?? []

  const years = useMemo(() => nextYears(3), [])

  useEffect(() => {
    if (answers.crop_history.length === 0) {
      setAnswers({ ...answers, crop_history: years.map((y) => ({ crop_year: y, season_label: 'main', crop_id: null, status: 'unknown' as const })) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (patch: Partial<typeof answers>) => setAnswers({ ...answers, ...patch })

  function goNext() {
    if (step < 3) setStep((s) => (s + 1) as Step)
    else navigate('/setup/priorities', { state: fieldId ? { fieldId } : undefined })
  }
  function goBack() {
    if (step > 0) setStep((s) => (s - 1) as Step)
    else navigate('/fields/new')
  }

  const irrigationOptions = [
    { value: 'rainfed', label: t('q.irrigation.rainfed') },
    { value: 'irrigated', label: t('q.irrigation.irrigated') },
    { value: 'mixed', label: t('q.irrigation.mixed') },
    { value: 'unknown', label: t('q.irrigation.unknown') },
  ] as const

  const purposeOptions = [
    { value: 'sell', label: t('q.purposes.sell') },
    { value: 'livestock_feed', label: t('q.purposes.livestock_feed') },
    { value: 'household_food', label: t('q.purposes.household_food') },
    { value: 'soil_restoration', label: t('q.purposes.soil_restoration') },
  ] as const

  return (
    <div className="mx-auto max-w-2xl">
      <p className="kicker">{t('steps.questions')}</p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-forest">{t('q.title')}</h1>
      <p className="mt-1 text-sm text-ink/70">{t('q.subtitle')}</p>
      <p className="mt-2 text-xs font-semibold text-ink/50">{t('q.step', { n: step + 1, total: TOTAL })}</p>

      <div className="card mt-4 p-5">
        {step === 0 && (
          <section>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{t('q.irrigation.title')}</h2>
              <span className="group relative" tabIndex={0} aria-label="help">
                <CircleHelp size={16} className="text-ink/50" />
                <span className="pointer-events-none absolute hidden group-focus:block group-hover:block start-6 top-0 z-10 w-56 rounded-lg bg-forest p-2 text-xs text-white">{t('q.irrigation.help')}</span>
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {irrigationOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set({ irrigation_type: opt.value, irrigation_method: opt.value === 'rainfed' ? null : answers.irrigation_method })}
                  aria-pressed={answers.irrigation_type === opt.value}
                  className={`rounded-xl border px-4 py-3 text-start text-sm font-semibold transition-colors ${
                    answers.irrigation_type === opt.value ? 'border-leaf bg-leaf/10 text-forest' : 'border-line bg-white hover:bg-forest/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {answers.irrigation_type === 'irrigated' || answers.irrigation_type === 'mixed' ? (
              <div className="mt-5 space-y-4 rounded-xl bg-cream border border-line p-4">
                <div>
                  <p className="label">{t('q.method.title')}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(['drip', 'sprinkler', 'surface', 'other', 'unknown'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => set({ irrigation_method: m })}
                        aria-pressed={answers.irrigation_method === m}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${answers.irrigation_method === m ? 'border-leaf bg-leaf/10 text-forest' : 'border-line bg-white'}`}
                      >
                        {t(`q.method.${m}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="label">{t('q.availability.title')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['regular', 'limited', 'unknown'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => set({ water_availability: v })}
                        aria-pressed={answers.water_availability === v}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${answers.water_availability === v ? 'border-leaf bg-leaf/10 text-forest' : 'border-line bg-white'}`}
                      >
                        {t(`q.availability.${v}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="water-volume">{t('q.volume.title')}</label>
                  <input
                    id="water-volume"
                    className="input"
                    placeholder={t('q.volume.optional')}
                    value={answers.water_volume_note ?? ''}
                    onChange={(e) => set({ water_volume_note: e.target.value || null })}
                  />
                </div>
              </div>
            ) : null}
          </section>
        )}

        {step === 1 && (
          <section>
            <h2 className="text-lg font-bold">{t('q.history.title')}</h2>
            <p className="mt-1 text-sm text-ink/70">{t('q.history.help')}</p>
            <div className="mt-4 space-y-4">
              {years.map((year) => {
                const rows = answers.crop_history.filter((r) => r.crop_year === year)
                const update = (idx: number, patch: Partial<CropHistoryRow>) => {
                  const globalIdx = answers.crop_history.findIndex((r) => r === rows[idx])
                  const copy = [...answers.crop_history]
                  copy[globalIdx] = { ...copy[globalIdx], ...patch }
                  set({ crop_history: copy })
                }
                return (
                  <div key={year} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-forest">{t('q.history.year', { year })}</p>
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-forest hover:bg-forest/5"
                        onClick={() => {
                          const globalIdx = answers.crop_history.findIndex((r) => r.crop_year === year)
                          const copy = [...answers.crop_history]
                          copy.splice(globalIdx, 0, { crop_year: year, season_label: null, crop_id: null, status: 'planted' })
                          set({ crop_history: copy })
                        }}
                      >
                        <Plus size={12} /> {t('q.history.addCrop')}
                      </button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {rows.map((row, idx) => (
                        <div key={`${year}-${idx}`} className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label={`${t('q.history.crop')} ${year}`}
                            className="input max-w-[14rem]"
                            value={row.status === 'planted' ? row.crop_id ?? '' : row.status}
                            onChange={(e) => {
                              const v = e.target.value
                              if (v === 'fallow' || v === 'unknown') update(idx, { status: v, crop_id: null })
                              else update(idx, { status: 'planted', crop_id: v })
                            }}
                          >
                            <option value="unknown">{t('q.history.unknown')}</option>
                            <option value="fallow">{t('q.history.fallow')}</option>
                            {crops.map((c) => (
                              <option key={c.crop_id} value={c.crop_id}>
                                {i18n.language === 'ar' ? c.name_ar : c.name_en}
                              </option>
                            ))}
                          </select>
                          <input
                            aria-label={`${t('q.history.season')} ${year}`}
                            className="input max-w-[9rem]"
                            placeholder={t('q.history.season')}
                            value={row.season_label ?? ''}
                            onChange={(e) => update(idx, { season_label: e.target.value || null })}
                          />
                          {rows.length > 1 && (
                            <button
                              aria-label={t('q.history.remove')}
                              className="rounded-full p-1.5 text-ink/50 hover:bg-red-50 hover:text-red-600"
                              onClick={() => {
                                const globalIdx = answers.crop_history.findIndex((r) => r === row)
                                const copy = [...answers.crop_history]
                                copy.splice(globalIdx, 1)
                                set({ crop_history: copy })
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 className="text-lg font-bold">{t('q.purposes.title')}</h2>
            <p className="mt-1 text-sm text-ink/70">{t('q.purposes.help')}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {purposeOptions.map((opt) => {
                const active = answers.purposes.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      set({
                        purposes: active ? answers.purposes.filter((p) => p !== opt.value) : [...answers.purposes, opt.value],
                      })
                    }
                    aria-pressed={active}
                    className={`rounded-xl border px-4 py-3 text-start text-sm font-semibold ${active ? 'border-leaf bg-leaf/10 text-forest' : 'border-line bg-white hover:bg-forest/5'}`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 rounded-lg bg-amber/10 border border-amber/40 px-3 py-2 text-xs text-ink/75">{t('q.purposes.marketNote')}</p>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2 className="text-lg font-bold">{t('q.constraints.title')}</h2>
            <p className="mt-1 text-sm text-ink/70">{t('q.constraints.bannedHint')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {crops.map((c) => {
                const active = answers.banned_crops.includes(c.crop_id)
                return (
                  <button
                    key={c.crop_id}
                    onClick={() =>
                      set({
                        banned_crops: active ? answers.banned_crops.filter((x) => x !== c.crop_id) : [...answers.banned_crops, c.crop_id],
                      })
                    }
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-red-300 bg-red-50 text-red-700' : 'border-line bg-white text-ink/70 hover:bg-forest/5'}`}
                  >
                    <bdi>{i18n.language === 'ar' ? c.name_ar : c.name_en}</bdi>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-ink/60">{t('q.constraints.none')}</p>
          </section>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button className="btn-secondary" onClick={goBack}>{t('nav.back')}</button>
        <button className="btn-primary" onClick={goNext}>
          {step === 3 ? t('nav.next') : t('nav.next')}
        </button>
      </div>
    </div>
  )
}
