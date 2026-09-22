import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { apiFetch } from './api'

describe('apiFetch', () => {
  afterEach(() => {
    delete globalThis.fetch
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
        headers: { 'Content-Type': 'application/json', 'X-Test': 'enabled' },
        method: 'POST',
        body: JSON.stringify({ origin: 'Madina' }),
      },
    )
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
})
