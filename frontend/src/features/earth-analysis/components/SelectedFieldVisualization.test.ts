import { describe, expect, it } from 'vitest'

import { buildOutline } from './SelectedFieldVisualization'

describe('selected field GeoJSON geometry', () => {
  it('preserves the outer boundary and hole of a GeoJSON Polygon', () => {
    const result = buildOutline({
      type: 'Polygon',
      coordinates: [
        [[-5.5, 33.9], [-5.499, 33.9], [-5.499, 33.901], [-5.5, 33.901], [-5.5, 33.9]],
        [[-5.4998, 33.9002], [-5.4995, 33.9002], [-5.4995, 33.9005], [-5.4998, 33.9005], [-5.4998, 33.9002]],
      ],
    })

    expect(result).not.toBeNull()
    expect(result?.d.match(/M /g)).toHaveLength(2)
    expect(result?.d.match(/ Z/g)).toHaveLength(2)
  })

  it('preserves every polygon and interior ring of a MultiPolygon', () => {
    const result = buildOutline({
      type: 'MultiPolygon',
      coordinates: [
        [
          [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]],
          [[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1], [0.5, 0.5]],
        ],
        [[[4, 4], [5, 4], [5, 5], [4, 5], [4, 4]]],
      ],
    })

    expect(result).not.toBeNull()
    expect(result?.d.match(/M /g)).toHaveLength(3)
    expect(result?.d.match(/ Z/g)).toHaveLength(3)
  })

  it('rejects a missing or unsupported geometry instead of inventing a shape', () => {
    expect(buildOutline(null)).toBeNull()
    expect(buildOutline({ type: 'Point', coordinates: [-5.5, 33.9] })).toBeNull()
  })
})
