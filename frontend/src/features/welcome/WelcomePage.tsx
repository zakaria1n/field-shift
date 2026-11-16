/** Welcome page composition: navbar + ribbon + cinematic story (or the
 * reduced-motion static story) + the dark provenance band. Thin by design —
 * scenes, animations and scroll logic live in their own modules. */
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useReducedMotion } from 'framer-motion'

import { api, type DashboardItem } from '../../api/client'
import { useWizard } from '../../state/wizard'
import { useReducedMotionSafe } from './hooks/useReducedMotionSafe'
import { ASSETS } from './config/welcomeScenes'
import CinematicStory from './components/CinematicStory'
import ReducedMotionStory from './components/ReducedMotionStory'

export default function WelcomePage() {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const reducedMotion = useReducedMotionSafe()

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
    staleTime: 10_000,
    retry: 0,
  })
  const savedFarm = dashboard?.[0]

  return (
    <div
      className="relative min-h-screen overflow-x-clip bg-forest-dark text-white"
    >
      {/* preload the critical hero asset */}
      <link rel="preload" as="image" href={ASSETS.heroAerial} />

      {savedFarm && (
        <div className="absolute inset-x-0 top-16 z-40 px-5 sm:px-10">
          <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-3 rounded-2xl border border-lime-300/40 bg-[#0E2921]/70 p-3.5 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:px-5">
            <p className="text-xs font-bold text-white">
              {isArabic ? 'لديك حقل محفوظ:' : 'Farm saved in this browser:'}{' '}
              <bdi className="underline">{savedFarm.field_name || 'My field'}</bdi>
              {savedFarm.area_ha != null && ` (${savedFarm.area_ha.toFixed(1)} ha)`}
            </p>
            <Link
              to="/home"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#8FE627] px-4 py-1.5 text-xs font-bold text-[#0E2921]"
            >
              {t('welcome.reprise')}
              <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      )}

      {reducedMotion ? <ReducedMotionStory /> : <CinematicStory />}
    </div>
  )
}
