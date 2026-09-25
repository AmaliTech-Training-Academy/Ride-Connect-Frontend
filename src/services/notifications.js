import { apiFetch } from '../lib/api'

export class NotificationError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'NotificationError'
    this.status = status
  }
}

async function readBody(response, fallbackMessage) {
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    // A 400 names the offending query parameter; prefer it over the generic text.
    const fieldMessage = Object.values(body?.data?.fields ?? {})[0]?.[0]
    throw new NotificationError(
      fieldMessage ||
        body?.message ||
        `${fallbackMessage} (${response.status})`,
      response.status,
    )
  }

  return body
}

/**
 * Fetches the signed-in user's notifications, newest first.
 *
 * Returns the whole envelope so the caller gets both the page of items and
 * `unreadCount`, which counts everything rather than just this page.
 *
 * @param {{ limit?: number, offset?: number, unreadOnly?: boolean }} [options]
 */
export async function fetchNotifications({ limit, offset, unreadOnly } = {}) {
  const params = new URLSearchParams()
  if (typeof limit === 'number') params.set('limit', String(limit))
  if (typeof offset === 'number') params.set('offset', String(offset))
  if (unreadOnly) params.set('unreadOnly', 'true')

  const query = params.toString()
  const response = await apiFetch(
    `/api/notifications${query ? `?${query}` : ''}`,
  )
  return readBody(response, 'Failed to load notifications')
}

/**
 * Counts unread notifications without pulling the list, so the badge can be
 * refreshed cheaply.
 */
export async function fetchUnreadCount() {
  const response = await apiFetch('/api/notifications/unread-count')
  const body = await readBody(response, 'Failed to count notifications')
  return body?.data?.unreadCount ?? 0
}

/** Marks one notification as read. Resolves to `{ id, readAt }`. */
export async function markNotificationRead(notificationId) {
  const response = await apiFetch(
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'PATCH' },
  )
  const body = await readBody(response, 'Failed to update the notification')
  return body?.data ?? body
}

/** Marks every notification as read. Resolves to `{ markedCount }`. */
export async function markAllNotificationsRead() {
  const response = await apiFetch('/api/notifications/read-all', {
    method: 'PATCH',
  })
  const body = await readBody(response, 'Failed to update notifications')
  return body?.data ?? body
}
