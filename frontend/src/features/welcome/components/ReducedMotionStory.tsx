/** Reduced-motion variant: the same scenes, stacked statically with the
 * completed golden outline and fully-grown plant — no scroll-linked motion.
 * (Storyboard: "reduced motion shows static completed path and content.") */
import { useTranslation } from 'react-i18next'

import { useCoverLayout } from '../hooks/useCoverLayout'
import { ASSETS } from '../config/welcomeScenes'
import WelcomeNavbar from './WelcomeNavbar'
import { CoverPlate } from './ScenePrimitives'
import FieldOutline from './FieldOutline'
import ConditionsScene, { ConditionCards } from './ConditionsScene'
import FarmerContextScene, { ContextCardsStacked } from './FarmerContextScene'
import HeroScene from './HeroScene'
import LandScene from './LandScene'
import RotationScene from './RotationScene'
import FinalCTAScene from './FinalCTAScene'

export default function ReducedMotionStory() {
  const layout = useCoverLayout()

  return (
    <div className="bg-forest-dark">
      <WelcomeNavbar activeScene={0} />

      {/* hero with the completed golden outline */}
      <section className="relative flex h-[92svh] min-h-[560px] items-center overflow-hidden">
        <CoverPlate url={ASSETS.heroAerial} layout={layout} />
        <FieldOutline layout={layout} drawOffset={0} opacity={1} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#081A15]/90 via-[#0E2921]/45 to-[#0E2921]/10 rtl:bg-gradient-to-l" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-6 pt-16 sm:px-12">
            <HeroScene staticMode />
          </div>
        </div>
      </section>

      {/* scene 1: land */}
      <section className="relative flex min-h-[82svh] items-center overflow-hidden bg-forest-dark">
        <div className="absolute inset-0 bg-gradient-to-r from-[#081A15]/90 via-[#0E2921]/50 to-transparent rtl:bg-gradient-to-l" />
        <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-12">
          <div className="max-w-xl">
            <LandScene />
          </div>
        </div>
      </section>

      {/* scene 2: context with the young plant */}
      <section className="relative flex min-h-[85svh] items-center overflow-hidden bg-forest-dark">
        <img
          src={ASSETS.soilPlate}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#081A15]/85 via-[#0E2921]/45 to-transparent rtl:bg-gradient-to-l" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-6 sm:px-12 xl:grid-cols-[1fr_minmax(0,360px)] xl:items-center">
          <div className="max-w-xl">
            <FarmerContextScene />
            <div className="mt-4 xl:hidden">
              <ContextCardsStacked />
            </div>
          </div>
          <div className="hidden xl:block">
            <ContextCardsStacked />
          </div>
        </div>
      </section>

      {/* scene 3: conditions with the developed plant */}
      <section className="relative flex min-h-[85svh] items-center overflow-hidden bg-forest-dark">
        <div className="absolute inset-0 bg-gradient-to-r from-[#081A15]/85 via-[#0E2921]/45 to-transparent rtl:bg-gradient-to-l" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-6 sm:px-12 lg:grid-cols-[1fr_minmax(0,430px)] lg:items-center">
          <div className="max-w-xl">
            <ConditionsScene />
          </div>
          <ConditionCards />
        </div>
      </section>

      <section className="relative flex min-h-[90svh] items-center overflow-hidden bg-forest-dark">
        <CoverPlate url={ASSETS.heroAerial} layout={layout} />
        <FieldOutline layout={layout} drawOffset={0} opacity={0.9} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#081A15]/90 via-[#0E2921]/50 to-[#0E2921]/15 rtl:bg-gradient-to-l" />
        <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-12">
          <div className="max-w-xl">
            <RotationScene />
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[80svh] items-center overflow-hidden bg-forest-dark">
        <div className="absolute inset-0 bg-gradient-to-b from-[#081A15] via-[#0E2921] to-[#081A15]" />
        <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-12">
          <div className="max-w-xl">
            <FinalCTAScene />
          </div>
        </div>
      </section>
    </div>
  )
}

