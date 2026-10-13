import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { MOBILE_QUERY, useIsMobile } from './useIsMobile'

/**
 * jsdom has no matchMedia, so each test installs one it can drive. The
 * listener is captured so a test can cross the breakpoint on demand.
 */
function stubMatchMedia(matches) {
  const listeners = new Set()
  globalThis.matchMedia = jest.fn((query) => ({
    matches: query === MOBILE_QUERY ? matches : false,
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
  }))
  return {
    crossBreakpoint: (nowMatches) =>
      listeners.forEach((listener) => listener({ matches: nowMatches })),
    listenerCount: () => listeners.size,
  }
}

describe('useIsMobile', () => {
  afterEach(() => {
    delete globalThis.matchMedia
  })

  it('reports desktop where matchMedia is unavailable', () => {
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('starts from the current viewport rather than waiting for a change', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('follows the viewport across the breakpoint', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())

    act(() => media.crossBreakpoint(true))
    expect(result.current).toBe(true)

    act(() => media.crossBreakpoint(false))
    expect(result.current).toBe(false)
  })

  it('stops listening once unmounted', () => {
    const media = stubMatchMedia(false)
    const { unmount } = renderHook(() => useIsMobile())

    expect(media.listenerCount()).toBe(1)
    unmount()
    expect(media.listenerCount()).toBe(0)
  })
})
