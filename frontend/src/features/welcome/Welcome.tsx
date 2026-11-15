import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  MapPin,
  Satellite,
  ShieldCheck,
  Sparkles,
  Layers,
  SlidersHorizontal,
  CloudRain,
  ChevronRight,
  Database,
  Sprout,
  CheckCircle2,
  Calendar,
  Compass,
  ArrowRightLeft
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'

import { api, type DashboardItem } from '../../api/client'
import { useWizard } from '../../state/wizard'
import { CropVisual } from '../../app/components/CropVisual'
import { FieldPolygonThumbnail } from '../../app/components/FieldPolygonThumbnail'

interface DemoPreset {
  name: string
  nameAr: string
  area: number
  lat: number
  lon: number
  geometry: { type: string; coordinates: number[][][] }
  temp: number
  precipMm: number
  precipDaily: number
  ph: number
  soilType: string
  soilTypeAr: string
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    name: 'Meknès Valley, Morocco',
    nameAr: 'سهل مكناس، المغرب',
    area: 1.15,
    lat: 33.8938,
    lon: -5.5473,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-5.549, 33.892],
          [-5.545, 33.893],
          [-5.546, 33.896],
          [-5.550, 33.895],
          [-5.549, 33.892],
        ],
      ],
    },
    temp: 20.1,
    precipMm: 609,
    precipDaily: 1.67,
    ph: 7.8,
    soilType: 'Clay Loam',
    soilTypeAr: 'طمي طيني',
  },
  {
    name: 'Gharb Basin, Morocco',
    nameAr: 'حوض الغرب، المغرب',
    area: 2.40,
    lat: 34.251,
    lon: -6.012,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-6.015, 34.249],
          [-6.009, 34.250],
          [-6.010, 34.254],
          [-6.016, 34.253],
          [-6.015, 34.249],
        ],
      ],
    },
    temp: 19.4,
    precipMm: 545,
    precipDaily: 1.49,
    ph: 7.2,
    soilType: 'Silky Clay',
    soilTypeAr: 'طيني غريني',
  },
]

