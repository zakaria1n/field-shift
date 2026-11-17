import background from '../../../assets/earth-analysis/earth-analysis-background.webp'

/** Approved cinematic agricultural backdrop. Decorative only — it is never
 * presented as an observation of the farmer's selected field. */
export default function AnalysisBackground() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <img
        src={background}
        alt=""
        className="h-full w-full object-cover"
        draggable={false}
      />
      {/* Soft, masked atmospheric zones keep the type and status list crisp
       * while leaving the central landscape and satellite preview legible. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#04120D]/62 via-[#04120D]/12 to-[#04120D]/30 rtl:bg-gradient-to-l" />
      <div className="ea-background-atmosphere ea-background-atmosphere--copy absolute inset-0" />
      <div className="ea-background-atmosphere ea-background-atmosphere--stages absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#04120D]/80 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#04120D]/75 to-transparent" />
    </div>
  )
}
