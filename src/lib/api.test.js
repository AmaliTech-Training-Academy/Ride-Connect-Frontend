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

    await expect(apiFetch('/rides', {
      method: 'POST',
      headers: { 'X-Test': 'enabled' },
      body: JSON.stringify({ origin: 'Madina' }),
    })).resolves.toBe(response)

    expect(fetchSpy).toHaveBeenCalledWith('https://52.213.178.166.nip.io/api/rides', {
      credentials: 'include',
      headers: { 'X-Test': 'enabled' },
      method: 'POST',
      body: JSON.stringify({ origin: 'Madina' }),
    })
  })
})