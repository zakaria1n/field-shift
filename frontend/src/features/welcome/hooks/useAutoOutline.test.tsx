import { describe, expect, it, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useAutoOutline } from './useAutoOutline'

// jsdom may ship without a frame clock; drive one from timers so framer's
// animate loop can progress like a real browser.
if (typeof window.requestAnimationFrame !== 'function') {
  window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16)) as unknown as typeof window.requestAnimationFrame
}

describe('useAutoOutline', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('starts undrawn and completes by itself — no scroll input involved', async () => {
    const { result } = renderHook(() => useAutoOutline())
    expect(result.current.get()).toBe(0)
    await new Promise((resolve) => setTimeout(resolve, 3600))
    expect(result.current.get()).toBe(1)
  })
})
