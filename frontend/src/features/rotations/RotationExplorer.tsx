import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles,
  TriangleAlert,
  Info,
  Compass,
  Search,
  Radar,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type RotationListOut } from '../../api/client'
import { PlanCard } from './PlanCard'


export default function RotationExplorer() {
  const { t, i18n } = useTranslation()
  const { fieldId } = useParams()
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
        <div className="grid gap-4 lg:grid-cols-3 items-stretch">
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
            .map(plan => <PlanCard key={plan.plan_id} plan={plan} />)}
      </div>
      )}

      <p className="mt-2 text-xs text-ink-light text-center">{t('plan.scoreNote')}</p>
    </motion.div>
  )
}
