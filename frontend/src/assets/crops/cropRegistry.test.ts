import { describe, expect, it } from 'vitest'

import { CROP_REGISTRY, cropHasOwnImage } from './cropRegistry'

// `berseem_clover` is a legacy UI alias; the backend catalogue's 37 IDs are
// the remaining registry entries.
const cropIds = Object.keys(CROP_REGISTRY).filter((cropId) => cropId !== 'berseem_clover')

describe('crop illustration registry', () => {
  it('maps every catalogue crop to an existing dedicated PNG', () => {
    expect(cropIds).toHaveLength(37)
    for (const cropId of cropIds) {
      const crop = CROP_REGISTRY[cropId]
      expect(crop, `${cropId} must have registry metadata`).toBeDefined()
      expect(crop.image, `${cropId} must have an image path`).toMatch(/^\/assets\/crops\/.+\.png$/)
      expect(cropHasOwnImage(cropId), `${cropId} must be treated as a dedicated illustration`).toBe(true)
    }
  })
})
