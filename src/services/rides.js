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
