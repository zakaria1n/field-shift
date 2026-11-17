import { describe, expect, it } from 'vitest'

import { buildArcGeometry } from './AnalysisProgressArc'

describe('Earth Analysis progress arc geometry', () => {
  it('extends past the stage list while each node remains aligned to its measured stage', () => {
    const anchors = [
      { x: 224, y: 52 }, { x: 246, y: 156 }, { x: 264, y: 260 },
      { x: 264, y: 364 }, { x: 246, y: 468 }, { x: 224, y: 572 },
    ]
    const { nodes, pathPoints } = buildArcGeometry(anchors, 196, 624)

    expect(nodes).toHaveLength(anchors.length)
    nodes.forEach((node, index) => {
      expect(node.y).toBe(anchors[index].y)
      expect(node.anchorX - node.x).toBeCloseTo(56)
      expect(node.anchorY).toBe(anchors[index].y)
    })
    expect(pathPoints[0].y).toBeLessThan(anchors[0].y)
    expect(pathPoints[pathPoints.length - 1].y).toBeGreaterThan(anchors[anchors.length - 1].y)
    expect(pathPoints[0].y).toBe(pathPoints[1].y)
    expect(pathPoints[pathPoints.length - 1].y).toBe(pathPoints[pathPoints.length - 2].y)
    expect(nodes[2].x).toBeGreaterThan(nodes[0].x)
    expect(nodes[2].x).toBeGreaterThan(nodes[5].x)
  })

  it('returns no SVG points until the measured layout is usable', () => {
    expect(buildArcGeometry([], 196, 624)).toEqual({ nodes: [], pathPoints: [] })
    expect(buildArcGeometry([{ x: 100, y: 10 }], 0, 624)).toEqual({ nodes: [], pathPoints: [] })
  })
})
