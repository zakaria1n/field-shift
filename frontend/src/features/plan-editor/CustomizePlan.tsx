import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  Info,
  X,
  Sliders,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { api, type RotationOut, type SlotOut, type SubstituteCandidate } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
import { getCropAsset } from '../../assets/crops/cropRegistry'
import { useWizard } from '../../state/wizard'

export interface EditSlot {
  slot_id: string
  crop_id: string | null
}

export default function CustomizePlan() {
  const { t, i18n } = useTranslation()
  const { ref } = useParams()
  const navigate = useNavigate()
  const { lang } = useWizard()
  const isArabic = i18n.language === 'ar'

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

  const { data: subs, isFetching: loadingSubs } = useQuery({
    queryKey: ['substitutes', ref, openSlot, edits],
    queryFn: () =>
      api.get<{ slot_id: string; crop_id: string | null; candidates: SubstituteCandidate[] }>(
        `/api/v1/rotations/${ref}/slots/${openSlot}/substitutes`,
      ),
    enabled: openSlot !== null,
  })

  if (isLoading || !plan) {
    return (
      <div className="card p-12 text-center max-w-xl mx-auto space-y-3">
        <div className="h-10 w-10 mx-auto rounded-full border-2 border-leaf border-t-transparent animate-spin" />
        <p className="text-sm font-bold text-forest">{t('common.loading')}</p>
      </div>
    )
  }

  function applyEdit(slotId: string, cropId: string | null) {
    setEdits((prev) => ({ ...prev, [slotId]: cropId }))
    setOpenSlot(null)
  }

  function evaluate() {
    const payload = Object.entries(edits).map(([slot_id, crop_id]) => ({ slot_id, crop_id }))
    navigate(`/rotations/${ref}/compare`, { state: { edits: payload } })
  }

  const activeSlotObj = plan.slots.find((s) => s.slot_id === openSlot)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* Back button */}
      <Link
        to={`/rotations/${ref}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-leaf transition-colors"
      >
        <ArrowLeft size={15} className="rtl:rotate-180" />
        <span>{t('plan.customize')}</span>
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <p className="kicker">{t('steps.plans')}</p>
          {dirty && (
            <span className="badge-glow text-[10px] text-amber-dark border-amber/40 bg-amber-soft">
              Draft Modified ({Object.keys(edits).length} slots)
            </span>
          )}
        </div>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
          {t('customize.title')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('customize.subtitle')}</p>
      </div>

      {/* Slots Sequence Card */}
      <div className="card-elevated p-6 bg-white border border-line shadow-card-hover space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-leaf" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-forest font-mono">
              {t('customize.sequence')}
            </h2>
          </div>
          <span className="text-xs text-ink-light">
            {isArabic ? 'انقر على أي محصول لاختيار بديل مؤهل زراعياً' : 'Click any slot to substitute with an eligible crop'}
          </span>
        </div>

        {/* 3 Editable Slots */}
        <div className="grid gap-4 sm:grid-cols-3">
          {editedSlots.map((slot) => {
            const changed = Object.prototype.hasOwnProperty.call(edits, slot.slot_id)
            const isOpen = openSlot === slot.slot_id

            return (
              <div
                key={slot.slot_id}
                className={`relative flex flex-col rounded-2xl border p-4 transition-all duration-300 ${
                  isOpen
                    ? 'border-2 border-leaf bg-leaf-soft/40 shadow-glow ring-2 ring-leaf/20'
                    : changed
                      ? 'border-2 border-emerald-400 bg-white shadow-md'
                      : 'border-line bg-cream-warm/30 hover:border-leaf/50 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-light font-mono">
                    {t('customize.slot', { n: slot.year_number })}
                  </span>
                  {changed && (
                    <span className="badge-glow text-[10px] text-emerald-800 bg-emerald-50 border-emerald-300">
                      {t('compare.changed')}
                    </span>
                  )}
                </div>

                <div className="py-2 flex justify-center">
                  <CropVisual
                    slot={slot}
                    size="md"
                    interactive
                    showFamily
                    selected={isOpen}
                    className="w-full bg-white"
                  />
                </div>

                <button
                  type="button"
                  className={`mt-3 w-full py-2 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 ${
                    isOpen
                      ? 'bg-forest text-white shadow-sm'
                      : 'btn-secondary !py-1.5'
                  }`}
                  onClick={() => setOpenSlot(isOpen ? null : slot.slot_id)}
                >
                  <Sliders size={13} className={isOpen ? 'text-mint' : 'text-leaf'} />
                  <span>{isOpen ? (isArabic ? 'إغلاق البدائل' : 'Close Selector') : t('customize.change')}</span>
                </button>
              </div>
            )
          })}
        </div>

        {/* Replacement Drawer / Modal Panel */}
        <AnimatePresence>
          {openSlot && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 rounded-2xl border-2 border-leaf/40 bg-gradient-to-b from-white to-cream-warm/30 p-5 shadow-lg overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-leaf" />
                  <h3 className="text-sm font-extrabold text-forest">
                    {t('customize.available')} — {t('customize.slot', { n: activeSlotObj?.year_number })}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label={t('common.cancel')}
                  className="rounded-full p-1.5 text-ink-light hover:text-forest hover:bg-forest/10 transition-colors"
                  onClick={() => setOpenSlot(null)}
                >
                  <X size={16} />
                </button>
              </div>

              {loadingSubs && (
                <div className="py-8 text-center space-y-2">
                  <div className="h-6 w-6 mx-auto rounded-full border-2 border-leaf border-t-transparent animate-spin" />
                  <p className="text-xs text-ink-light">{t('common.loading')}</p>
                </div>
              )}

              {/* Fallow / Rest Soil Option */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => applyEdit(openSlot, null)}
                  className="w-full text-start p-3 rounded-xl border border-dashed border-line bg-cream hover:border-leaf/50 hover:bg-white transition-all flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-forest">{t('plan.fallow')}</span>
                    <p className="text-[11px] text-ink-light mt-0.5">
                      {isArabic ? 'إراحة التربة لكسر دورة الآفات وتجميع الرطوبة' : 'Soil rest season to break pest cycles & conserve moisture'}
                    </p>
                  </div>
                  <span className="btn-secondary !py-1 !px-3 text-xs">{t('customize.change')}</span>
                </button>
              </div>

              {/* Eligible Candidates Grid */}
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 max-h-72 overflow-y-auto p-1">
                {(subs?.candidates ?? []).map((cand) => {
                  const meta = getCropAsset(cand.crop_id)
                  return (
                    <li
                      key={cand.crop_id}
                      className="group flex flex-col rounded-2xl border border-line bg-white p-3.5 shadow-xs hover:border-leaf/50 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {meta?.image ? (
                          <img
                            src={meta.image}
                            alt=""
                            className="h-12 w-12 rounded-xl object-contain bg-cream border border-line p-1 shrink-0"
                          />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-leaf-soft text-leaf font-bold shrink-0">
                            {cand.crop_id.slice(0, 2).toUpperCase()}
                          </span>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-extrabold text-forest truncate">
                              <bdi>{lang === 'ar' ? cand.name_ar : cand.name_en}</bdi>
                            </span>
                            <button
                              type="button"
                              className="rounded-full bg-leaf px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-leaf-hover transition-colors flex items-center gap-1"
                              onClick={() => applyEdit(openSlot, cand.crop_id)}
                            >
                              <Check size={12} strokeWidth={3} />
                              <span>{isArabic ? 'اختيار' : 'Select'}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1">
                            {cand.rotation_group && (
                              <span className="text-[10px] font-mono uppercase font-bold text-ink-light">
                                <bdi>{cand.rotation_group}</bdi>
                              </span>
                            )}
                            {cand.similar_impact && (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full bg-sky-soft text-sky-deep border border-sky/30 px-2 py-0.2 text-[9px] font-bold"
                                title={cand.similarity_note ?? t('disclaimer.similar')}
                              >
                                <Sparkles size={8} /> {t('customize.similar')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Agronomic Reasons */}
                      {cand.why_available.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-line/60">
                          <ul className="space-y-0.5 text-[10px] text-ink-muted list-disc ps-3.5">
                            {cand.why_available.slice(0, 2).map((w, i) => (
                              <li key={i}>
                                <bdi>{w}</bdi>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              {subs && subs.candidates.length === 0 && (
                <p className="mt-3 text-xs text-ink-muted text-center py-4 bg-cream rounded-xl">
                  {t('status.missing')}
                </p>
              )}

              <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ink-light pt-2 border-t border-line">
                <Info size={12} className="mt-0.5 shrink-0 text-sky" />
                <span>{t('customize.similarNote')}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Footer */}
      <div className="card p-4 sm:p-5 bg-white border border-line flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-leaf text-sm px-8 py-3 shadow-md flex items-center gap-2"
            disabled={!dirty}
            onClick={evaluate}
          >
            <Sparkles size={16} />
            <span>{t('customize.evaluate')}</span>
            <ArrowRight size={15} className="rtl:rotate-180" />
          </button>

          <button
            type="button"
            className="btn-secondary text-sm px-5 py-3 flex items-center gap-1.5"
            disabled={!dirty}
            onClick={() => setEdits({})}
          >
            <RotateCcw size={14} />
            <span>{t('customize.reset')}</span>
          </button>
        </div>

        {dirty && (
          <span className="text-xs font-bold text-amber-dark bg-amber-soft px-3 py-1.5 rounded-full border border-amber/30">
            {t('customize.dirty')}
          </span>
        )}
      </div>
    </motion.div>
  )
}
