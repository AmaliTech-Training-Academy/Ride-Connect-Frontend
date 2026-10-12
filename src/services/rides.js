import { apiFetch } from '../lib/api'

export class RideStatusError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'RideStatusError'
    this.status = status
  }
}

/**
 * Fetches the signed-in user's rides.
 *
 * Returns the whole envelope so the caller can read the driver buckets
 * (`data.driving`, `data.pastAndCancelled`) alongside the passenger ones.
 *
 * @returns {Promise<{ success: boolean, message?: string, data: object }>}
 */
export async function fetchMyRides() {
  const response = await apiFetch('/api/rides/mine')

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body?.message || `Failed to load your rides (${response.status})`
    throw new RideStatusError(message, response.status)
  }

  return body
}

/**
 * Updates a ride the signed-in user is driving.
 *
 * Takes the same field names as `POST /api/rides`, so the offer form needs no
 * translation between creating and editing.
 *
 * @param {string} rideId
 * @param {{ origin: string, destination: string, departureDate: string,
 *   departureTime: string, availableSeats: number, routeDescription?: string }} payload
 */
export async function updateRide(rideId, payload) {
  const response = await apiFetch(`/api/rides/${encodeURIComponent(rideId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body?.message || `Failed to update this ride (${response.status})`
    const error = new RideStatusError(message, response.status)
    // A 400 names the offending fields; the form shows them beside the inputs.
    error.fields = body?.data?.fields ?? null
    throw error
  }

  return body?.data ?? body
}

/**
 * Asks to join a ride as a passenger.
 *
 * @param {string} rideId - UUID of the ride
 * @returns {Promise<{ id: string, rideId: string, passengerId: string, status: string, createdAt: string }>}
 */
export async function requestToJoinRide(rideId) {
  const response = await apiFetch(
    `/api/rides/${encodeURIComponent(rideId)}/requests`,
    { method: 'POST' },
  )

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body?.message || `Failed to send your request (${response.status})`
    throw new RideStatusError(message, response.status)
  }

  return body?.data ?? body
}

/**
 * Updates a ride's status to OPEN, FULL, or CANCELLED.
 *
 * @param {string} rideId - UUID of the ride
 * @param {'OPEN' | 'FULL' | 'CANCELLED'} status - Desired target status
 * @returns {Promise<{ id: string, driverId: string, status: string, availableSeats: number }>}
 */
export async function updateRideStatus(rideId, status) {
  const normalizedStatus = String(status).toUpperCase()

  const response = await apiFetch(
    `/api/rides/${encodeURIComponent(rideId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: normalizedStatus }),
    },
  )

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body?.message || `Failed to update ride status (${response.status})`
    throw new RideStatusError(message, response.status)
  }

  return body?.data
}

/**
 * Lists the pending requests on a ride the viewer drives. Unlike the
 * `pendingRequests` in `GET /rides/mine`, each one says whether it is a
 * re-request and carries both reasons.
 *
 * @param {string} rideId - UUID of the ride
 * @returns {Promise<Array<{ id: string, passengerName: string, status: string, isRerequest?: boolean, rejectionReason?: string, rerequestReason?: string }>>}
 */
export async function fetchRideRequests(rideId) {
  const response = await apiFetch(
    `/api/rides/${encodeURIComponent(rideId)}/requests`,
  )

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body?.message || `Failed to load the ride's requests (${response.status})`
    throw new RideStatusError(message, response.status)
  }

  return body?.data ?? []
}

/**
 * Asks once more after a decline. The backend allows a single re-request,
 * and only while the ride is open and has not departed.
 *
 * @param {string} rideId - UUID of the ride
 * @param {string} requestId - UUID of the declined request
 * @param {string} reason - Required, 1-500 characters after trimming
 * @returns {Promise<{ id: string, rideId: string, passengerId: string, status: string }>}
 */
