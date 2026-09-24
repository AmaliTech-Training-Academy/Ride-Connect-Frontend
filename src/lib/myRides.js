/**
 * Maps the `GET /api/rides/mine` payload onto the shape the My Rides screen
 * renders. Kept pure so the mapping can be tested without a component.
 *
 * Only the driver-side buckets are read here: `joined` and
 * `joinedPastAndCancelled` belong to the "Rides I've joined" tab, which is
 * still a placeholder.
 */

export function initialsFrom(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Splits an ISO instant into the local date and time strings the screen
 * formats and compares against. The rest of the screen works in local time,
 * so a ride at 08:15 reads as 08:15 to the driver who posted it.
 */
export function toLocalDateAndTime(isoString) {
  // `new Date(null)` is the epoch rather than an invalid date, so a missing
  // timestamp would otherwise render as 1970.
  if (!isoString) return { date: '', time: '' }

  const departure = new Date(isoString)
  if (Number.isNaN(departure.getTime())) {
    return { date: '', time: '' }
  }
  const pad = (value) => String(value).padStart(2, '0')
  return {
    date: `${departure.getFullYear()}-${pad(departure.getMonth() + 1)}-${pad(departure.getDate())}`,
    time: `${pad(departure.getHours())}:${pad(departure.getMinutes())}`,
  }
}

/**
 * Renders "8 min" / "3 h" / "2 d" for a request timestamp. Derived at render
 * time rather than stored, so it doesn't go stale on a page left open.
 */
export function describeElapsed(isoString, now = new Date()) {
  if (!isoString) return ''

  const then = new Date(isoString)
  if (Number.isNaN(then.getTime())) return ''

  const minutes = Math.max(
    0,
    Math.round((now.getTime() - then.getTime()) / 60000),
  )
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`

  return `${Math.floor(hours / 24)} d`
}

function normalisePerson(person) {
  const name = person.passengerName ?? person.name ?? ''
  return {
    id: person.id,
    passengerId: person.passengerId,
    name,
    initials: initialsFrom(name),
  }
}

export function normaliseDriverRide(
  ride,
  { isPast = false, now = new Date() } = {},
) {
  const { date, time } = toLocalDateAndTime(ride.departureAt)

  return {
    id: ride.id,
    driverId: ride.driverId,
    origin: ride.origin,
    destination: ride.destination,
    description: ride.routeDescription || '',
    date,
    time,
    status: String(ride.status || '').toLowerCase(),
    seatsTotal: ride.totalSeats,
    seatsAvailable: ride.availableSeats,
    isPast,
    pendingRequests: (ride.pendingRequests || []).map((request) => ({
      ...normalisePerson(request),
      requestedLabel: describeElapsed(request.createdAt, now),
    })),
    confirmedPassengers: (ride.confirmedPassengers || []).map(normalisePerson),
  }
}

/**
 * Flattens the driver-side buckets into one list. `isPast` records which
 * bucket a ride arrived in, so the server's classification is honoured even
 * for a ride whose own fields don't look past.
 */
export function normaliseMyRides(payload, now = new Date()) {
  const data = payload?.data ?? {}
  return [
    ...(data.driving ?? []).map((ride) =>
      normaliseDriverRide(ride, { isPast: false, now }),
    ),
    ...(data.pastAndCancelled ?? []).map((ride) =>
      normaliseDriverRide(ride, { isPast: true, now }),
    ),
  ]
}

/**
 * Maps a ride from the `joined`/`joinedPastAndCancelled` buckets onto the
 * shape the "Rides I've joined" tab renders. These buckets already carry
 * `requestId`/`requestStatus`/`requestedAt` from the server, so there is no
 * passenger list to normalise the way `normaliseDriverRide` does.
 */
export function normaliseJoinedRide(ride, { isPast = false } = {}) {
  const { date, time } = toLocalDateAndTime(ride.departureAt)

  return {
    id: ride.id,
    driverId: ride.driverId,
    driverName: ride.driverName,
    origin: ride.origin,
    destination: ride.destination,
    description: ride.routeDescription || '',
    date,
    time,
    status: String(ride.status || '').toLowerCase(),
    seatsTotal: ride.totalSeats,
    seatsAvailable: ride.availableSeats,
    requestId: ride.requestId,
    requestStatus: ride.requestStatus,
    requestedAt: ride.requestedAt,
    declineReason: ride.declineReason,
    isPast,
  }
}

/**
 * Flattens the passenger-side buckets into one list, mirroring
 * `normaliseMyRides` for the driver side.
 */
export function normaliseMyJoinedRides(payload) {
  const data = payload?.data ?? {}
  return [
    ...(data.joined ?? []).map((ride) =>
      normaliseJoinedRide(ride, { isPast: false }),
    ),
    ...(data.joinedPastAndCancelled ?? []).map((ride) =>
      normaliseJoinedRide(ride, { isPast: true }),
    ),
  ]
}
