import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, MapPin, ClipboardList, BarChart3, Satellite, ShieldCheck, Sparkles, Layers, ArrowRightLeft } from 'lucide-react'
import { motion } from 'framer-motion'

import { useQuery } from '@tanstack/react-query'
import { api, type DashboardItem } from '../../api/client'
import { useWizard } from '../../state/wizard'
import { CropVisual } from '../../app/components/CropVisual'

export default function Welcome() {
  const { t, i18n } = useTranslation()
  const { resetWizard } = useWizard()
  const isArabic = i18n.language === 'ar'

  // Returning visitor: is there already a saved farm?
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
    staleTime: 10_000,
    retry: 0,
  })
  const hasFarm = (dashboard?.length ?? 0) > 0

  // 3-Year Sample Sequence for Live Interactive Preview
  const previewRotation = [
    { crop_id: 'bread_wheat', year_number: 1, name_en: 'Bread Wheat', name_ar: 'قمح طري' },
    { crop_id: 'chickpea', year_number: 2, name_en: 'Chickpea', name_ar: 'حمص' },
    { crop_id: 'potato', year_number: 3, name_en: 'Potato', name_ar: 'بطاطس' },
  ]

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="grid gap-8 lg:grid-cols-12 items-center">
        {/* Left Column: Mission, Editorial Typography & CTA */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-7 flex flex-col justify-center"
        >
          {/* Scientific Provenance Kicker */}
          <div className="inline-flex items-center gap-2 rounded-full border border-leaf/30 bg-leaf-soft px-3 py-1 text-xs font-bold text-forest mb-4 self-start shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-leaf animate-ping" />
            <Satellite size={13} className="text-leaf" />
            <span>{t('app.title')} · NASA Space Apps</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.15] text-forest tracking-tight">
            {t('welcome.heading')}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-ink-muted leading-relaxed max-w-xl">
            {t('welcome.body')}
          </p>

          {/* Key Value Cards */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3 max-w-2xl">
            <div className="card p-3.5 flex flex-col items-start gap-2 bg-white/70 hover:bg-white hover:border-leaf/40 transition-all">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10 text-forest">
                <MapPin size={17} />
              </span>
              <div>
                <p className="text-xs font-bold text-forest">{t('steps.field')}</p>
                <p className="text-[11px] text-ink-light mt-0.5">{t('field.drawHint')}</p>
              </div>
            </div>

            <div className="card p-3.5 flex flex-col items-start gap-2 bg-white/70 hover:bg-white hover:border-leaf/40 transition-all">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10 text-forest">
                <ClipboardList size={17} />
              </span>
              <div>
                <p className="text-xs font-bold text-forest">{t('q.title')}</p>
                <p className="text-[11px] text-ink-light mt-0.5">{t('q.subtitle')}</p>
              </div>
            </div>

            <div className="card p-3.5 flex flex-col items-start gap-2 bg-white/70 hover:bg-white hover:border-leaf/40 transition-all">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10 text-forest">
                <BarChart3 size={17} />
              </span>
              <div>
                <p className="text-xs font-bold text-forest">{t('steps.plans')}</p>
                <p className="text-[11px] text-ink-light mt-0.5">{t('plans.subtitle')}</p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/fields/new"
              onClick={() => resetWizard()}
              className="btn-leaf text-base px-8 py-3.5 shadow-lg group"
            >
              <span>{t('welcome.cta')}</span>
              <ArrowRight className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" size={18} />
            </Link>

            {hasFarm && (
              <Link to="/home" className="btn-secondary text-sm px-6 py-3">
                {t('welcome.reprise')}
              </Link>
            )}
          </div>

          {/* Trust and Privacy Note */}
          <div className="mt-5 flex items-center gap-2 text-xs text-ink-light">
            <ShieldCheck size={14} className="text-leaf shrink-0" />
            <span>{t('welcome.anonNote')}</span>
          </div>
        </motion.section>

        {/* Right Column: Hero Visual with Overlaid 3-Year Interactive Preview */}
        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="lg:col-span-5"
        >
          <div className="card-elevated overflow-hidden border border-line shadow-card-hover bg-white">
            {/* Cinematic Farmland Header with Real AI Hero Visual */}
            <div className="relative h-56 sm:h-64 overflow-hidden">
              <img
                src="/assets/hero_earth_fields.jpg"
                alt="Agricultural fields viewed from above at golden hour"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/40 to-transparent" />

              {/* Badges on Hero */}
              <div className="absolute top-4 start-4 flex items-center gap-2">
                <span className="badge-glow bg-white/90 text-forest text-[11px] backdrop-blur-md shadow-md">
                  <Sparkles size={11} className="text-leaf" /> Earth Observation Active
                </span>
              </div>

              {/* Banner Text */}
              <div className="absolute bottom-4 start-5 end-5 text-white">
                <p className="text-[11px] font-mono uppercase tracking-widest text-mint font-bold flex items-center gap-1.5">
                  <Layers size={12} /> {t('steps.plans')}
                </p>
                <p className="text-lg sm:text-xl font-extrabold leading-snug mt-1 text-white drop-shadow">
                  {t('plans.subtitle')}
                </p>
              </div>
            </div>

            {/* 3-Year Interactive Crop Rotation Demo Preview */}
            <div className="p-5 bg-gradient-to-b from-white to-cream-warm/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-light font-mono">
                  {isArabic ? 'دورة زراعية ثلاثية نموذجية' : 'Sample 3-Year Balanced Sequence'}
                </span>
                <span className="text-[10px] font-bold text-leaf bg-leaf-soft px-2 py-0.5 rounded-full">
                  N₂ Balanced
                </span>
              </div>

              {/* Crop Sequence Flow */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {previewRotation.map((slot, idx) => (
                  <div key={slot.crop_id} className="relative flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-light mb-1 font-mono">
                      {t(`common.year${idx + 1}`)}
                    </span>
                    <CropVisual
                      slot={slot}
                      size="sm"
                      interactive
                      showFamily
                      className="w-full bg-white"
                    />
                    {idx < 2 && (
                      <span className="hidden sm:block absolute -end-2 top-1/2 -translate-y-1/2 z-10 text-leaf/60 font-bold rtl:rotate-180">
                        ›
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Benefits Tagline */}
              <div className="mt-4 rounded-xl bg-leaf-soft/60 border border-leaf/20 p-2.5 flex items-center gap-2 text-xs text-forest">
                <Sparkles size={14} className="text-leaf shrink-0" />
                <span className="text-[11px] font-medium leading-tight">
                  {isArabic
                    ? 'تناوب الحبوب والبقوليات والدرنات يعيد توازن خصوبة التربة والنيتروجين ويقلل ضغط الآفات.'
                    : 'Cereal-legume-tuber succession restores soil organic carbon, balances moisture, and cuts pest cycles.'}
                </span>
              </div>
            </div>

            {/* Scientific Honest Disclaimer */}
            <div className="px-5 pb-5 pt-1">
              <div className="rounded-xl bg-cream border border-line p-3 text-[11px] text-ink-muted leading-relaxed">
                {t('disclaimer.body')}
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