export async function rerequestRide(rideId, requestId, reason) {
  const response = await apiFetch(
    `/api/rides/${encodeURIComponent(rideId)}/requests/${encodeURIComponent(requestId)}/rerequest`,
    {
      method: 'PATCH',
      body: JSON.stringify({ reason: String(reason ?? '').trim() }),
    },
  )

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body?.data?.fields?.reason?.[0] ||
      body?.message ||
      `Failed to send your request again (${response.status})`
    throw new RideStatusError(message, response.status)
  }

  return body?.data ?? body
}

/**
 * Withdraws the signed-in user's own join request for a ride.
 *
 * @param {string} rideId - UUID of the ride
 * @param {string} requestId - UUID of the join request
 * @returns {Promise<any>}
 */
export async function withdrawRideRequest(rideId, requestId) {
  const response = await apiFetch(
    `/api/rides/${encodeURIComponent(rideId)}/requests/${encodeURIComponent(requestId)}/withdraw`,
    { method: 'PATCH' },
  )

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body?.message || `Failed to withdraw your request (${response.status})`
    throw new RideStatusError(message, response.status)
  }

  return body?.data ?? body
}

/**
 * Accepts a passenger's join request for a ride.
 *
 * @param {string} rideId - UUID of the ride
 * @param {string} requestId - UUID of the join request
 * @returns {Promise<any>}
 */
export async function acceptPassengerRequest(rideId, requestId) {
  const response = await apiFetch(
    `/api/rides/${encodeURIComponent(rideId)}/requests/${encodeURIComponent(requestId)}/accept`,
    {
      method: 'PATCH',
    },
  )

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body?.message || `Failed to accept passenger request (${response.status})`
    throw new RideStatusError(message, response.status)
  }

  return body?.data ?? body
}

/**
 * Removes a passenger the driver has already accepted. The backend frees the
 * seat, reopens a ride that was full because of it, and tells the passenger
 * why; the request itself goes back to DECLINED.
 *
 * @param {string} rideId - UUID of the ride
 * @param {string} requestId - `confirmedPassengers[].id`, never `passengerId`
 * @param {string} reason - Required, 1-500 characters after trimming
 * @returns {Promise<any>}
 */
export async function removeAcceptedPassenger(rideId, requestId, reason = '') {
  const trimmedReason = String(reason ?? '').trim()

  const response = await apiFetch(
    `/api/rides/${encodeURIComponent(rideId)}/requests/${encodeURIComponent(requestId)}/remove`,
    {
      method: 'PATCH',
      body: JSON.stringify({ reason: trimmedReason }),
    },
  )

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    // A 400 names the offending field, which reads better beside the input;
    // a 409 (already removed, ride cancelled or departed) carries its own
    // message worth showing verbatim.
    const fieldMessage = body?.data?.fields?.reason?.[0]
    const message =
      fieldMessage ||
      body?.message ||
      `Failed to remove this passenger (${response.status})`
    throw new RideStatusError(message, response.status)
  }

  return body?.data ?? body
}

/**
 * Declines a passenger's join request for a ride.
 *
 * @param {string} rideId - UUID of the ride
 * @param {string} requestId - UUID of the join request
 * @param {string} reason - Required, 1-500 characters after trimming
 * @returns {Promise<any>}
 */
export async function declinePassengerRequest(rideId, requestId, reason = '') {
  // The backend requires a reason of 1-500 characters after trimming.
  const trimmedReason = String(reason ?? '').trim()

  const response = await apiFetch(
    `/api/rides/${encodeURIComponent(rideId)}/requests/${encodeURIComponent(requestId)}/decline`,
    {
      method: 'PATCH',
      body: JSON.stringify({ reason: trimmedReason }),
    },
  )

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    // A 400 names the offending field, which reads better beside the input
    // than the generic message does above the dialog.
    const fieldMessage = body?.data?.fields?.reason?.[0]
    const message =
      fieldMessage ||
      body?.message ||
      `Failed to decline passenger request (${response.status})`
    throw new RideStatusError(message, response.status)
  }

  return body?.data ?? body
}
