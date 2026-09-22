import { afterEach, describe, expect, it, jest } from '@jest/globals'
import {
  notifySessionExpired,
  onSessionExpired,
  resetSessionListeners,
} from './session'

describe('session expiry notifier', () => {
  afterEach(() => resetSessionListeners())

  it('calls every registered listener', () => {
    const first = jest.fn()
    const second = jest.fn()
    onSessionExpired(first)
    onSessionExpired(second)

    notifySessionExpired()

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('returns an unsubscribe function', () => {
    const listener = jest.fn()
    const unsubscribe = onSessionExpired(listener)

    unsubscribe()
    notifySessionExpired()

    expect(listener).not.toHaveBeenCalled()
  })

  it('lets a listener unsubscribe itself while being notified', () => {
    const calls = []
    const unsubscribe = onSessionExpired(() => {
      calls.push('self')
      unsubscribe()
    })
    onSessionExpired(() => calls.push('other'))

    notifySessionExpired()
    notifySessionExpired()

    expect(calls).toEqual(['self', 'other', 'other'])
  })

  it('keeps notifying after a listener throws', () => {
    const survivor = jest.fn()
    onSessionExpired(() => {
      throw new Error('listener blew up')
    })
    onSessionExpired(survivor)

    expect(() => notifySessionExpired()).not.toThrow()
    expect(survivor).toHaveBeenCalled()
  })

  it('does nothing when there are no listeners', () => {
    expect(() => notifySessionExpired()).not.toThrow()
  })
})
