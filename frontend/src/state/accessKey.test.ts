import { describe, expect, it, beforeEach, vi } from 'vitest'

import { clearAccessKey, getAccessKey, hasAccessKey } from './accessKey'

describe('anonymous browser access key', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates a high-entropy key once and reuses it', () => {
    const k1 = getAccessKey()
    expect(k1).toMatch(/^fsk_/)
    expect(k1.length).toBeGreaterThan(40)
    expect(getAccessKey()).toBe(k1)
    expect(hasAccessKey()).toBe(true)
  })

  it('clearing loses access until the next visit creates a new key', () => {
    const k1 = getAccessKey()
    clearAccessKey()
    expect(hasAccessKey()).toBe(false)
    const k2 = getAccessKey()
    expect(k2).not.toBe(k1)
  })
})
