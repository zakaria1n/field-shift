import type { Priorities } from '../../state/wizard'

const KEYS = ['water', 'soil', 'yield', 'risk'] as const
export type PriorityKey = (typeof KEYS)[number]

/**
 * Linked priority mixer: the four weights always total exactly 100 with
 * non-negative integers. Uses the Largest Remainder Method (Hamilton-Hare) so
 * every priority stays an integer and the sum is exactly 100.
 */
export function rebalance(current: Priorities, changed: PriorityKey, nextValue: number): Priorities {
  const target = Math.max(0, Math.min(100, Math.round(nextValue)))
  const others = KEYS.filter((k) => k !== changed)
  const remaining = 100 - target

  if (remaining === 0) {
    return { water: 0, soil: 0, yield: 0, risk: 0, [changed]: 100 } as Priorities
  }

  const othersSum = others.reduce((s, k) => s + Math.max(0, current[k] || 0), 0)

  let rawShares: number[]
  if (othersSum === 0) {
    rawShares = others.map(() => remaining / others.length)
  } else {
    rawShares = others.map((k) => (Math.max(0, current[k] || 0) / othersSum) * remaining)
  }

  const floors = rawShares.map((s) => Math.floor(s))
  const allocated = floors.reduce((a, b) => a + b, 0)
  const remainder = remaining - allocated

  const fractions = rawShares.map((s, idx) => ({ idx, frac: s - floors[idx] }))
  fractions.sort((a, b) => (b.frac - a.frac !== 0 ? b.frac - a.frac : b.idx - a.idx))

  for (let i = 0; i < remainder; i++) {
    floors[fractions[i].idx] += 1
  }

  const result: Priorities = { water: 0, soil: 0, yield: 0, risk: 0, [changed]: target }
  others.forEach((k, i) => {
    result[k] = floors[i]
  })

  return result
}

export function totalOf(p: Priorities): number {
  return KEYS.reduce((sum, k) => sum + p[k], 0)
}
