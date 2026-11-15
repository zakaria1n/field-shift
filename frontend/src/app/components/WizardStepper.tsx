import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

/** Elevated horizontal progress stepper with animated glow and mobile adaptability. */
export default function WizardStepper({ current }: { current: number }) {
  const { t } = useTranslation()
  const steps = [
    { key: 'steps.field', num: 1 },
    { key: 'steps.questions', num: 2 },
    { key: 'steps.priorities', num: 3 },
    { key: 'steps.analysis', num: 4 },
    { key: 'steps.plans', num: 5 },
  ]

  return (
    <nav className="py-2.5" aria-label={t('aria.progress')}>
      {/* Desktop & Tablet View */}
      <ol className="hidden sm:flex items-center justify-between gap-2 max-w-4xl mx-auto">
        {steps.map((step, i) => {
          const isDone = step.num < current
          const isActive = step.num === current
          const isUpcoming = step.num > current

          return (
            <li key={step.key} className="flex-1 flex items-center">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 font-mono ${
                    isDone
                      ? 'bg-leaf text-white shadow-sm ring-2 ring-leaf/30'
                      : isActive
                        ? 'bg-gradient-to-r from-emerald-400 to-leaf text-white shadow-glow ring-2 ring-white/40 animate-pulse-subtle'
                        : 'bg-white/10 text-white/50 border border-white/10'
                  }`}
                >
                  {isDone ? <Check size={14} strokeWidth={3} /> : step.num}
                </span>
                <span
                  className={`text-xs font-semibold whitespace-nowrap transition-colors duration-200 ${
                    isActive
                      ? 'text-white font-bold tracking-tight drop-shadow-sm'
                      : isDone
                        ? 'text-white/80'
                        : 'text-white/40'
                  }`}
                >
                  {t(step.key)}
                </span>
              </div>

              {i < steps.length - 1 && (
                <div className="flex-1 mx-3 h-0.5 rounded-full overflow-hidden bg-white/10">
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
          <span className="font-bold text-white tracking-tight">
            {t(steps[Math.min(current - 1, steps.length - 1)]?.key ?? 'steps.field')}
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] text-white/60">
          <span>{current}</span>
          <span>/</span>
          <span>{steps.length}</span>
        </div>
      </div>
    </nav>
  )
}
