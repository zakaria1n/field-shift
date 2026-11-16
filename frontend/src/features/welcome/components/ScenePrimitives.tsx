/** Shared primitives for the Welcome scenes (single responsibility each). */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { useWizard } from '../../../state/wizard'

/** Positions one scene's content inside the sticky viewport. */
export function SceneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center">
      <div className="mx-auto w-full max-w-7xl px-6 pt-20 sm:px-12">{children}</div>
    </div>
  )
}

/** Scene copy block: step chip, display heading with lime accent word,
 * supporting body, optional CTA into the real workflow. */
export function SceneCopy({
  step,
  kicker,
  title,
  accent,
  body,
  ctaLabel,
  ctaTo,
  children,
}: {
  step: React.ReactNode
  kicker: string
  title: string
  accent: string
  body: string
  ctaLabel?: string
  ctaTo?: string
  children?: React.ReactNode
}) {
  const { resetWizard } = useWizard()
  return (
    <div className="max-w-xl space-y-3 sm:space-y-4">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/60 bg-[#0E2921]/40 px-3 py-1 text-xs font-bold text-lime-200 backdrop-blur-md">
        {step}
        <span>{kicker}</span>
      </span>
      <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
        {title} <span className="text-[#8FE627]">{accent}</span>
      </h2>
      <span className="block h-1 w-14 rounded-full bg-[#8FE627]/80" aria-hidden="true" />
      <p className="max-w-md text-sm leading-relaxed text-white/85 sm:text-base">{body}</p>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          onClick={() => resetWizard()}
          className="btn-leaf mt-1 inline-flex items-center gap-2 px-6 py-3 text-sm shadow-xl"
        >
          <span>{ctaLabel}</span>
          <ArrowRight size={15} className="rtl:rotate-180" />
        </Link>
      )}
      {children}
    </div>
  )
}

/** Dark glass card used by the context/conditions scenes. */
export function GlassCard({
  icon,
  title,
  body,
  value,
  valueNote,
  valueClass = 'text-white',
}: {
  icon: React.ReactNode
  title: string
  body: string
  value?: string
  valueNote?: string
  valueClass?: string
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-[#0E2921]/45 p-3.5 shadow-lg backdrop-blur-md sm:p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 text-lime-200">
          {icon}
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-white">{title}</h4>
          <p className="text-[11px] leading-snug text-white/70">{body}</p>
        </div>
        {value && (
          <span className="ms-auto flex flex-col items-end">
            <span className={`whitespace-nowrap text-lg font-extrabold ${valueClass}`}>{value}</span>
            {valueNote && <span className="text-[10px] text-white/55">{valueNote}</span>}
          </span>
        )}
      </div>
    </div>
  )
}

/** Bitmap plate positioned by the shared cover layout. */
export function CoverPlate({
  url,
  layout,
}: {
  url: string
  layout: { width: number; height: number; left: number; top: number }
}) {
  return (
    <img
      src={url}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="absolute select-none"
      style={{ width: layout.width, height: layout.height, left: layout.left, top: layout.top, maxWidth: 'none' }}
    />
  )
}
