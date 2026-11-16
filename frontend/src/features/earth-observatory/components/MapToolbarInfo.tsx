import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'

/** Small explainer popover for the info tool: how to draw/edit/delete. */
export default function MapToolbarInfo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.18 }}
          className="absolute bottom-24 start-14 z-30 max-w-[240px] rounded-2xl border border-white/15 bg-[#0B1410]/95 p-4 text-white shadow-2xl backdrop-blur-md"
          role="dialog"
          aria-label={t('obs.map.infoTitle')}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold">{t('obs.map.infoTitle')}</p>
            <button type="button" onClick={onClose} className="text-white/60 hover:text-white" aria-label={t('common.cancel')}>
              ✕
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/75">{t('obs.map.infoBody')}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
