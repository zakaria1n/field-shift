import { describe, expect, it } from 'vitest'
import { rebalance, totalOf } from './Priorities'
import type { Priorities } from '../../state/wizard'

const KEYS = ['water', 'soil', 'yield', 'risk'] as const

describe('priority mixer rebalancing', () => {
  it('always totals exactly 100 across many slider moves', () => {
    let p: Priorities = { water: 25, soil: 25, yield: 25, risk: 25 }
    const moves: Array<[keyof Priorities, number]> = [
      ['water', 60], ['soil', 30], ['yield', 5], ['risk', 90],
      ['water', 100], ['water', 0], ['soil', 100], ['yield', 37], ['risk', 0],
      ['water', 13], ['soil', 71], ['yield', 9], ['risk', 33],
    ]
    for (const [key, value] of moves) {
      p = rebalance(p, key, value)
      expect(totalOf(p)).toBe(100)
      for (const k of KEYS) expect(p[k]).toBeGreaterThanOrEqual(0)
      expect(p[key]).toBe(Math.max(0, Math.min(100, value)))
    }
  })

  it('redistributes proportionally when others have weight', () => {
    const p = rebalance({ water: 40, soil: 40, yield: 10, risk: 10 }, 'water', 80)
    expect(p.water).toBe(80)
    // remaining 20 split proportionally 40:10:10 -> 13/3/3 with the integer
    // remainder landing on the last key so the total stays exactly 100
    expect(totalOf(p)).toBe(100)
    expect(p.soil).toBe(13)
    expect(p.yield).toBe(3)
    expect(p.risk).toBe(4)
  })

  it('distributes evenly when all others are zero', () => {
    const p = rebalance({ water: 100, soil: 0, yield: 0, risk: 0 }, 'water', 70)
    expect(p.water).toBe(70)
    expect(p.soil).toBe(10)
    expect(p.yield).toBe(10)
    expect(p.risk).toBe(10)
    expect(totalOf(p)).toBe(100)
  })

  it('clamps out-of-range values', () => {
    const p = rebalance({ water: 25, soil: 25, yield: 25, risk: 25 }, 'water', 150)
    expect(p.water).toBe(100)
    expect(totalOf(p)).toBe(100)
  })
})
