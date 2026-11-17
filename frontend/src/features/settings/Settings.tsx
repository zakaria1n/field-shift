import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Globe,
  SlidersHorizontal,
  Target,
  Trash2,
  Database,
  ArrowLeft,
  Sliders,
  ShieldAlert
} from 'lucide-react'

import { clearAccessKey } from '../../state/accessKey'
import { useWizard, type Priorities } from '../../state/wizard'
import LanguageSwitch from '../../app/components/LanguageSwitch'
import { rebalance } from '../farm-profile/prioritiesMath'

const PRIORITY_META = {
  water: { labelKey: 'mixer.water', color: 'bg-sky text-sky-900', barBg: 'bg-sky' },
  soil: { labelKey: 'mixer.soil', color: 'bg-leaf text-emerald-950', barBg: 'bg-leaf' },
  yield: { labelKey: 'mixer.yield', color: 'bg-amber text-amber-950', barBg: 'bg-amber' },
  risk: { labelKey: 'mixer.risk', color: 'bg-forest text-white', barBg: 'bg-forest' },
} as const

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { lang, setLang, priorities, setPriorities, answers, setAnswers } = useWizard()
  const [cleared, setCleared] = useState(false)
  const isArabic = i18n.language === 'ar'

  const keys = ['water', 'soil', 'yield', 'risk'] as const
  const total = Object.values(priorities).reduce((a, b) => a + b, 0)

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      {/* Clean Utility Header (No AI marketing banner on a settings screen!) */}
      <div className="border-b border-line pb-6">
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest/70 hover:text-forest transition-colors mb-3"
        >
          <ArrowLeft size={13} className="rtl:rotate-180" />
          <span>{t('nav.home')}</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest/5 text-forest border border-forest/15">
            <Sliders size={18} />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
              {t('settings.title')}
            </h1>
            <p className="text-xs sm:text-sm text-ink/70">
              {isArabic
                ? 'تحديد أوزان الأولويات الاستراتيجية وأهداف الإنتاج الفلاحي وإعدادات اللغة.'
                : 'Configure strategic priority weights, farm production goals, and application preferences.'}
            </p>
          </div>
        </div>
      </div>

      {/* Language Preference Card */}
      <section className="card border border-line bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-line/60 pb-3">
          <Globe size={16} className="text-forest" />
          <h2 className="font-display text-base font-bold text-forest">
            {t('settings.language')}
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <LanguageSwitch lang={lang} onChange={setLang} />
          <div className="rounded-xl border border-line bg-cream/50 px-3 py-2 text-xs text-ink/70">
            {lang === 'ar' ? (
              <span>العربية نشطة: اتجاه القراءة من اليمين إلى اليسار (RTL)</span>
            ) : (
              <span>English active: Left-to-right reading direction (LTR)</span>
            )}
          </div>
        </div>
      </section>

      {/* Strategic Priority Weights Mixer */}
      <section className="card border border-line bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal size={16} className="text-forest" />
            <h2 className="font-display text-base font-bold text-forest">
              {t('mixer.title')}
            </h2>
          </div>
          <span className="font-mono text-xs font-bold text-forest">
            {t('mixer.total')}: {total}%
          </span>
        </div>

        <p className="text-xs text-ink/60">
          {t('mixer.balanceNote')}
        </p>

        {/* 100% Linked Visual Allocation Ribbon */}
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-cream shadow-inner border border-line">
          <div className="flex h-full w-full">
            <div style={{ width: `${priorities.water}%` }} className="bg-sky transition-all duration-300" title={`Water: ${priorities.water}%`} />
            <div style={{ width: `${priorities.soil}%` }} className="bg-leaf transition-all duration-300" title={`Soil: ${priorities.soil}%`} />
            <div style={{ width: `${priorities.yield}%` }} className="bg-amber transition-all duration-300" title={`Productivity: ${priorities.yield}%`} />
            <div style={{ width: `${priorities.risk}%` }} className="bg-forest transition-all duration-300" title={`Climate Risk: ${priorities.risk}%`} />
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-3 pt-1">
          {keys.map((k) => {
            const meta = PRIORITY_META[k]
            return (
              <div key={k} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-forest">
                    {t(meta.labelKey)}
                  </span>
                  <span className="font-mono text-xs font-bold text-forest">
                    {priorities[k]}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={priorities[k]}
                  aria-label={t('aria.slider', { label: t(meta.labelKey) })}
                  onChange={(e) => setPriorities(rebalance(priorities as Priorities, k, Number(e.target.value)))}
                  className="w-full h-1.5 rounded-lg bg-cream cursor-pointer accent-[#24A06B]"
                />
              </div>
            )
          })}
        </div>
      </section>

      {/* Production Goals Card */}
      <section className="card border border-line bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-line/60 pb-3">
          <Target size={16} className="text-forest" />
          <h2 className="font-display text-base font-bold text-forest">
            {t('q.purposes.title')}
          </h2>
        </div>

        <p className="text-xs text-ink/60">
          {t('q.purposes.desc')}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {(['sell', 'livestock_feed', 'household_food', 'soil_restoration'] as const).map((p) => {
            const active = answers.purposes.includes(p)
            return (
              <button
                key={p}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setAnswers({
                    ...answers,
                    purposes: active ? answers.purposes.filter((x) => x !== p) : [...answers.purposes, p],
                  })
                }
                className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                  active
                    ? 'border-leaf bg-leaf/15 text-forest ring-1 ring-leaf'
                    : 'border-line bg-cream/50 text-ink/70 hover:border-forest/40 hover:bg-white'
                }`}
              >
                {t(`q.purposes.${p}`)}
              </button>
            )
          })}
        </div>
      </section>

      {/* Anonymous Data & Privacy Management */}
      <section className="card border border-amber/30 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={16} className="text-amber-700" />
            <h2 className="font-display text-base font-bold text-forest">
              {t('settings.dataWarning')}
            </h2>
          </div>
          <span className="rounded-full bg-leaf/15 text-forest px-2.5 py-0.5 text-[10px] font-bold">
            {isArabic ? 'خاص ومحلي' : 'Private & Local'}
          </span>
        </div>

        <p className="text-xs text-ink/70 leading-relaxed">
          {isArabic
            ? 'يعمل فيلد شيفت بجلسات مجهولة الهوية تحترم الخصوصية. لا يلزم إنشاء حساب أو إدخال بيانات شخصية.'
            : 'Field Shift operates with privacy-first anonymous sessions. No passwords or personal identifiers required. Data persists only in this browser storage.'}
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              clearAccessKey()
              setCleared(true)
            }}
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors inline-flex items-center gap-1.5"
          >
            <Trash2 size={13} />
            <span>{t('settings.clearKey')}</span>
          </button>

          {cleared && (
            <p className="mt-2 text-xs font-semibold text-red-600 animate-fade-in">
              {t('settings.clearedNote')}
            </p>
          )}
        </div>
      </section>

      {/* Scientific Methodology & Provenance Card */}
      <section className="card border border-line bg-white p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5 border-b border-line/60 pb-3">
          <Database size={16} className="text-forest" />
          <h2 className="font-display text-base font-bold text-forest">
            {t('settings.aboutData')}
          </h2>
        </div>

        <ul className="list-disc space-y-1.5 ps-5 text-xs text-ink/70 leading-relaxed">
          <li>{t('disclaimer.soil')}</li>
          <li>{t('disclaimer.yield')}</li>
          <li>{t('disclaimer.calendar')}</li>
          <li>{t('disclaimer.profit')}</li>
        </ul>

        <div className="mt-4 border-t border-line/60 pt-3 text-[11px] text-ink/50 flex flex-wrap items-center justify-between gap-2">
          <span>{t('app.poweredBy')}</span>
          <span>{t('app.noNasaEndorsement')}</span>
        </div>
      </section>
    </div>
  )
}
