import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import {
  NotificationError,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications'

describe('notifications service', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn()
  })

  afterEach(() => {
    delete globalThis.fetch
    jest.restoreAllMocks()
  })

  const ok = (data) => ({ ok: true, status: 200, json: async () => data })
  const fail = (status, body) => ({ ok: false, status, json: async () => body })
  const url = () => globalThis.fetch.mock.calls[0][0]

  describe('fetchNotifications', () => {
    it('returns the whole envelope so the count survives', async () => {
      const payload = {
        success: true,
        data: { unreadCount: 3, items: [{ id: 'n1' }] },
      }
      globalThis.fetch.mockResolvedValueOnce(ok(payload))

      const result = await fetchNotifications()

      expect(url()).toContain('/api/notifications')
      expect(url()).not.toContain('?')
      expect(result).toEqual(payload)
    })

    it('passes paging and the unread filter as query parameters', async () => {
      globalThis.fetch.mockResolvedValueOnce(ok({ data: { items: [] } }))

      await fetchNotifications({ limit: 50, offset: 20, unreadOnly: true })

      expect(url()).toContain('limit=50')
      expect(url()).toContain('offset=20')
      expect(url()).toContain('unreadOnly=true')
    })

    it('omits unreadOnly when it is false, matching the API default', async () => {
      globalThis.fetch.mockResolvedValueOnce(ok({ data: { items: [] } }))

      await fetchNotifications({ unreadOnly: false })

      expect(url()).not.toContain('unreadOnly')
    })

    it('surfaces a 400 field error over the generic message', async () => {
      globalThis.fetch.mockResolvedValueOnce(
        fail(400, {
          message: 'Validation failed',
          data: { fields: { limit: ['limit must not exceed 100'] } },
        }),
      )

      await expect(fetchNotifications({ limit: 999 })).rejects.toMatchObject({
        status: 400,
        message: 'limit must not exceed 100',
      })
    })

    it('throws a NotificationError carrying a 401', async () => {
      globalThis.fetch.mockResolvedValueOnce(
        fail(401, { message: 'Session expired' }),
      )

      await expect(fetchNotifications()).rejects.toMatchObject({
        name: 'NotificationError',
        status: 401,
      })
    })

    it('falls back to a generic message on a non-JSON failure', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error('Not JSON')
        },
      })

      await expect(fetchNotifications()).rejects.toThrow(
        'Failed to load notifications (503)',
      )
    })
  })

  describe('fetchUnreadCount', () => {
    it('returns just the number', async () => {
      globalThis.fetch.mockResolvedValueOnce(
        ok({ success: true, data: { unreadCount: 7 } }),
      )

      await expect(fetchUnreadCount()).resolves.toBe(7)
      expect(url()).toContain('/api/notifications/unread-count')
    })

    it('reads zero when the payload is unexpected', async () => {
      globalThis.fetch.mockResolvedValueOnce(ok({ success: true }))
      await expect(fetchUnreadCount()).resolves.toBe(0)
    })
  })

  describe('markNotificationRead', () => {
    it('patches the notification and returns when it was read', async () => {
      globalThis.fetch.mockResolvedValueOnce(
        ok({ data: { id: 'n1', readAt: '2026-09-25T10:00:00.000Z' } }),
      )

      const result = await markNotificationRead('n1')

      expect(url()).toContain('/api/notifications/n1/read')
      expect(globalThis.fetch.mock.calls[0][1]).toMatchObject({
        method: 'PATCH',
      })
      expect(result).toEqual({ id: 'n1', readAt: '2026-09-25T10:00:00.000Z' })
    })

    it('encodes the id', async () => {
      globalThis.fetch.mockResolvedValueOnce(ok({ data: {} }))
      await markNotificationRead('a/b c')
      expect(url()).toContain('/api/notifications/a%2Fb%20c/read')
    })

    it('throws with the backend message on a 404', async () => {
      globalThis.fetch.mockResolvedValueOnce(
        fail(404, { message: 'Notification not found' }),
      )

      await expect(markNotificationRead('n1')).rejects.toThrow(
        'Notification not found',
      )
    })
  })

  describe('markAllNotificationsRead', () => {
    it('patches read-all and returns how many were marked', async () => {
      globalThis.fetch.mockResolvedValueOnce(ok({ data: { markedCount: 4 } }))

      const result = await markAllNotificationsRead()

      expect(url()).toContain('/api/notifications/read-all')
      expect(result).toEqual({ markedCount: 4 })
    })

    it('throws a NotificationError on failure', async () => {
      globalThis.fetch.mockResolvedValueOnce(fail(500, { message: 'Boom' }))
      await expect(markAllNotificationsRead()).rejects.toBeInstanceOf(
        NotificationError,
      )
    })
  })
})
