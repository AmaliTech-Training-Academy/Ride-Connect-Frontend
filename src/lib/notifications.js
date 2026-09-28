/**
 * Presentation layer for in-app notifications.
 *
 * The backend stores an event, not a sentence: it sends `type`, `actorName`
 * and the ride's origin/destination, and the wording is composed here. That
 * keeps copy changes on the frontend, where they ship without a deploy.
 */

/**
 * Icon and tone per event. An unrecognised type falls back to a plain bell
 * rather than disappearing, so a type added later still renders.
 */
const PRESENTATION = {
  RIDE_REQUEST_RECEIVED: { icon: 'fa-user-plus', tone: 'info' },
  RIDE_REQUEST_REREQUESTED: { icon: 'fa-rotate-right', tone: 'info' },
  REQUEST_ACCEPTED: { icon: 'fa-circle-check', tone: 'success' },
  REQUEST_DECLINED: { icon: 'fa-xmark', tone: 'danger' },
  PASSENGER_WITHDREW: { icon: 'fa-user-minus', tone: 'danger' },
  RIDE_CANCELLED: { icon: 'fa-ban', tone: 'danger' },
  RIDE_UPDATED: { icon: 'fa-pen-to-square', tone: 'info' },
}

const FALLBACK_PRESENTATION = { icon: 'fa-bell', tone: 'info' }

/**
 * Which My Rides tab a notification belongs to.
 *
 * Driver-side events concern a ride the viewer posted; the rest happened to a
 * ride they joined. Sending a passenger to the driving tab shows them an empty
 * list, so the tab is chosen from the event rather than assumed.
 */
const PASSENGER_EVENTS = new Set([
  'REQUEST_ACCEPTED',
  'REQUEST_DECLINED',
  'RIDE_CANCELLED',
  'RIDE_UPDATED',
])

export function audienceFor(type) {
  return PASSENGER_EVENTS.has(String(type ?? '').toUpperCase())
    ? 'joined'
    : 'driving'
}

export function presentationFor(type) {
  return PRESENTATION[String(type ?? '').toUpperCase()] ?? FALLBACK_PRESENTATION
}

/**
 * Builds the sentence shown in the panel.
 *
 * Every field the backend sends is nullable, so each phrase degrades: an
 * unnamed actor becomes "Someone", and a route that is missing is simply left
 * out rather than rendering "undefined".
 */
export function composeMessage({
  type,
  actorName,
  rideOrigin,
  rideDestination,
} = {}) {
  const who = actorName?.trim() || 'Someone'
  const hasRoute = Boolean(rideOrigin && rideDestination)
  const route = hasRoute ? `${rideOrigin} to ${rideDestination}` : ''
  const onRoute = hasRoute ? ` on your ride to ${rideDestination}` : ''
  const forRoute = hasRoute ? ` for ${route}` : ''

  switch (String(type ?? '').toUpperCase()) {
    case 'RIDE_REQUEST_RECEIVED':
      return `${who} requested to join your ride${hasRoute ? ` to ${rideDestination}` : ''}.`
    case 'RIDE_REQUEST_REREQUESTED':
      return `${who} asked again to join your ride${hasRoute ? ` to ${rideDestination}` : ''}.`
    case 'REQUEST_ACCEPTED':
      return `${who} accepted your request${forRoute}.`
    case 'REQUEST_DECLINED':
      return `${who} declined your request${forRoute}.`
    case 'PASSENGER_WITHDREW':
      return `${who} withdrew${onRoute}.`
    case 'RIDE_CANCELLED':
      return hasRoute
        ? `Your ride from ${route} was cancelled.`
        : 'Your ride was cancelled.'
    case 'RIDE_UPDATED':
      return hasRoute
        ? `${who} changed the details of the ride from ${route}.`
        : `${who} changed the details of your ride.`
    default:
      // An unknown type still says something rather than rendering blank.
      return hasRoute
        ? `There is an update on your ride from ${route}.`
        : 'You have a new notification.'
  }
}

/**
 * Relative age, matching the design's vocabulary: "12 min ago", "3 h ago",
 * "Yesterday", "2 days ago".
 *
 * "Yesterday" is decided by calendar day rather than a rolling 24 hours, so
 * 11pm last night reads as Yesterday at 8am today rather than "9 h ago".
 */
export function describeNotificationAge(isoString, now = new Date()) {
  if (!isoString) return ''

  const then = new Date(isoString)
  if (Number.isNaN(then.getTime())) return ''

  const minutes = Math.max(
    0,
    Math.round((now.getTime() - then.getTime()) / 60000),
  )
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfThatDay = new Date(then)
  startOfThatDay.setHours(0, 0, 0, 0)
  const days = Math.round(
    (startOfToday.getTime() - startOfThatDay.getTime()) / 86400000,
  )

  if (days <= 0) return `${Math.floor(minutes / 60)} h ago`
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

/** The exact timestamp, for the title attribute behind the relative text. */
export function exactTimestamp(isoString) {
  if (!isoString) return ''
  const value = new Date(isoString)
  if (Number.isNaN(value.getTime())) return ''
  return value.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function normaliseNotification(raw) {
  const type = String(raw.type ?? '').toUpperCase()

  return {
    id: raw.id,
    type,
    message: composeMessage({ ...raw, type }),
    // The backend records when it was read, not whether; unread is null.
    read: Boolean(raw.readAt),
    readAt: raw.readAt ?? null,
    createdAt: raw.createdAt ?? null,
    rideId: raw.rideId ?? null,
    requestId: raw.requestId ?? null,
    actorName: raw.actorName ?? '',
    audience: audienceFor(type),
  }
}

export function normaliseNotifications(payload) {
  const data = payload?.data ?? {}
  const notifications = (data.items ?? []).map(normaliseNotification)

  return {
    notifications,
    // Trust the server's count: the list is paged, the count is not.
    unreadCount:
      typeof data.unreadCount === 'number'
        ? data.unreadCount
        : notifications.filter((item) => !item.read).length,
  }
}
