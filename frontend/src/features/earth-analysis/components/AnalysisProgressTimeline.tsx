import { useLayoutEffect, useRef, useState } from 'react'

import type { StageUi } from '../analysisStatusAdapter'
import AnalysisProgressArc, { buildArcGeometry } from './AnalysisProgressArc'
import AnalysisStageList from './AnalysisStageList'

interface TimelineLayout {
  width: number
  height: number
  gutter: number
  anchors: Array<{ x: number; y: number }>
}

/** The arc and the six stage rows share one responsive coordinate space.
 * Icon centres are measured from the rendered list so the SVG stays attached
 * when fonts, viewport dimensions, or stage copy change. */
export default function AnalysisProgressTimeline({ stages, failed }: { stages: StageUi[]; failed: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<TimelineLayout>({ width: 0, height: 0, gutter: 0, anchors: [] })

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const bounds = root.getBoundingClientRect()
        const gutter = root.querySelector<HTMLElement>('[data-arc-gutter]')?.getBoundingClientRect().width ?? 0
        const anchors = stages.flatMap((stage) => {
          const element = root.querySelector<HTMLElement>(`[data-stage-anchor="${stage.key}"]`)
          if (!element) return []
          const rect = element.parentElement!.getBoundingClientRect()
          const icon = element.getBoundingClientRect()
          return [{ x: rect.left + icon.width / 2 - bounds.left, y: rect.top + rect.height / 2 - bounds.top }]
        })
        setLayout((previous) => {
          const unchanged = Math.abs(previous.width - bounds.width) < 0.5
            && Math.abs(previous.height - bounds.height) < 0.5
            && Math.abs(previous.gutter - gutter) < 0.5
            && anchors.length === previous.anchors.length
            && anchors.every((point, index) => Math.abs(point.x - previous.anchors[index].x) < 0.5 && Math.abs(point.y - previous.anchors[index].y) < 0.5)
          return unchanged ? previous : { width: bounds.width, height: bounds.height, gutter, anchors }
        })
      })
    }

    const observer = new ResizeObserver(measure)
    observer.observe(root)
    root.querySelectorAll<HTMLElement>('[data-stage-anchor], [data-testid="stage-list"]').forEach((element) => observer.observe(element))
    window.addEventListener('resize', measure)
    measure()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [stages])

  return (
    <div ref={rootRef} className="ea-progress-timeline" data-testid="analysis-progress-composition">
      <div className="ea-arc-gutter" data-arc-gutter aria-hidden="true" />
      <AnalysisProgressArc stages={stages} failed={failed} layout={layout} />
      <AnalysisStageList stages={stages} offsets={buildArcGeometry(layout.anchors, layout.gutter, layout.height).nodes.map((node, index) => node.anchorX - layout.anchors[index].x)} />
    </div>
  )
}