export default function Welcome() {
  const { t, i18n } = useTranslation()
  const { resetWizard } = useWizard()
  const isArabic = i18n.language === 'ar'

  // Returning visitor check
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
    staleTime: 10_000,
    retry: 0,
  })
  const hasFarm = (dashboard?.length ?? 0) > 0
  const savedFarm = dashboard?.[0]

  // Interactive Demo State
  const [activeStage, setActiveStage] = useState<1 | 2 | 3 | 4>(1)
  const [selectedPreset, setSelectedPreset] = useState<DemoPreset>(DEMO_PRESETS[0])
  const [customizedCrop, setCustomizedCrop] = useState<string>('potato')

  const rotationSequence = [
    { crop_id: 'bread_wheat', year_number: 1, name_en: 'Bread wheat', name_ar: 'قمح طري' },
    { crop_id: 'chickpea', year_number: 2, name_en: 'Chickpea', name_ar: 'حمص' },
    {
      crop_id: customizedCrop,
      year_number: 3,
      name_en: customizedCrop === 'potato' ? 'Potato' : customizedCrop === 'lentil' ? 'Lentil' : 'Sunflower',
      name_ar: customizedCrop === 'potato' ? 'بطاطس' : customizedCrop === 'lentil' ? 'عدس' : 'دوار الشمس',
    },
  ]

  return (
    <div className="space-y-16 pb-20">
      {/* Returning Farmer Notification Ribbon */}
      {hasFarm && savedFarm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-leaf/40 bg-leaf/10 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-leaf animate-pulse" />
            <div>
              <p className="text-xs font-bold text-forest">
                {isArabic ? 'لديك حقل محفوظ في هذا المتصفح:' : 'You have an active farm saved in this browser:'}{' '}
                <span className="font-extrabold text-forest underline"><bdi>{savedFarm.field_name || 'My field'}</bdi></span>
                {savedFarm.area_ha != null && ` (${savedFarm.area_ha.toFixed(1)} ha)`}
              </p>
            </div>
          </div>
          <Link
            to="/home"
            className="btn-primary !py-1.5 !px-4 text-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>{t('welcome.reprise')}</span>
            <ArrowRight size={13} className="rtl:rotate-180" />
          </Link>
        </motion.div>
      )}

      {/* 1. OPENING SCENE: FROM EARTH TO YOUR FIELD */}
      <section className="grid gap-8 lg:grid-cols-12 items-center pt-2">
        {/* Left Column: Mission, Signature Copy & CTAs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Scientific Provenance Kicker */}
          <div className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-forest/5 px-3 py-1 text-xs font-semibold text-forest shadow-2xs">
            <Satellite size={13} className="text-leaf" />
            <span>Earth Observation × Agricultural Intelligence · NASA Space Apps</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.12] text-forest tracking-tight">
            <span>{t('welcome.tagline')}</span>
            <span className="block text-xl sm:text-2xl font-semibold text-leaf mt-2">{t('welcome.heading')}</span>
          </h1>

          <p className="text-base sm:text-lg text-ink/75 leading-relaxed max-w-xl">
            {t('welcome.body')}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Link
              to="/fields/new"
              onClick={() => resetWizard()}
              className="btn-primary text-sm sm:text-base px-6 py-3.5 shadow-md group inline-flex items-center gap-2"
            >
              <span>{t('welcome.ctaPrimary')}</span>
              <span className="sr-only"> ({t('welcome.cta')})</span>
              <ArrowRight className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" size={17} />
            </Link>

            <a
              href="#how-it-works"
              className="btn-secondary text-sm sm:text-base px-6 py-3.5 inline-flex items-center gap-2"
            >
              <span>{t('welcome.ctaSecondary')}</span>
              <ChevronRight size={16} className="rtl:rotate-180" />
            </a>
          </div>

          {/* Privacy & Provenance Subtitle */}
          <div className="flex items-center gap-2 text-xs text-ink/60 pt-1">
            <ShieldCheck size={14} className="text-leaf shrink-0" />
            <span>{t('welcome.anonNote')}</span>
          </div>
        </div>

        {/* Right Column: Visual Cadastral Aerial Composition */}
        <div className="lg:col-span-5">
          <div className="relative rounded-3xl overflow-hidden border border-line bg-white shadow-xl">
            <div className="relative h-64 sm:h-72 w-full overflow-hidden">
              <img
                src="/assets/hero_earth_fields.jpg"
                alt="Agricultural fields seen from satellite"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-forest/20 to-transparent" />

              {/* Cadastral Polygon Overlay Badge */}
              <div className="absolute top-4 start-4 rounded-xl bg-white/90 backdrop-blur-md border border-line/80 px-3 py-1.5 shadow-md text-xs font-mono">
                <span className="font-bold text-forest">33.89°N, 5.54°W</span>
                <span className="text-ink/40 ms-2">Meknès</span>
              </div>

              {/* 3-Year Crop Succession Card Float */}
              <div className="absolute bottom-4 inset-x-4 rounded-2xl bg-white/95 backdrop-blur-md border border-line p-3 shadow-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50 block mb-1.5">
                  {t('welcome.multiSeasonSuccession')}
                </span>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 rounded-lg border border-line bg-cream/70 px-2 py-1 text-xs font-bold text-forest">
                    <span>Y1</span> <span className="font-normal text-ink/70">{isArabic ? 'قمح' : 'Wheat'}</span>
                  </div>
                  <span className="text-ink/30 text-xs font-bold" aria-hidden>→</span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-line bg-cream/70 px-2 py-1 text-xs font-bold text-forest">
                    <span>Y2</span> <span className="font-normal text-ink/70">{isArabic ? 'حمص' : 'Chickpea'}</span>
                  </div>
                  <span className="text-ink/30 text-xs font-bold" aria-hidden>→</span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-line bg-cream/70 px-2 py-1 text-xs font-bold text-forest">
                    <span>Y3</span> <span className="font-normal text-ink/70">{isArabic ? 'بطاطس' : 'Potato'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SIGNATURE INTERACTIVE EXPERIENCE: THE PRODUCT JOURNEY */}
      <section id="how-it-works" className="space-y-6 pt-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-3 py-0.5 text-xs font-semibold text-forest">
            <Sparkles size={13} className="text-leaf" />
            <span>{isArabic ? 'العرض التفاعلي الحي' : 'Interactive Product Journey'}</span>
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
            {isArabic ? 'شاهد كيف يعمل فيلد شيفت' : 'Experience How Field Shift Works'}
          </h2>
          <p className="text-xs sm:text-sm text-ink/70">
            {isArabic
              ? 'جرّب الخطوات الأربع الحقيقية لتحويل إحداثيات أرضك إلى خطة دورة زراعية مخصصة.'
              : 'Step through the four authentic stages: from boundary mapping and Earth telemetry to customized crop planning.'}
          </p>
        </div>

        {/* 4-Stage Interactive Stepper Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-4xl mx-auto">
          {[
            { num: 1, title: isArabic ? '١. حدد الحقل' : '1. Select Field', icon: MapPin },
            { num: 2, title: isArabic ? '٢. افهم الظروف' : '2. Earth Telemetry', icon: Satellite },
            { num: 3, title: isArabic ? '٣. استكشف الدورات' : '3. Rotations', icon: Layers },
            { num: 4, title: isArabic ? '٤. خصص خطتك' : '4. Customize Plan', icon: SlidersHorizontal },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setActiveStage(s.num as 1 | 2 | 3 | 4)}
              className={`rounded-2xl border p-3 text-start transition-all ${
                activeStage === s.num
                  ? 'border-forest bg-forest text-white shadow-md'
                  : 'border-line bg-white text-ink/70 hover:border-forest/40 hover:bg-cream/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <s.icon size={15} className={activeStage === s.num ? 'text-leaf' : 'text-forest/60'} />
                <span className="text-xs font-bold truncate">{s.title}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Interactive Canvas Box */}
        <div className="card overflow-hidden border border-line bg-white shadow-md max-w-4xl mx-auto p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {/* STAGE 1: SELECT A FIELD */}
            {activeStage === 1 && (
              <motion.div
                key="stage-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-forest">
                      {isArabic ? 'الخطوة الأولى: رسم وتحديد الحقل' : 'Stage 1: Field Cadastral Boundary'}
                    </h3>
                    <p className="text-xs text-ink/60">
                      {isArabic ? 'اختر موقعاً تجريبياً أو ارسم حدود حقلك' : 'Select a sample territory to view cadastral geodesic calculations:'}
                    </p>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1.5">
                    {DEMO_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSelectedPreset(p)}
                        className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all ${
                          selectedPreset.name === p.name
                            ? 'bg-forest text-white shadow-2xs'
                            : 'border border-line bg-cream/70 text-ink/70 hover:bg-white'
                        }`}
                      >
                        {isArabic ? p.nameAr : p.name.split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-12 items-center">
                  <div className="sm:col-span-6 h-52">
                    <FieldPolygonThumbnail
                      geometry={selectedPreset.geometry}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="sm:col-span-6 space-y-3">
                    <div className="rounded-xl border border-line bg-cream/50 p-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink/60">{t('welcome.location')}:</span>
                        <span className="font-bold text-forest">{isArabic ? selectedPreset.nameAr : selectedPreset.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink/60">{t('welcome.geodesicArea')}:</span>
                        <span className="font-mono font-bold text-forest">{selectedPreset.area} {t('common.hectare')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink/60">{t('home.centroid')}:</span>
                        <span className="font-mono text-ink/70">{selectedPreset.lat}°N, {selectedPreset.lon}°E</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveStage(2)}
                      className="btn-leaf w-full !py-2.5 text-xs inline-flex items-center justify-center gap-1.5"
                    >
                      <span>{isArabic ? 'انتقل لتحليل بيانات الأرض' : 'Inspect Earth Telemetry'}</span>
                      <ArrowRight size={13} className="rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STAGE 2: UNDERSTAND CONDITIONS */}
            {activeStage === 2 && (
              <motion.div
                key="stage-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="border-b border-line pb-4">
                  <h3 className="font-display text-lg font-bold text-forest">
                    {isArabic ? 'الخطوة الثانية: استرداد بيانات الأرض العلمية' : 'Stage 2: Scientific Earth Observation Telemetry'}
                  </h3>
                  <p className="text-xs text-ink/60">
                    {isArabic
                      ? 'رصد مناخي وتربوي مباشر من NASA POWER و ISRIC SoilGrids 2020'
                      : 'Scientific multi-decade climatology and 250m soil chemistry layers for this coordinate:'}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-sky/30 bg-sky/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                      <CloudRain size={16} className="text-sky-700" />
                      <span>NASA POWER Climatology (0.5° × 0.5°)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <div className="rounded-xl bg-white p-2.5 border border-line">
                        <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.annualMeanTemp')}</span>
                        <span className="font-display text-lg font-extrabold text-forest">{selectedPreset.temp} °C</span>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-line">
                        <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.annualRainfall')}</span>
                        <span className="font-display text-lg font-extrabold text-forest">{selectedPreset.precipMm} mm/yr</span>
                        <span className="text-[9px] font-mono text-ink/40 block">({selectedPreset.precipDaily} mm/day)</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-leaf/30 bg-leaf/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-forest font-bold text-xs">
                      <Layers size={16} className="text-leaf" />
                      <span>ISRIC SoilGrids 2020 (250m Resolution)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <div className="rounded-xl bg-white p-2.5 border border-line">
                        <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.soilPh')}</span>
                        <span className="font-display text-lg font-extrabold text-forest">{selectedPreset.ph} pH</span>
                        <span className="text-[9px] text-leaf font-bold block">{t('welcome.optimal')}</span>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-line">
                        <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.texturalClass')}</span>
                        <span className="font-display text-sm font-extrabold text-forest truncate block">{isArabic ? selectedPreset.soilTypeAr : selectedPreset.soilType}</span>
                        <span className="text-[9px] text-ink/50 block">Clay 34% / Silt 33%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStage(3)}
                    className="btn-leaf !py-2.5 text-xs inline-flex items-center gap-1.5"
                  >
                    <span>{isArabic ? 'عرض استراتيجيات الدورات الزراعية' : 'Generate Rotation Strategies'}</span>
                    <ArrowRight size={13} className="rtl:rotate-180" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STAGE 3: EXPLORE ROTATIONS */}
            {activeStage === 3 && (
              <motion.div
                key="stage-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="border-b border-line pb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold text-forest">
                      {isArabic ? 'الخطوة الثالثة: استكشاف الدورات الزراعية متعددة السنوات' : 'Stage 3: Multi-Year Rotation Strategy'}
                    </h3>
                    <p className="text-xs text-ink/60">
                      {isArabic ? 'خطة متوازنة بين كفاءة المياه، استعادة خصوبة التربة، واستدامة الإنتاج' : 'A balanced sequence designed for soil health, biological nitrogen fixation, and climate resilience:'}
                    </p>
                  </div>
                  <span className="rounded-full bg-leaf/15 text-forest border border-leaf/30 px-3 py-1 text-xs font-bold">
                    {t('welcome.agronomicFit')}: 86 / 100
                  </span>
                </div>

                {/* 3-Year Crop Strip */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {rotationSequence.map((slot, index) => (
                    <div
                      key={slot.year_number}
                      className="relative rounded-2xl border border-line bg-cream/50 p-4 flex flex-col items-center justify-between"
                    >
                      <span className="text-[10px] font-mono font-bold text-forest bg-forest/10 px-2 py-0.5 rounded self-start">
                        {t('timeline.year', { n: slot.year_number })}
                      </span>
                      <div className="my-1">
                        <CropVisual
                          slot={slot}
                          size="sm"
                          showBadge={false}
                          className="!bg-transparent !border-0 !shadow-none"
                        />
                      </div>
                      {index < rotationSequence.length - 1 && (
                        <div className="hidden sm:flex absolute -end-2.5 top-1/2 -translate-y-1/2 z-10 h-5 w-5 items-center justify-center rounded-full bg-white border border-line text-forest" aria-hidden>
                          <ArrowRight size={10} className="rtl:rotate-180" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Score Indicators preview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-xl border border-line bg-cream/40 p-2 text-center">
                    <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.waterFit')}</span>
                    <span className="font-bold text-forest">84%</span>
                  </div>
                  <div className="rounded-xl border border-line bg-cream/40 p-2 text-center">
                    <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.soilHealth')}</span>
                    <span className="font-bold text-leaf">92%</span>
                  </div>
                  <div className="rounded-xl border border-line bg-cream/40 p-2 text-center">
                    <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.yieldBaseline')}</span>
                    <span className="font-bold text-amber-800">88%</span>
                  </div>
                  <div className="rounded-xl border border-line bg-cream/40 p-2 text-center">
                    <span className="text-[10px] text-ink/50 uppercase block">{t('welcome.climateRisk')}</span>
                    <span className="font-bold text-forest">80%</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStage(4)}
                    className="btn-leaf !py-2.5 text-xs inline-flex items-center gap-1.5"
                  >
                    <span>{isArabic ? 'جرّب تعديل المحاصيل (تفاعلي)' : 'Try Customizing Crops'}</span>
                    <ArrowRight size={13} className="rtl:rotate-180" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STAGE 4: CUSTOMIZE YOUR PLAN */}
            {activeStage === 4 && (
              <motion.div
                key="stage-4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="border-b border-line pb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold text-forest">
                      {isArabic ? 'الخطوة الرابعة: تخصيص واستبدال المحاصيل' : 'Stage 4: Customization & Replacement Verification'}
                    </h3>
                    <p className="text-xs text-ink/60">
                      {isArabic
                        ? 'انقر لاستبدال محصول السنة الثالثة بمحصول مؤهل علمياً ولاحظ إعادة الحساب التلقائية:'
                        : 'Click to replace Year 3 with an eligible crop and watch agronomic rules verify feasibility in real time:'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 px-3 py-1 text-xs font-bold">
                    <CheckCircle2 size={13} />
                    {t('welcome.rulesPassed')}
                  </span>
                </div>

                {/* Candidate Selector buttons */}
                <div>
                  <span className="text-xs font-bold text-forest uppercase tracking-wider block mb-2">
                    {isArabic ? 'اختر بديلاً مؤهلاً للسنة الثالثة:' : 'Select an eligible candidate for Year 3:'}
                  </span>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {[
                      { id: 'potato', name: 'Potato (Solanaceae)', note: 'Deep-root tuber' },
                      { id: 'lentil', name: 'Lentil (Fabaceae)', note: 'High water conservation' },
                      { id: 'sunflower', name: 'Sunflower (Asteraceae)', note: 'Deep taproot structure' },
                    ].map((crop) => (
                      <button
                        key={crop.id}
                        type="button"
                        onClick={() => setCustomizedCrop(crop.id)}
                        className={`rounded-2xl border p-3 text-start transition-all ${
                          customizedCrop === crop.id
                            ? 'border-leaf bg-leaf/10 ring-2 ring-leaf text-forest'
                            : 'border-line bg-cream/40 hover:bg-white text-ink/70'
                        }`}
                      >
                        <span className="font-bold text-xs block text-forest">{crop.name}</span>
                        <span className="text-[11px] text-ink/50">{crop.note}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Updated Sequence display */}
                <div className="rounded-2xl border border-line bg-cream/40 p-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-forest">Your Modified 3-Year Sequence:</span>
                    <span className="font-mono text-leaf font-bold">Eligible & Feasible</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-forest">
                      Year 1: Bread Wheat
                    </div>
                    <span className="text-ink/30 font-bold" aria-hidden>→</span>
                    <div className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-forest">
                      Year 2: Chickpea (N₂ Fixer)
                    </div>
                    <span className="text-ink/30 font-bold" aria-hidden>→</span>
                    <div className="rounded-xl border-2 border-leaf bg-white px-3 py-1.5 text-xs font-bold text-forest shadow-sm">
                      Year 3: {customizedCrop === 'potato' ? 'Potato' : customizedCrop === 'lentil' ? 'Lentil' : 'Sunflower'} (Customized)
                    </div>
                  </div>
                </div>

                {/* Final Call to Action inside Demo */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line">
                  <p className="text-xs text-ink/60">
                    {t('welcome.readyToRun')}
                  </p>
                  <Link
                    to="/fields/new"
                    onClick={() => resetWizard()}
                    className="btn-primary !py-2.5 text-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>{t('welcome.ctaPrimary')}</span>
                    <ArrowRight size={13} className="rtl:rotate-180" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 3. EXPLAIN WHAT MAKES FIELD SHIFT USEFUL (4 Distinct Capabilities) */}
      <section className="space-y-6 pt-4">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="font-display text-2xl font-extrabold text-forest">
            {isArabic ? 'ماذا يقدم فيلد شيفت لأرضك؟' : 'Why Field Shift is Different'}
          </h2>
          <p className="text-xs sm:text-sm text-ink/60">
            {isArabic ? 'علم حقيقي، شفافية كاملة، وتحكم فلاحي تام' : 'Real Earth science, complete provenance, and farmer-controlled decisions.'}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-5 border border-line bg-white shadow-2xs space-y-2 hover:border-forest/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/5 text-forest">
              <MapPin size={20} />
            </div>
            <h3 className="font-display text-base font-bold text-forest">
              {isArabic ? 'افهم أرضك' : 'Understand Your Land'}
            </h3>
            <p className="text-xs text-ink/70 leading-relaxed">
              {isArabic
                ? 'ارسم حدود حقلك واطلع على رصد مناخي وتربوي مباشر من بيانات ناسا ومعهد ISRIC.'
                : 'Map exact field boundaries and view 30-year climatology and 250m soil horizon estimates.'}
            </p>
          </div>

          <div className="card p-5 border border-line bg-white shadow-2xs space-y-2 hover:border-forest/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf/10 text-leaf">
              <Layers size={20} />
            </div>
            <h3 className="font-display text-base font-bold text-forest">
              {isArabic ? 'استكشف خيارات الدورات' : 'Multi-Season Rotations'}
            </h3>
            <p className="text-xs text-ink/70 leading-relaxed">
              {isArabic
                ? 'دورات زراعية علمية تراعي كسر دورات الآفات وتثبيت النيتروجين والحفاظ على رطوبة التربة.'
                : 'Rule-based multi-year rotations designed to break pest cycles, fix nitrogen, and conserve water.'}
            </p>
          </div>

          <div className="card p-5 border border-line bg-white shadow-2xs space-y-2 hover:border-forest/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber/15 text-amber-900">
              <SlidersHorizontal size={20} />
            </div>
            <h3 className="font-display text-base font-bold text-forest">
              {isArabic ? 'خصّص خطتك بنفسك' : 'Customize Eligible Crops'}
            </h3>
            <p className="text-xs text-ink/70 leading-relaxed">
              {isArabic
                ? 'استبدل أي محصول ببدائل مؤهلة وافحص الفروقات والتأثيرات الزراعية فوراً.'
                : 'Swap crops with eligible alternatives and immediately evaluate impacts on soil and water balance.'}
            </p>
          </div>

          <div className="card p-5 border border-line bg-white shadow-2xs space-y-2 hover:border-forest/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky/15 text-sky-800">
              <Calendar size={20} />
            </div>
            <h3 className="font-display text-base font-bold text-forest">
              {isArabic ? 'تابع جدول الأنشطة' : 'Keep & Track Over Time'}
            </h3>
            <p className="text-xs text-ink/70 leading-relaxed">
              {isArabic
                ? 'احتفظ بدورتك في متصفحك دون حساب وسجّل مواعيد الزراعة والحصاد الفعلية.'
                : 'Save plans locally without passwords and track farmer-reported planting and harvest records.'}
            </p>
          </div>
        </div>
      </section>

      {/* 4. SCIENTIFIC CREDIBILITY & PROVENANCE */}
      <section className="rounded-3xl border border-line bg-cream/50 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/70 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50 block">
              {t('welcome.sources.openScience')}
            </span>
            <h3 className="font-display text-xl font-extrabold text-forest">
              {t('welcome.sources.title')}
            </h3>
          </div>
          <span className="text-xs font-mono text-ink/50">
            {t('welcome.sources.initiative')}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-4 space-y-1.5">
            <span className="font-mono text-xs font-bold text-sky-800">NASA POWER</span>
            <h4 className="font-bold text-sm text-forest">{t('welcome.sources.climatology')}</h4>
            <p className="text-[11px] text-ink/65 leading-relaxed">
              {t('welcome.sources.climatologyDesc')}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 space-y-1.5">
            <span className="font-mono text-xs font-bold text-leaf">ISRIC SoilGrids 2020</span>
            <h4 className="font-bold text-sm text-forest">{t('welcome.sources.soil')}</h4>
            <p className="text-[11px] text-ink/65 leading-relaxed">
              {t('welcome.sources.soilDesc')}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 space-y-1.5">
            <span className="font-mono text-xs font-bold text-amber-800">FAO GAEZ v5</span>
            <h4 className="font-bold text-sm text-forest">{t('welcome.sources.gaez')}</h4>
            <p className="text-[11px] text-ink/65 leading-relaxed">
              {t('welcome.sources.gaezDesc')}
            </p>
          </div>
        </div>

        {/* Honest Transparency Callout */}
        <div className="border-t border-line/70 pt-4 text-xs text-ink/60 leading-relaxed space-y-1">
          <p className="font-semibold text-forest">
            {t('app.poweredBy')} · {t('app.noNasaEndorsement')}
          </p>
          <p>
            {t('disclaimer.body')}
          </p>
          <p className="text-[11px] text-ink/50">
            {t('disclaimer.soil')} · {t('disclaimer.yield')}
          </p>
        </div>
      </section>

      {/* 5. CLOSING CTA BANNER */}
      <section className="text-center rounded-3xl bg-forest p-8 sm:p-12 text-white shadow-xl space-y-4">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          {isArabic ? 'جاهز لاستكشاف الدورة الزراعية لأرضك؟' : 'Ready to Map Your Land?'}
        </h2>
        <p className="text-xs sm:text-sm text-white/80 max-w-md mx-auto leading-relaxed">
          {isArabic
            ? 'حدد أرضك على الخريطة في أقل من دقيقة وابدأ في مقارنة الاستراتيجيات الممكنة.'
            : 'Select your field on the interactive satellite map and discover evidence-backed rotation strategies in under two minutes.'}
        </p>
        <div className="pt-2">
          <Link
            to="/fields/new"
            onClick={() => resetWizard()}
            className="btn-leaf text-base px-8 py-3.5 shadow-lg inline-flex items-center gap-2"
          >
            <span>{t('welcome.ctaPrimary')}</span>
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  )
}
