import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { apiFetch } from './api'
import { onSessionExpired, resetSessionListeners } from './session'

describe('apiFetch', () => {
  afterEach(() => {
    delete globalThis.fetch
    resetSessionListeners()
    jest.restoreAllMocks()
  })

  it('builds the API URL, includes cookies, and merges options and headers', async () => {
    const response = { ok: true, status: 200 }
    const fetchSpy = jest.fn().mockResolvedValue(response)
    globalThis.fetch = fetchSpy

    await expect(
      apiFetch('/api/rides', {
        method: 'POST',
        headers: { 'X-Test': 'enabled' },
        body: JSON.stringify({ origin: 'Madina' }),
      }),
    ).resolves.toBe(response)

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://52.213.178.166.nip.io/api/rides',
      {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Test': 'enabled' },
        method: 'POST',
        body: JSON.stringify({ origin: 'Madina' }),
      },
    )
  })

  it('never lets the browser answer from its HTTP cache', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, status: 200 })
    globalThis.fetch = fetchSpy

    await apiFetch('/api/rides/mine')

    expect(fetchSpy.mock.calls[0][1].cache).toBe('no-store')
  })

  it('keeps the default Content-Type when a caller passes no headers', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, status: 200 })
    globalThis.fetch = fetchSpy

    await apiFetch('/api/rides/abc/status', { method: 'PATCH' })

    expect(fetchSpy.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
    })
  })

  it('lets a caller override the default Content-Type', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, status: 200 })
    globalThis.fetch = fetchSpy

    await apiFetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
    })

    expect(fetchSpy.mock.calls[0][1].headers['Content-Type']).toBe('text/plain')
  })

  it('announces session expiry on a 401', async () => {
    const expired = jest.fn()
    onSessionExpired(expired)
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 })

    const response = await apiFetch('/api/rides/mine')

    expect(expired).toHaveBeenCalledTimes(1)
    // The response is still handed back so the caller can read its body.
    expect(response.status).toBe(401)
  })

  it('stays quiet for any other status', async () => {
    const expired = jest.fn()
    onSessionExpired(expired)
    globalThis.fetch = jest.fn()

    for (const status of [200, 400, 403, 409, 500]) {
      globalThis.fetch.mockResolvedValueOnce({ ok: status < 400, status })
      await apiFetch('/api/rides')
    }

    expect(expired).not.toHaveBeenCalled()
  })
})
