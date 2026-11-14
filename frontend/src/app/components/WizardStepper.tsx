import { useTranslation } from 'react-i18next'

/** Horizontal progress stepper for the setup journey. */
export default function WizardStepper({ current }: { current: number }) {
  const { t } = useTranslation()
  const steps = ['steps.field', 'steps.questions', 'steps.priorities', 'steps.analysis', 'steps.plans']

  return (
    <ol className="flex items-center gap-1 py-2.5 text-xs overflow-x-auto" aria-label="journey steps">
      {steps.map((key, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'active' : 'todo'
        return (
          <li key={key} className="flex items-center gap-1 whitespace-nowrap">
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
                state === 'active'
                  ? 'bg-leaf text-white'
                  : state === 'done'
                    ? 'text-leaf'
                    : 'text-white/50'
              }`}
            >
              <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                state === 'active' ? 'bg-white/25' : state === 'done' ? 'bg-leaf/20' : 'bg-white/10'
              }`}>{n}</span>
              {t(key)}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="text-white/30">›</span>}
          </li>
        )
      })}
    </ol>
  )
}
