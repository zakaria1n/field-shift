import { useTranslation } from 'react-i18next'
import { Check, Sprout, Droplets, History, Target, ShieldAlert, Sliders } from 'lucide-react'

interface WizardStepperProps {
  current: number
  mode?: 'default' | 'farmProfile'
}

export default function WizardStepper({ current, mode = 'default' }: WizardStepperProps) {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  // Canonical 5 Farm Profile Steps from UI reference
  const farmProfileSteps = [
    { num: 1, key: 'q.step.irrigation', labelEn: 'Irrigation', labelAr: 'الري', icon: Droplets },
    { num: 2, key: 'q.step.history', labelEn: 'History', labelAr: 'تاريخ المحاصيل', icon: History },
    { num: 3, key: 'q.step.purpose', labelEn: 'Purpose', labelAr: 'أهداف الزراعة', icon: Target },
    { num: 4, key: 'q.step.constraints', labelEn: 'Constraints', labelAr: 'المحددات', icon: ShieldAlert },
    { num: 5, key: 'q.step.priorities', labelEn: 'Your Priorities', labelAr: 'أولوياتك', icon: Sliders },
  ]

  // Global Journey Steps
  const defaultSteps = [
    { num: 1, key: 'steps.field' },
    { num: 2, key: 'steps.questions' },
    { num: 3, key: 'steps.priorities' },
    { num: 4, key: 'steps.analysis' },
    { num: 5, key: 'steps.plans' },
  ]

  if (mode === 'farmProfile') {
    return (
      <nav className="py-2.5" aria-label={t('aria.progress')}>
        {/* Desktop Connected 5-Step Bar matching 00_Transition_Extract_Your_Field */}
        <ol className="hidden sm:flex items-center justify-between gap-1.5 max-w-4xl mx-auto">
          {farmProfileSteps.map((step, i) => {
            const isDone = step.num < current
            const isActive = step.num === current
            const isUpcoming = step.num > current
            const label = isArabic ? step.labelAr : step.labelEn

            return (
              <li key={step.num} className="flex-1 flex items-center">
                <div className="flex items-center gap-2 group cursor-default">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 font-mono ${
                      isDone
                        ? 'bg-leaf text-white shadow-sm ring-1 ring-leaf/40'
                        : isActive
                          ? 'bg-forest text-white shadow-glow ring-2 ring-leaf animate-pulse-subtle'
                          : 'bg-white/80 text-ink/40 border border-line'
                    }`}
                  >
                    {isDone ? <Check size={14} strokeWidth={3} /> : step.num}
                  </span>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap transition-colors duration-200 ${
                      isActive
                        ? 'text-forest font-extrabold tracking-tight underline decoration-leaf decoration-2 underline-offset-4'
                        : isDone
                          ? 'text-forest/80 font-bold'
                          : 'text-ink/40'
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {i < farmProfileSteps.length - 1 && (
                  <div className="flex-1 mx-2.5 h-0.5 rounded-full overflow-hidden bg-line">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isDone ? 'bg-leaf w-full' : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ol>

        {/* Mobile Compact View */}
        <div className="flex sm:hidden items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-leaf text-white font-mono font-bold text-[11px]">
              {current}
            </span>
            <span className="font-bold text-forest tracking-tight">
              {isArabic
                ? farmProfileSteps[current - 1]?.labelAr
                : farmProfileSteps[current - 1]?.labelEn}
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] text-ink/60">
            <span>{current}</span>
            <span>/</span>
            <span>5</span>
          </div>
        </div>
      </nav>
    )
  }

  // Default Journey View
  return (
    <nav className="py-2.5" aria-label={t('aria.progress')}>
      <ol className="hidden sm:flex items-center justify-between gap-2 max-w-4xl mx-auto">
        {defaultSteps.map((step, i) => {
          const isDone = step.num < current
          const isActive = step.num === current

          return (
            <li key={step.key} className="flex-1 flex items-center">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 font-mono ${
                    isDone
                      ? 'bg-forest text-white shadow-sm'
                      : isActive
                        ? 'bg-leaf text-white shadow-sm ring-2 ring-leaf/30 animate-pulse-subtle'
                        : 'bg-cream text-ink/40 border border-line'
                  }`}
                >
                  {isDone ? <Check size={14} strokeWidth={3} /> : step.num}
                </span>
                <span
                  className={`text-xs font-semibold whitespace-nowrap transition-colors duration-200 ${
                    isActive
                      ? 'text-forest font-bold tracking-tight'
                      : isDone
                        ? 'text-forest/80'
                        : 'text-ink/40'
                  }`}
                >
                  {t(step.key)}
                </span>
              </div>

              {i < defaultSteps.length - 1 && (
                <div className="flex-1 mx-3 h-0.5 rounded-full overflow-hidden bg-line">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isDone ? 'bg-forest w-full' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {/* Mobile Compact View */}
      <div className="flex sm:hidden items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-leaf text-white font-mono font-bold text-[11px]">
            {current}
          </span>
          <span className="font-bold text-forest tracking-tight">
            {t(defaultSteps[Math.min(current - 1, defaultSteps.length - 1)]?.key ?? 'steps.field')}
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] text-ink/60">
          <span>{current}</span>
          <span>/</span>
          <span>{defaultSteps.length}</span>
        </div>
      </div>
    </nav>
  )
}
