import { describe, expect, it } from 'vitest'
import { SCENES } from '../config/welcomeScenes'
import { GROWTH_SLOTS } from './plantGrowth'

describe('welcome story timing', () => {
  it('hands each text layer to the next at the same scroll position', () => {
    const boundaries = [
      [SCENES.hero.copyOut, SCENES.land.copyIn],
      [SCENES.land.copyOut, SCENES.context.copyIn],
      [SCENES.context.copyOut, SCENES.conditions.copyIn],
      [SCENES.conditions.copyOut, SCENES.rotation.copyIn],
      [SCENES.rotation.copyOut, SCENES.cta.copyIn],
    ]
    for (const [exit, enter] of boundaries) expect(exit).toEqual(enter)
  })

  it('keeps consecutive plant frames connected while scrolling', () => {
    for (let i = 0; i < GROWTH_SLOTS.length - 1; i++) {
      const previous = GROWTH_SLOTS[i]
      const next = GROWTH_SLOTS[i + 1]
      expect(previous[2]).toBe(next[0])
      expect(previous[3]).toBe(next[1])
    }
  })

  it('fully reveals the final plant while the conditions step is still visible', () => {
    const finalPlant = GROWTH_SLOTS[GROWTH_SLOTS.length - 1]
    expect(finalPlant[1]).toBeLessThan(SCENES.conditions.copyOut[0])
    expect(finalPlant[2]).toBeGreaterThanOrEqual(SCENES.conditions.copyOut[0])
    expect(SCENES.rotation.copyIn).toEqual(SCENES.conditions.copyOut)
  })
})
