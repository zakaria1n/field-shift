import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'

import { clearAccessKey } from '../../state/accessKey'
import { useWizard, type Priorities } from '../../state/wizard'
import LanguageSwitch from '../../app/components/LanguageSwitch'
import { rebalance } from '../priorities/Priorities'

export default function Settings() {
  const { t } = useTranslation()
  const { lang, setLang, priorities, setPriorities, answers, setAnswers } = useWizard()
  const [cleared, setCleared] = useState(false)

  const keys = ['water', 'soil', 'yield', 'risk'] as const

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-forest">{t('settings.title')}</h1>

      <section className="card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">{t('settings.language')}</h2>
        <div className="mt-3">
          <LanguageSwitch lang={lang} onChange={setLang} />
          <p className="mt-2 text-xs text-ink/60">{lang === 'en' ? 'العربية uses right-to-left layout.' : 'English uses left-to-right layout.'}</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">{t('mixer.title')}</h2>
        <div className="mt-3 space-y-3">
          {keys.map((k) => (
            <div key={k}>
              <div className="flex justify-between text-xs font-semibold">
                <span>{t(`mixer.${k}`)}</span>
                <span>{priorities[k]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={priorities[k]}
                aria-label={t('aria.slider', { label: t(`mixer.${k}`) })}
                onChange={(e) => setPriorities(rebalance(priorities as Priorities, k, Number(e.target.value)))}
                className="w-full accent-[#299A61]"
              />
            </div>
          ))}
          <p className="text-[11px] text-ink/50">{t('mixer.balanceNote')}</p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">{t('q.purposes.title')}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['sell', 'livestock_feed', 'household_food', 'soil_restoration'] as const).map((p) => {
            const active = answers.purposes.includes(p)
            return (
              <button
                key={p}
                aria-pressed={active}
                onClick={() =>
                  setAnswers({
                    ...answers,
                    purposes: active ? answers.purposes.filter((x) => x !== p) : [...answers.purposes, p],
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-leaf bg-leaf/10 text-forest' : 'border-line bg-white text-ink/70'}`}
              >
                {t(`q.purposes.${p}`)}
              </button>
            )
          })}
        </div>
      </section>

      <section className="card border-amber/50 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber">
          <TriangleAlert size={15} /> {t('settings.dataWarning')}
        </h2>
        <p className="mt-2 text-xs text-ink/70">{t('disclaimer.anon')}</p>
        <button
          className="mt-3 rounded-full border border-red-300 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
          onClick={() => {
            clearAccessKey()
            setCleared(true)
          }}
        >
          {t('settings.clearKey')}
        </button>
        {cleared && <p className="mt-2 text-xs font-semibold text-red-600">{t('settings.clearedNote')}</p>}
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">{t('settings.aboutData')}</h2>
        <ul className="mt-2 list-disc space-y-1 ps-5 text-xs text-ink/65">
          <li>{t('disclaimer.soil')}</li>
          <li>{t('disclaimer.yield')}</li>
          <li>{t('disclaimer.calendar')}</li>
          <li>{t('disclaimer.profit')}</li>
        </ul>
        <p className="mt-3 text-[11px] text-ink/45">{t('app.poweredBy')} · {t('app.noNasaEndorsement')}</p>
      </section>
    </div>
  )
}
