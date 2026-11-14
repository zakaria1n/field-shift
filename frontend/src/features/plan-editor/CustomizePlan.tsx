import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, Info, X } from 'lucide-react'

import { api, type RotationOut, type SlotOut, type SubstituteCandidate } from '../../api/client'
import { CropChip } from '../../app/components/ui'
import { useWizard } from '../../state/wizard'

export interface EditSlot { slot_id: string; crop_id: string | null }

export default function CustomizePlan() {
  const { t, i18n } = useTranslation()
  const { ref } = useParams()
  const navigate = useNavigate()
  const { lang } = useWizard()

  const { data: plan, isLoading } = useQuery({
    queryKey: ['rotation', ref],
    queryFn: () => api.get<RotationOut>(`/api/v1/rotations/${ref}`),
  })

  const [edits, setEdits] = useState<Record<string, string | null>>({})
  const [openSlot, setOpenSlot] = useState<string | null>(null)

  const editedSlots: SlotOut[] = useMemo(() => {
    if (!plan) return []
    return plan.slots.map((s) =>
      Object.prototype.hasOwnProperty.call(edits, s.slot_id)
        ? { ...s, crop_id: edits[s.slot_id], fallow: edits[s.slot_id] === null }
        : s,
    )
  }, [plan, edits])

  const dirty = Object.keys(edits).length > 0

  const { data: subs } = useQuery({
    queryKey: ['substitutes', ref, openSlot, edits],
    queryFn: () =>
      api.get<{ slot_id: string; crop_id: string | null; candidates: SubstituteCandidate[] }>(
        `/api/v1/rotations/${ref}/slots/${openSlot}/substitutes`,
      ),
    enabled: openSlot !== null,
  })

  if (isLoading || !plan) return <p className="text-sm text-ink/60">{t('common.loading')}</p>

  function applyEdit(slotId: string, cropId: string | null) {
    setEdits((prev) => ({ ...prev, [slotId]: cropId }))
    setOpenSlot(null)
  }

  function evaluate() {
    const payload = Object.entries(edits).map(([slot_id, crop_id]) => ({ slot_id, crop_id }))
    navigate(`/rotations/${ref}/compare`, { state: { edits: payload } })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to={`/rotations/${ref}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline">
        <ArrowLeft size={15} className="rtl:rotate-180" /> {t('plan.customize')}
      </Link>
      <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-forest">{t('customize.title')}</h1>
      <p className="mt-1 text-sm text-ink/70">{t('customize.subtitle')}</p>

      <div className="card mt-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">{t('customize.sequence')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {editedSlots.map((slot) => {
            const changed = Object.prototype.hasOwnProperty.call(edits, slot.slot_id)
            return (
              <div key={slot.slot_id} className={`rounded-xl border p-3 ${changed ? 'border-leaf bg-leaf/5' : 'border-line'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-ink/50">{t('customize.slot', { n: slot.year_number })}</span>
                  {changed && <span className="text-[10px] font-bold text-leaf">{t('compare.changed')}</span>}
                </div>
                <div className="mt-2 flex justify-center">
                  <CropChip slot={slot} />
                </div>
                <button
                  className="btn-secondary mt-3 w-full !py-1.5 text-xs"
                  onClick={() => setOpenSlot(openSlot === slot.slot_id ? null : slot.slot_id)}
                >
                  {t('customize.change')}
                </button>
              </div>
            )
          })}
        </div>

        {/* Replacement drawer */}
        {openSlot && (
          <div className="mt-4 rounded-xl border border-leaf/40 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-forest">
                {t('customize.available')} — {t('customize.slot', { n: plan.slots.find((s) => s.slot_id === openSlot)?.year_number })}
              </h3>
              <button aria-label={t('common.cancel')} className="p-1 text-ink/50 hover:text-ink" onClick={() => setOpenSlot(null)}>
                <X size={16} />
              </button>
            </div>
            {!subs && <p className="mt-3 text-xs text-ink/50">{t('common.loading')}</p>}
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {(subs?.candidates ?? []).map((cand) => (
                <li key={cand.crop_id} className="rounded-lg border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-ink">
                      <bdi>{lang === 'ar' ? cand.name_ar : cand.name_en}</bdi>
                    </span>
                    <button
                      className="rounded-full bg-leaf px-3 py-1 text-xs font-bold text-white hover:bg-[#248453]"
                      onClick={() => applyEdit(openSlot, cand.crop_id)}
                    >
                      <Check size={13} className="inline" />
                    </button>
                  </div>
                  {cand.rotation_group && <span className="text-[10px] uppercase text-ink/40"><bdi>{cand.rotation_group}</bdi></span>}
                  {cand.similar_impact && (
                    <span className="ms-1 inline-block rounded-full bg-sky/15 px-2 py-0.5 text-[10px] font-bold text-sky" title={cand.similarity_note ?? t('disclaimer.similar')}>
                      {t('customize.similar')}
                    </span>
                  )}
                  {cand.why_available.length > 0 && (
                    <ul className="mt-1.5 list-disc ps-4 text-[11px] text-ink/55">
                      {cand.why_available.map((w, i) => (
                        <li key={i}><bdi>{w}</bdi></li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {(subs?.candidates.length ?? 0) === 0 && subs && (
              <p className="mt-2 text-xs text-ink/60">{t('status.missing')}</p>
            )}
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ink/50">
              <Info size={12} className="mt-0.5 shrink-0" />
              {t('customize.similarNote')}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn-leaf" disabled={!dirty} onClick={evaluate}>
          {t('customize.evaluate')}
        </button>
        <button
          className="btn-secondary"
          disabled={!dirty}
          onClick={() => setEdits({})}
        >
          {t('customize.reset')}
        </button>
        {dirty && <p className="text-xs font-semibold text-amber">{t('customize.dirty')}</p>}
      </div>
    </div>
  )
}
