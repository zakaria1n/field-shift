/** Dark, visually integrated data-sources band — provenance and limitations
 * stay accessible without resurrecting the old white dashboard theme. */
import { CloudSun, Layers, Leaf } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from './ScenePrimitives'

export default function SourcesBand() {
  const { t } = useTranslation()
  return (
    <section id="welcome-sources" className="relative bg-forest-dark px-6 py-14 sm:px-12">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h3 className="font-display text-xl font-extrabold text-white">{t('welcome.sources.title')}</h3>
          <span className="font-mono text-[11px] text-white/50">{t('welcome.sources.initiative')}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <GlassCard icon={<CloudSun size={16} />} title="NASA POWER" body={t('welcome.sources.climatologyDesc')} />
          <GlassCard icon={<Layers size={16} />} title="ISRIC SoilGrids 2020" body={t('welcome.sources.soilDesc')} />
          <GlassCard icon={<Leaf size={16} />} title="FAO GAEZ v5" body={t('welcome.sources.gaezDesc')} />
        </div>
        <div className="space-y-1 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/60">
          <p className="font-semibold text-white/80">
            {t('app.poweredBy')} · {t('app.noNasaEndorsement')}
          </p>
          <p>{t('disclaimer.body')}</p>
          <p className="text-white/40">{t('disclaimer.soil')} · {t('disclaimer.yield')}</p>
        </div>
      </div>
    </section>
  )
}
