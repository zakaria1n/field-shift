import { describe, expect, it } from 'vitest'
import { REST_LEFT, REST_RIGHT, regionPaths, wipeEdges } from './fieldRegions'

describe('field wipe geometry', () => {
  it.each([0, 1, 2])('starts from exactly the same overview and reverses for plan %s', plan => {
    expect(wipeEdges(plan, 0)).toEqual([REST_LEFT, REST_RIGHT])
    expect(regionPaths(...wipeEdges(plan, 0))).toEqual(regionPaths(REST_LEFT, REST_RIGHT))
    for (const p of [0, .2, .5, .8, 1]) {
      const [left, right] = wipeEdges(plan, p)
      left.forEach((x, i) => expect(x).toBeLessThanOrEqual(right[i]))
      const inverse = wipeEdges(plan, 1 - (1 - p))
      left.forEach((x, i) => expect(x).toBeCloseTo(inverse[0][i]))
      right.forEach((x, i) => expect(x).toBeCloseTo(inverse[1][i]))
    }
  })
  it('keeps the far field stationary until the advancing front reaches it', () => {
    expect(wipeEdges(0, .1)[1]).toEqual(REST_RIGHT)
    expect(wipeEdges(2, .1)[0]).toEqual(REST_LEFT)
  })
})
