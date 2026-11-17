export type Edge = [number, number, number]

export const REST_LEFT: Edge = [.40, .30, .18]
export const REST_RIGHT: Edge = [.60, .70, .82]

/** A single moving front consumes each neighboring region in turn. */
export function wipeEdges(selected: number | null, progress: number): [Edge, Edge] {
  const p = Math.max(0, Math.min(1, progress))
  const mix = (a: number, b: number) => a + (b - a) * p
  if (selected === 0) {
    const left = REST_LEFT.map(x => mix(x, 1.3)) as Edge
    return [left, left.map((x, i) => Math.max(REST_RIGHT[i], x)) as Edge]
  }
  if (selected === 2) {
    const right = REST_RIGHT.map(x => mix(x, -.3)) as Edge
    return [right.map((x, i) => Math.min(REST_LEFT[i], x)) as Edge, right]
  }
  if (selected === 1) return [REST_LEFT.map(x => mix(x, -.3)) as Edge, REST_RIGHT.map(x => mix(x, 1.3)) as Edge]
  return [REST_LEFT, REST_RIGHT]
}

/** Left and right divider coordinates at top, middle and bottom. */
export function regionTargets(selected: number | null): [Edge, Edge] {
  if (selected === 0) return [[1.3, 1.3, 1.3], [1.3, 1.3, 1.3]]
  if (selected === 1) return [[-.3, -.3, -.3], [1.3, 1.3, 1.3]]
  if (selected === 2) return [[-.3, -.3, -.3], [-.3, -.3, -.3]]
  return [REST_LEFT, REST_RIGHT]
}

/** Curves are shared by the adjoining masks and the visible border. */
export function edgePath(edge: Edge): string {
  return `M ${edge[0]} 0 C ${edge[0]} .22 ${edge[1]} .28 ${edge[1]} .5 C ${edge[1]} .72 ${edge[2]} .78 ${edge[2]} 1`
}

export function regionPaths(left: Edge, right: Edge): [string, string, string] {
  const l = edgePath(left)
  const r = edgePath(right)
  const reverse = (e: Edge) => `L ${e[2]} 1 C ${e[2]} .78 ${e[1]} .72 ${e[1]} .5 C ${e[1]} .28 ${e[0]} .22 ${e[0]} 0`
  return [`${l} L -1 1 L -1 0 Z`, `${l} ${reverse(right)} Z`, `${r} L 2 1 L 2 0 Z`]
}
