import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  MoveRight,
  Sparkles,
  Sliders,
  TriangleAlert,
  Info,
  Layers,
  CheckCircle2,
  Calendar,
  Compass,
  Search,
  Radar,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type RotationListOut } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
import { IndicatorRow } from '../../app/components/ui'
import { ScoreEvidence } from '../../app/components/ScoreEvidence'
import { useWizard } from '../../state/wizard'

const INDICATOR_KEYS = ['water', 'soil', 'yield', 'risk'] as const

export default function RotationExplorer() {
  const { t, i18n } = useTranslation()
  const { fieldId } = useParams()
  const { lang } = useWizard()
  const isArabic = i18n.language === 'ar'
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['rotations', fieldId],
    queryFn: () => api.get<RotationListOut>(`/api/v1/fields/${fieldId}/rotations`),
  })

  if (isLoading) {
    return (
      <div className="card-elevated p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6 bg-white border border-line shadow-card-hover relative overflow-hidden">
        {/* Animated Scan Line */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-leaf to-transparent animate-pulse" />

        {/* Central Agritech Radar Search Animation */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          {/* Concentric Pulsing Radar Rings */}
          <span className="absolute inset-0 rounded-full border-2 border-leaf/25 animate-ping" style={{ animationDuration: '3s' }} />
          <span className="absolute inset-2 rounded-full border border-sky/35 animate-pulse" />
          <span className="absolute inset-4 rounded-full border border-forest/15" />

          {/* Rotating Radar Scanner Sweep */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(34, 158, 101, 0.3) 360deg)',
            }}
          />

          {/* Core Search Icon with Glow */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-forest to-forest-surface text-mint shadow-glow">
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            >
              <Search size={26} strokeWidth={2.5} />
            </motion.div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-1 text-xs font-mono font-bold text-forest border border-leaf/30">
            <span className="h-2 w-2 rounded-full bg-leaf animate-pulse" />
            <span>{isArabic ? 'محرك البحث الزراعي نشط' : 'Agritech Engine Searching Sequences'}</span>
          </div>
          <h2 className="text-xl font-extrabold text-forest tracking-tight">
            {isArabic ? 'جاري البحث والتحقق من الدورات الزراعية...' : 'Discovering Optimal Crop Rotations...'}
          </h2>
          <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">
            {isArabic
              ? 'مقارنة خصائص التربة والحرارة وهطول الأمطار لتحديد تسلسلات المحاصيل المثلى'
              : 'Cross-referencing NASA POWER climate baselines, SoilGrids 250m and FAO GAEZ v5 ceilings.'}
          </p>
        </div>

        {/* Live Search Telemetry Stages */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-mono text-ink-light">
          <span className="rounded-md bg-cream px-2.5 py-1 border border-line flex items-center gap-1">
            <Sparkles size={11} className="text-leaf animate-spin" />
            {isArabic ? 'تقييم القواعد' : 'Rule Evaluation'}
          </span>
          <span className="rounded-md bg-cream px-2.5 py-1 border border-line flex items-center gap-1">
            <Search size={11} className="text-sky-600 animate-pulse" />
            {isArabic ? 'بحث التباديل' : 'Permutation Search'}
          </span>
          <span className="rounded-md bg-cream px-2.5 py-1 border border-line flex items-center gap-1">
            <Radar size={11} className="text-leaf animate-spin" style={{ animationDuration: '5s' }} />
            {isArabic ? 'تحسين النقاط' : 'Score Optimization'}
          </span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card p-8 text-center max-w-xl mx-auto space-y-3">
        <TriangleAlert size={28} className="mx-auto text-amber-dark" />
        <p className="text-sm font-bold text-red-600">{t('error.generic')}</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <p className="kicker">{t('steps.plans')}</p>
          <span className="badge-glow text-[10px]">Step 5 of 5</span>
        </div>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
          {t('plans.title')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('plans.subtitle')}</p>
      </div>

      {/* Honest Scientific Coverage Banners */}
      {data.insufficient_data_note && (
        <div className="rounded-2xl border border-amber/40 bg-amber-soft p-4 text-xs font-medium text-ink-muted flex items-start gap-2.5 shadow-sm">
          <Info size={16} className="text-amber-dark shrink-0 mt-0.5" />
          <p className="leading-relaxed">{data.insufficient_data_note}</p>
        </div>
      )}
      {data.current_practice_note && (
        <div className="rounded-2xl border border-line bg-white/90 p-4 text-xs text-ink-muted flex items-start gap-2.5 shadow-sm">
          <Compass size={16} className="text-leaf shrink-0 mt-0.5" />
          <p className="leading-relaxed">{data.current_practice_note}</p>
        </div>
      )}

      {/* Live Crop Search & Filter Bar with Animated Telemetry Search Icon */}
      <div className="card p-3.5 sm:p-4 bg-white/95 border border-line shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 flex items-center">
            {/* Animated Search Icon */}
            <div className="absolute start-3 pointer-events-none z-10 flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <span className="absolute -inset-1 rounded-full bg-leaf/25 animate-ping" style={{ animationDuration: '2.4s' }} />
                <motion.div
                  animate={{ scale: [1, 1.18, 1], rotate: [0, 8, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                  className="relative text-leaf"
                >
                  <Search className="h-4 w-4" />
                </motion.div>
              </div>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isArabic
                  ? 'ابحث عن محصول داخل الدورات المقترحة (مثال: قمح، حمص، عدس، بطاطس)...'
                  : 'Search or filter crop inside plans (e.g. Wheat, Chickpea, Lentil, Potato)...'
              }
              className="input text-xs sm:text-sm !py-2 w-full"
              style={{ paddingInlineStart: '2.5rem', paddingInlineEnd: searchQuery ? '2.5rem' : '1rem' }}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-3 h-5 w-5 rounded-full bg-cream hover:bg-cream-warm flex items-center justify-center text-xs text-ink/50 hover:text-ink transition-colors"
                aria-label="Clear crop search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Crop Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-ink-light font-bold uppercase tracking-wider">
              {isArabic ? 'فلترة سريعة:' : 'Quick Filter:'}
            </span>
            {[
              { en: 'Wheat', ar: 'قمح' },
              { en: 'Chickpea', ar: 'حمص' },
              { en: 'Lentil', ar: 'عدس' },
              { en: 'Sunflower', ar: 'دوار الشمس' },
            ].map((crop) => {
              const active =
                searchQuery.toLowerCase().trim() === crop.en.toLowerCase() ||
                searchQuery.trim() === crop.ar
              return (
                <button
                  key={crop.en}
                  type="button"
                  onClick={() =>
                    setSearchQuery(active ? '' : (isArabic ? crop.ar : crop.en))
                  }
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all border ${
                    active
                      ? 'bg-forest text-white border-forest shadow-xs'
                      : 'bg-cream-warm hover:bg-leaf-soft text-ink-muted hover:text-forest border-line'
                  }`}
                >
                  {isArabic ? crop.ar : crop.en}
                </button>
              )
            })}
          </div>
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between text-xs text-ink-light pt-1 border-t border-line/50">
            <span>
              {isArabic
                ? `عرض الدورات التي تحتوي على: "${searchQuery}" (${
                    data.rotations.filter((p) => {
                      const q = searchQuery.toLowerCase().trim()
                      return p.slots.some(
                        (s) =>
                          s.name_en?.toLowerCase().includes(q) ||
                          s.name_ar?.toLowerCase().includes(q) ||
                          s.crop_id?.toLowerCase().includes(q) ||
                          s.rotation_group?.toLowerCase().includes(q)
                      )
                    }).length
                  } نتائج)`
                : `Showing plans containing: "${searchQuery}" (${
                    data.rotations.filter((p) => {
                      const q = searchQuery.toLowerCase().trim()
                      return p.slots.some(
                        (s) =>
                          s.name_en?.toLowerCase().includes(q) ||
                          s.name_ar?.toLowerCase().includes(q) ||
                          s.crop_id?.toLowerCase().includes(q) ||
                          s.rotation_group?.toLowerCase().includes(q)
                      )
                    }).length
                  } results)`}
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-leaf font-bold hover:underline"
            >
              {isArabic ? 'عرض كافة الخطط' : 'Show all plans'}
            </button>
          </div>
        )}
      </div>

      {/* 3 Rotation Strategy Cards Grid */}
      {data.rotations.filter((p) => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase().trim()
        return p.slots.some(
          (s) =>
            s.name_en?.toLowerCase().includes(q) ||
            s.name_ar?.toLowerCase().includes(q) ||
            s.crop_id?.toLowerCase().includes(q) ||
            s.rotation_group?.toLowerCase().includes(q)
        )
      }).length === 0 ? (
        <div className="card p-10 text-center max-w-md mx-auto space-y-3 bg-white border border-line">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-soft text-amber-dark">
            <Search size={22} />
          </div>
          <h3 className="font-extrabold text-forest text-base">
            {isArabic ? 'لم يتم العثور على دورة تحتوي هذا المحصول' : 'No rotation contains this crop'}
          </h3>
          <p className="text-xs text-ink-muted">
            {isArabic
              ? `لم تتضمن استراتيجيات التناوب الثلاث المقترحة محصول "${searchQuery}". يمكنك استبداله لاحقاً عبر زر "تخصيص".`
              : `None of the 3 generated plans include "${searchQuery}". You can also substitute crops directly via "Customize".`}
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="btn-primary !py-2 !px-4 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <span>{isArabic ? 'إعادة ضبط البحث' : 'Reset search filter'}</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3 items-stretch">
          {data.rotations
            .filter((p) => {
              if (!searchQuery.trim()) return true
              const q = searchQuery.toLowerCase().trim()
              return p.slots.some(
                (s) =>
                  s.name_en?.toLowerCase().includes(q) ||
                  s.name_ar?.toLowerCase().includes(q) ||
                  s.crop_id?.toLowerCase().includes(q) ||
                  s.rotation_group?.toLowerCase().includes(q)
              )
            })
            .map((plan, planIdx) => {
          const indicators = Object.fromEntries(plan.score.indicators.map((i) => [i.key, i]))
          const isRec = plan.is_recommended

          return (
            <motion.article
              key={plan.plan_id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: planIdx * 0.1 }}
              className={`relative flex flex-col rounded-2card p-5 sm:p-6 transition-all duration-300 ${
                isRec
                  ? 'border-2 border-leaf bg-white shadow-xl ring-4 ring-leaf/10'
                  : 'card bg-white/95 border-line shadow-card hover:shadow-card-hover'
              }`}
            >
              {/* Ribbon Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-ink-light">
                    #{planIdx + 1}
                  </span>
                  <h2 className="text-lg font-extrabold text-forest tracking-tight">
                    {plan.label}
                  </h2>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-tight ${
                    isRec
                      ? 'bg-leaf-soft text-forest border border-leaf/40 shadow-sm'
                      : 'bg-cream-warm text-ink-muted border border-line'
                  }`}
                >
                  {isRec && <Sparkles size={11} className="text-leaf" />}
                  {isRec ? t('plans.recommended') : t('plans.alternative')}
                </span>
              </div>

              {/* 3-Year Interactive Connected Crop Timeline */}
              <div className="mt-2 rounded-2xl bg-cream/50 border border-line/70 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-light font-mono flex items-center gap-1">
                    <Calendar size={11} /> 3-Year Crop Sequence
                  </span>
                  <span className="text-[10px] font-mono text-leaf font-bold">
                    {plan.horizon_years} Years
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1">
                  {plan.slots.map((slot, i) => (
                    <div key={slot.slot_id} className="flex-1 flex items-center">
                      <div className="w-full flex flex-col items-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-light mb-1 font-mono">
                          {t(`timeline.year`, { n: slot.year_number })}
                        </span>
                        <CropVisual
                          slot={slot}
                          size="xs"
                          interactive
                          className="w-full bg-white shadow-xs"
                        />
                      </div>
                      {i < plan.slots.length - 1 && (
                        <span className="px-1 text-ink-light/40 font-bold text-xs shrink-0 rtl:rotate-180" aria-hidden>
                          ›
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Agronomic Summary Statement */}
              <p className="mt-4 text-xs text-ink-muted leading-relaxed">
                <bdi>{lang === 'ar' ? plan.summary_ar : plan.summary_en}</bdi>
              </p>

              {/* Scientific Performance Indicator Bars */}
              <div className="mt-5 space-y-3 pt-3 border-t border-line/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-light font-mono block mb-1">
                  Agronomic Indices
                </span>
                {INDICATOR_KEYS.map((key) => {
                  const ind = indicators[key]
                  if (!ind) return null
                  return (
                    <IndicatorRow
                      key={key}
                      label={lang === 'ar' ? ind.label_ar : ind.label_en}
                      value={ind.value}
                      status={ind.status}
                      weight={Math.round((plan.score.weights_applied[key] ?? 0) * 100)}
                    />
                  )
                })}
              </div>

              {/* Limitation / Trade-Off Pill */}
              <ScoreEvidence score={plan.score} />
              {(lang === 'ar' ? plan.main_limitation_ar : plan.main_limitation_en) && (
                <div className="mt-4 rounded-xl bg-amber-soft/80 border border-amber/30 p-2.5 text-[11px] text-ink-muted leading-snug flex items-start gap-2">
                  <TriangleAlert size={13} className="text-amber-dark shrink-0 mt-0.5" />
                  <p>
                    <span className="font-bold text-amber-dark">{t('plan.limitation')}: </span>
                    <bdi>{lang === 'ar' ? plan.main_limitation_ar : plan.main_limitation_en}</bdi>
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto pt-5 space-y-2">
                <Link
                  to={`/rotations/${plan.plan_id}`}
                  className={`w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 rounded-full transition-all ${
                    isRec ? 'btn-leaf shadow-md' : 'btn-primary'
                  }`}
                >
                  <span>{t('plans.viewDetails')}</span>
                  <ArrowRight size={14} className="rtl:rotate-180" />
                </Link>

                <Link
                  to={`/rotations/${plan.plan_id}/customize`}
                  className="btn-secondary w-full !py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <Sliders size={13} className="text-leaf" />
                  <span>{t('plan.customize')}</span>
                </Link>
              </div>
            </motion.article>
          )
        })}
      </div>
      )}

      <p className="mt-2 text-xs text-ink-light text-center">{t('plan.scoreNote')}</p>
    </motion.div>
  )
}
