import illustration from '../../../assets/farm-profile-cinematic/comp.png'

/** The shared floating agricultural terrain used across every Farm Profile
 * step. One static illustrative asset — never a claim about the farmer's
 * real field — floating unboxed over the cinematic page background. */
export default function FloatingFarmIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`farm-float pointer-events-none relative h-full w-full ${className}`} aria-hidden="true">
      <img
        src={illustration}
        alt=""
        className="farm-float-glow h-full w-full select-none object-contain drop-shadow-[0_26px_44px_rgba(0,0,0,0.55)]"
        draggable={false}
      />
    </div>
  )
}
