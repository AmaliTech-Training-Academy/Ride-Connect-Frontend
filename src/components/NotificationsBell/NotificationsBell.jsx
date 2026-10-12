import { useEffect, useRef, useState } from 'react'
import {
  describeNotificationAge,
  exactTimestamp,
  normaliseNotifications,
  presentationFor,
} from '../../lib/notifications'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notifications'
import './NotificationsBell.css'

function NotificationRow({ notification, onSelect }) {
  const { icon, tone } = presentationFor(notification.type)
  const age = describeNotificationAge(notification.createdAt)

  return (
    <button
      type="button"
      className={`notifications-item ${notification.read ? '' : 'notifications-item-unread'}`}
      onClick={() => onSelect(notification)}
    >
      {!notification.read && (
        <span className="notifications-unread-marker" aria-hidden="true" />
      )}
      <span className={`notifications-icon notifications-icon-${tone}`}>
        <i className={`fa-solid ${icon}`} aria-hidden="true" />
      </span>
      <span className="notifications-body">
        <span className="notifications-message">{notification.message}</span>
        {age && (
          <time
            className="notifications-age"
            dateTime={notification.createdAt ?? undefined}
            title={exactTimestamp(notification.createdAt)}
          >
            {age}
          </time>
        )}
      </span>
      {!notification.read && (
        <span className="notifications-sr-only">Unread</span>
      )}
    </button>
  )
}

/**
 * The header bell plus its dropdown.
 *
 * Lives in both the My Rides and Find a Ride headers, so it owns its own
 * fetching rather than having each screen pass the list down.
 */
function NotificationsBell({ className = '', onOpenRide }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const containerRef = useRef(null)
  const bellRef = useRef(null)

  useEffect(() => {
    let ignore = false

    fetchNotifications()
      .then((payload) => {
        if (ignore) return
        const { notifications: loaded, unreadCount: count } =
          normaliseNotifications(payload)
        setNotifications(loaded)
        setUnreadCount(count)
        setLoadState('loaded')
      })
      .catch((error) => {
        if (ignore) return
        // A 401 is announced by the API layer, so it needs no handling here.
        setLoadError(error?.message || 'Unable to load notifications')
        setLoadState('error')
      })

    return () => {
      ignore = true
    }
  }, [reloadToken])

  // Dismiss on an outside click or Escape, and hand focus back to the bell.
  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        bellRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const applyRead = (id) =>
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )

  const handleSelect = async (notification) => {
    setIsOpen(false)

    if (!notification.read) {
      applyRead(notification.id)
      setUnreadCount((count) => Math.max(0, count - 1))
      try {
        // The API returns { id, readAt }; the count is kept locally rather
        // than costing an extra round trip on every click.
        await markNotificationRead(notification.id)
      } catch {
        // The row is already marked locally; a failure here is not worth
        // interrupting the navigation the user asked for.
      }
    }

    if (notification.rideId) {
      onOpenRide?.(notification.rideId, notification.audience)
    }
  }

  const handleMarkAll = async () => {
    const previous = notifications
    const previousCount = unreadCount
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    )
    setUnreadCount(0)

    try {
      await markAllNotificationsRead()
    } catch {
      setNotifications(previous)
      setUnreadCount(previousCount)
    }
  }

  const hasUnread = unreadCount > 0

  return (
    <div className="notifications-root" ref={containerRef}>
      <button
        ref={bellRef}
        type="button"
        className={className}
        aria-label={
          hasUnread
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications, none unread'
        }
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <i className="fa-regular fa-bell" aria-hidden="true" />
        {hasUnread && (
          <span className="notifications-count" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-panel">
          <div className="notifications-panel-header">
            <h2>Notifications</h2>
            {loadState === 'loaded' && hasUnread && (
              <button
                type="button"
                className="notifications-mark-all"
                onClick={handleMarkAll}
              >
                Mark all as read
              </button>
            )}
          </div>

          {loadState === 'loading' && (
            <p className="notifications-status" role="status">
              Loading notifications...
            </p>
          )}

          {loadState === 'error' && (
            <div className="notifications-status" role="alert">
              <p>{loadError}</p>
              <button
                type="button"
                className="notifications-retry"
                onClick={() => {
                  setLoadState('loading')
                  setLoadError('')
                  setReloadToken((token) => token + 1)
                }}
              >
                Try again
              </button>
            </div>
          )}

          {loadState === 'loaded' && notifications.length === 0 && (
            <div className="notifications-empty">
              <i className="fa-solid fa-circle-check" aria-hidden="true" />
              <p>You&apos;re all caught up.</p>
            </div>
          )}

          {loadState === 'loaded' && notifications.length > 0 && (
            <div className="notifications-list">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
