import { useId, useMemo } from 'react'

import type { StageUi } from '../analysisStatusAdapter'

interface TimelineLayout {
  width: number
  height: number
  gutter: number
  anchors: Array<{ x: number; y: number }>
}

interface ArcPoint { x: number; y: number }
interface ArcNode extends ArcPoint { anchorX: number; anchorY: number }

/** Build an architectural rail: straight lead-in, broad arc through the stage
 * anchors, and a straight tail. Stage icon x positions are measured, so the
 * curve follows the same geometry as the visible icons at every breakpoint. */
export function buildArcGeometry(
  anchors: Array<{ x: number; y: number }>,
  gutter: number,
  height: number,
): { nodes: ArcNode[]; pathPoints: ArcPoint[] } {
  if (!anchors.length || gutter <= 0 || height <= 0) return { nodes: [], pathPoints: [] }
  const extension = Math.min(82, Math.max(38, height * 0.11))
  const top = anchors[0].y - extension
  const bottom = anchors[anchors.length - 1].y + extension
  const left = -Math.max(30, gutter * 0.45)
  const right = gutter * 0.9
  const xAtY = (y: number) => {
    const t = Math.max(-1, Math.min(1, (2 * y - top - bottom) / (bottom - top)))
    return left + (right - left) * Math.sqrt(1 - t * t)
  }
  const nodes = anchors.map((anchor) => ({
    x: xAtY(anchor.y),
    y: anchor.y,
    anchorX: xAtY(anchor.y) + 56,
    anchorY: anchor.y,
  }))
  return {
    nodes,
    pathPoints: [
      { x: left - gutter * 3, y: top },
      { x: left, y: top },
      ...nodes.map(({ x, y }) => ({ x, y })),
      { x: left, y: bottom },
      { x: left - gutter * 0.5, y: bottom },
    ],
  }
}

/** A responsive curved rail whose node heights come from measured stage-icon
 * centres. Backend progress controls the revealed length and active pulse. */
export default function AnalysisProgressArc({
  stages,
  failed,
  layout,
}: {
  stages: StageUi[]
  failed: boolean
  layout: TimelineLayout
}) {
  const rawId = useId()
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const anchorsReady = layout.width > 0 && layout.height > 0 && layout.anchors.length === stages.length
  const arcGeometry = useMemo(
    () => anchorsReady ? buildArcGeometry(layout.anchors, layout.gutter, layout.height) : { nodes: [], pathPoints: [] },
    [anchorsReady, layout.anchors, layout.gutter, layout.height],
  )
  const { nodes } = arcGeometry

  const path = useMemo(() => {
    const points = arcGeometry.pathPoints
    if (points.length < 4) return ''
    const start = points[1]
    const end = points[points.length - 2]
    const radiusX = layout.gutter * 0.9 - start.x
    return `M ${points[0].x} ${start.y} L ${start.x} ${start.y} A ${radiusX} ${(end.y - start.y) / 2} 0 0 1 ${end.x} ${end.y} L ${points[points.length - 1].x} ${end.y}`
  }, [arcGeometry.pathPoints, layout.gutter])
  const complete = stages.every((stage) => ['complete', 'partial', 'unavailable'].includes(stage.status))
  const activeIndex = stages.findIndex((stage) => stage.status === 'running')
  const lastReachedIndex = stages.reduce((last, stage, index) =>
    stage.status !== 'pending' ? index : last, -1)
  const progressIndex = activeIndex >= 0 ? activeIndex : lastReachedIndex
  const progressPath = useMemo(() => {
    if (complete) return path
    if (progressIndex < 0 || !nodes[progressIndex]) return ''
    const points = arcGeometry.pathPoints
    const start = points[1]
    const end = points[points.length - 2]
    const node = nodes[progressIndex]
    const radiusX = layout.gutter * 0.9 - start.x
    return `M ${points[0].x} ${start.y} L ${start.x} ${start.y} A ${radiusX} ${(end.y - start.y) / 2} 0 0 1 ${node.x} ${node.y}`
  }, [arcGeometry.pathPoints, complete, layout.gutter, nodes, path, progressIndex])

  if (!anchorsReady || !path) return <svg className="ea-arc-overlay" aria-hidden="true" />

  return (
    <svg
      className="ea-arc-overlay"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Analysis stage progress connection"
      data-testid="analysis-progress-arc"
      data-measured-stage-centers={nodes.map((node) => Math.round(node.y)).join(',')}
    >
      <defs>
        <linearGradient id={`${id}-arc-grad`} x1="0" y1="0" x2="0" y2={layout.height} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B9E97A" stopOpacity=".72" />
          <stop offset="55%" stopColor="#C9E98A" stopOpacity=".54" />
          <stop offset="100%" stopColor="#E5C76E" stopOpacity=".48" />
        </linearGradient>
        <filter id={`${id}-node-glow`} x="-160%" y="-160%" width="420%" height="420%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Thin connectors make the arc nodes and the actual stage icons one unit. */}
      {nodes.map((node, index) => (
        <line
          key={`connector-${index}`}
          x1={node.x}
          y1={node.y}
          x2={node.anchorX}
          y2={node.anchorY}
          stroke={stages[index].status === 'running' ? 'rgba(217,249,157,.65)' : 'rgba(218,234,217,.2)'}
          strokeWidth={stages[index].status === 'running' ? 1.6 : 1}
        />
      ))}

      <path className="ea-arc-guide" d={path} fill="none" stroke="rgba(222,239,221,.16)" strokeWidth="1" pathLength={100} />
      {progressPath && (
        <path
          d={progressPath}
          fill="none"
          stroke={`url(#${id}-arc-grad)`}
          strokeWidth="1.2"
          opacity=".55"
          strokeLinecap="round"
          className="ea-arc-reveal"
          data-testid="arc-progress-path"
        />
      )}

      {activeIndex >= 0 && !complete && !failed && (
        <circle
          cx={nodes[activeIndex].x}
          cy={nodes[activeIndex].y}
          r="5.2"
          fill="#E9FFC4"
          filter={`url(#${id}-node-glow)`}
          className="ea-arc-pulse"
          data-testid="active-arc-progress-point"
          data-active-stage={stages[activeIndex].key}
        />
      )}

      {nodes.map((node, index) => {
        const status = stages[index].status
        const fill = status === 'complete' ? '#A3E635'
          : status === 'running' ? '#E9FFC4'
            : status === 'partial' || status === 'unavailable' ? '#E8C66B'
              : status === 'failed' ? '#F09A8F'
                : 'rgba(235,242,231,.48)'
        return (
          <circle
            key={`node-${index}`}
            cx={node.x}
            cy={node.y}
            r={status === 'running' ? 5.2 : 3.8}
            fill={fill}
            filter={status === 'running' || status === 'complete' ? `url(#${id}-node-glow)` : undefined}
            data-testid={`arc-node-${stages[index].key}`}
            data-stage-center-y={node.y.toFixed(2)}
          />
        )
      })}
    </svg>
  )
}
