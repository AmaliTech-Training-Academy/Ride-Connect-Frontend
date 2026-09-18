import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../lib/api'
import './RideStatusManagement.css'

function getInitials(name) {
  if (!name) return '??'
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatRelativeTime(isoString) {
  if (!isoString) return ''
  try {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    if (diffMinutes < 1) return 'Requested just now'
    if (diffMinutes < 60) return `Requested ${diffMinutes} min ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `Requested ${diffHours} hr ago`
    const diffDays = Math.floor(diffHours / 24)
    return `Requested ${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } catch {
    return 'Requested recently'
  }
}

function mapApiRequest(req) {
  return {
    id: req.id,
    passengerId: req.passengerId,
    name: req.passengerName || req.name || 'Passenger',
    initials: req.initials || getInitials(req.passengerName || req.name),
    meta: req.meta || formatRelativeTime(req.createdAt),
    status: req.status,
    createdAt: req.createdAt,
  }
}

function RideStatusManagement({
  user,
  currentUserId,
  onLogout,
  onFindRide,
  onOfferRide,
  onUnauthorized,
  initialRides = [],
  initialPastRides = [],
}) {
  const activeDriverId = currentUserId ?? user?.id ?? 'driver-1'
  const [activeTab, setActiveTab] = useState('driving')
  const [rides, setRides] = useState(() =>
    initialRides.map((ride) => ({
      ...ride,
      driverId: ride.driverId ?? activeDriverId,
    })),
  )
  const [pastRides, setPastRides] = useState(initialPastRides)
  const [pastExpanded, setPastExpanded] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [cancelModalRide, setCancelModalRide] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const toastTimeoutRef = useRef(null)

  const isRideOwnedByCurrentUser = (ride) =>
    ride && String(ride.driverId ?? activeDriverId) === String(activeDriverId)

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (toastMessage) {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = setTimeout(() => {
        setToastMessage(null)
      }, 3500)
    }
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [toastMessage])

  // Close three-dot menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (openMenuId !== null && !e.target.closest('.rsm-menu-wrap')) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [openMenuId])

  // Total pending requests across all driving rides
  const totalPendingRequests = rides.reduce(
    (sum, r) => sum + (r.requests?.length || 0),
    0,
  )

  const fetchPendingRequests = async (rideId) => {
    try {
      const response = await apiFetch(`/api/rides/${rideId}/requests`)
      if (response.status === 401) {
        onUnauthorized?.()
        return
      }
      if (!response.ok) return
      const body = await response.json()
      if (body?.data && Array.isArray(body.data)) {
        setRides((prev) =>
          prev.map((r) =>
            r.id === rideId
              ? {
                  ...r,
                  requests: body.data.map(mapApiRequest),
                }
              : r,
          ),
        )
      }
    } catch {
      // Ignore background fetch error
    }
  }

  const toggleExpand = (rideId) => {
    setRides((prev) =>
      prev.map((r) => {
        if (r.id === rideId) {
          const nextExpanded = !r.expanded
          if (nextExpanded && isRideOwnedByCurrentUser(r)) {
            fetchPendingRequests(r.id)
          }
          return { ...r, expanded: nextExpanded }
        }
        return r
      }),
    )
  }

  const handleAcceptRequest = async (rideId, request) => {
    try {
      const response = await apiFetch(
        `/api/rides/${rideId}/requests/${request.id}/accept`,
        {
          method: 'PATCH',
        },
      )

      if (response.status === 401) {
        onUnauthorized?.()
        return
      }

      const body = await response.json().catch(() => null)

      if (!response.ok) {
        setToastMessage({
          type: 'error',
          text: body?.message || 'Failed to accept request.',
        })
        return
      }

      setRides((prev) =>
        prev.map((ride) => {
          if (ride.id !== rideId || !isRideOwnedByCurrentUser(ride)) return ride
          if (ride.seatsAvailable <= 0) return ride

          const nextSeats = ride.seatsAvailable - 1
          const updatedRequests = (ride.requests || []).filter(
            (req) => req.id !== request.id,
          )
          const updatedPassengers = [
            ...(ride.passengers || []),
            { id: request.id, name: request.name, initials: request.initials },
          ]

          return {
            ...ride,
            seatsAvailable: nextSeats,
            status: nextSeats === 0 ? 'Full' : ride.status,
            requests: updatedRequests,
            passengers: updatedPassengers,
          }
        }),
      )

      const firstName = request.name.split(' ')[0]
      setToastMessage(`${firstName} has been added to your ride.`)
    } catch {
      setToastMessage({
        type: 'error',
        text: 'Network error. Please try again.',
      })
    }
  }

  const handleDeclineRequest = async (rideId, requestId) => {
    try {
      const response = await apiFetch(
        `/api/rides/${rideId}/requests/${requestId}/decline`,
        {
          method: 'PATCH',
        },
      )

      if (response.status === 401) {
        onUnauthorized?.()
        return
      }

      const body = await response.json().catch(() => null)

      if (!response.ok) {
        setToastMessage({
          type: 'error',
          text: body?.message || 'Failed to decline request.',
        })
        return
      }

      setRides((prev) =>
        prev.map((ride) => {
          if (ride.id !== rideId || !isRideOwnedByCurrentUser(ride)) return ride
          return {
            ...ride,
            requests: (ride.requests || []).filter(
              (req) => req.id !== requestId,
            ),
          }
        }),
      )
    } catch {
      setToastMessage({
        type: 'error',
        text: 'Network error. Please try again.',
      })
    }
  }

  const handleMarkRideFull = async (rideId) => {
    const response = await apiFetch(`/api/rides/${rideId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'FULL' }),
    })

    if (response.status === 401) {
      onUnauthorized?.()
      return
    }

    if (!response.ok) {
      setToastMessage('Failed to update ride status.')
      return
    }

    setRides((prev) =>
      prev.map((ride) => {
        if (ride.id !== rideId || !isRideOwnedByCurrentUser(ride)) return ride
        return { ...ride, status: 'Full', seatsAvailable: 0, expanded: true }
      }),
    )

    setOpenMenuId(null)
    setToastMessage('Ride status updated.')
  }

  const handleOpenCancelModal = (e, ride) => {
    e.stopPropagation()
    setOpenMenuId(null)
    setCancelModalRide(ride)
  }

  const handleConfirmCancelRide = async () => {
    if (!cancelModalRide) return

    const response = await apiFetch(`/api/rides/${cancelModalRide.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CANCELLED' }),
    })

    if (response.status === 401) {
      onUnauthorized?.()
      return
    }

    if (!response.ok) {
      setToastMessage('Failed to cancel ride.')
      setCancelModalRide(null)
      return
    }

    setRides((prev) =>
      prev.filter((ride) => {
        if (ride.id !== cancelModalRide.id) return true
        return !isRideOwnedByCurrentUser(ride)
      }),
    )
    setPastRides((prev) => [
      {
        id: `cancelled-${cancelModalRide.id}-${Date.now()}`,
        origin: cancelModalRide.origin,
        destination: cancelModalRide.destination,
        date: cancelModalRide.date,
        time: cancelModalRide.time,
        status: 'Cancelled',
      },
      ...prev,
    ])
    setCancelModalRide(null)
    setOpenMenuId(null)
    setToastMessage('Ride has been cancelled.')
  }

  return (
    <main className="rsm-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`rsm-toast ${typeof toastMessage === 'object' && toastMessage?.type === 'error' ? 'rsm-toast-error' : ''}`}
          role="status"
          aria-live="polite"
        >
          <i
            className={`fa-solid ${typeof toastMessage === 'object' && toastMessage?.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}
            aria-hidden="true"
          />
          <span>
            {typeof toastMessage === 'object'
              ? toastMessage.text
              : toastMessage}
          </span>
        </div>
      )}

      {/* Header */}
      <header className="rsm-header">
        <div className="rsm-brand">
          <i className="fa-solid fa-car-side" aria-hidden="true" />
          <span>RideConnect</span>
        </div>

        <nav className="rsm-nav" aria-label="Main navigation">
          {onFindRide && (
            <button type="button" className="rsm-nav-link" onClick={onFindRide}>
              Find a Ride
            </button>
          )}
          {onOfferRide && (
            <button
              type="button"
              className="rsm-nav-link active"
              onClick={onOfferRide}
            >
              Offer a Ride
            </button>
          )}
          {user?.email && (
            <span
              className="rsm-nav-link"
              style={{ cursor: 'default', color: '#6b7280' }}
            >
              {user.email}
            </span>
          )}
          {onLogout && (
            <button type="button" className="rsm-nav-link" onClick={onLogout}>
              Logout
            </button>
          )}
        </nav>
      </header>

      {/* Content */}
      <div className="rsm-content">
        <div className="rsm-heading">
          <h1>My rides</h1>
          <p>Manage rides you're driving and rides you've joined.</p>
        </div>

        {/* Tabs */}
        <div className="rsm-tabs" role="tablist" aria-label="Ride categories">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'driving'}
            className={`rsm-tab ${activeTab === 'driving' ? 'active' : ''}`}
            onClick={() => setActiveTab('driving')}
          >
            <span>Rides I'm driving</span>
            {totalPendingRequests > 0 && (
              <span
                className="rsm-tab-badge"
                aria-label={`${totalPendingRequests} pending requests`}
              >
                {totalPendingRequests}
              </span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'joined'}
            className={`rsm-tab ${activeTab === 'joined' ? 'active' : ''}`}
            onClick={() => setActiveTab('joined')}
          >
            <span>Rides I've joined</span>
          </button>
        </div>

        {/* Tab Content: Driving */}
        {activeTab === 'driving' && (
          <>
            {rides.length === 0 ? (
              <div className="rsm-empty">
                <div className="rsm-empty-icon" aria-hidden="true">
                  <i className="fa-solid fa-car-side" />
                </div>
                <h2>You haven't offered any rides yet.</h2>
                <p>
                  Post a ride and colleagues nearby will be able to request a
                  seat.
                </p>
                <button
                  type="button"
                  className="rsm-offer-btn"
                  onClick={onOfferRide || (() => {})}
                >
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                  Offer a Ride
                </button>
              </div>
            ) : (
              <>
                <div className="rsm-section-label">Upcoming</div>

                {rides.map((ride) => {
                  const isFull =
                    ride.seatsAvailable === 0 || ride.status === 'Full'
                  const newRequestCount = ride.requests
                    ? ride.requests.length
                    : 0

                  return (
                    <article key={ride.id} className="rsm-card">
                      {/* Summary Row */}
                      <div
                        className="rsm-summary"
                        onClick={() => toggleExpand(ride.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleExpand(ride.id)
                          }
                        }}
                        aria-expanded={ride.expanded}
                      >
                        <span
                          className={`rsm-chevron ${ride.expanded ? 'expanded' : ''}`}
                        >
                          <i
                            className="fa-solid fa-chevron-down"
                            aria-hidden="true"
                          />
                        </span>

                        <div className="rsm-summary-main">
                          <div className="rsm-route">
                            <span>{ride.origin}</span>
                            <i
                              className="fa-solid fa-arrow-right"
                              aria-hidden="true"
                            />
                            <span>{ride.destination}</span>
                          </div>

                          <div className="rsm-meta">
                            <span>
                              <i
                                className="fa-regular fa-calendar"
                                aria-hidden="true"
                              />
                              {ride.date}
                            </span>
                            <span>
                              <i
                                className="fa-regular fa-clock"
                                aria-hidden="true"
                              />
                              {ride.time}
                            </span>
                          </div>

                          {isFull ? (
                            <span className="rsm-pill rsm-pill-full">
                              <i
                                className="fa-solid fa-users"
                                aria-hidden="true"
                              />
                              Full
                            </span>
                          ) : (
                            <span className="rsm-pill rsm-pill-open">
                              <i
                                className="fa-solid fa-circle-check"
                                aria-hidden="true"
                              />
                              Open
                            </span>
                          )}

                          <div className="rsm-seats">
                            <i
                              className="fa-solid fa-user"
                              aria-hidden="true"
                            />
                            {ride.seatsAvailable} of {ride.totalSeats} seats
                            left
                          </div>

                          {newRequestCount > 0 && (
                            <span className="rsm-request-count">
                              {newRequestCount} new{' '}
                              {newRequestCount === 1 ? 'request' : 'requests'}
                            </span>
                          )}
                        </div>

                        {/* Three-dot menu */}
                        {isRideOwnedByCurrentUser(ride) && (
                          <div
                            className="rsm-menu-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="rsm-menu-btn"
                              aria-label={`Options for ride to ${ride.destination}`}
                              onClick={() =>
                                setOpenMenuId(
                                  openMenuId === ride.id ? null : ride.id,
                                )
                              }
                            >
                              <i
                                className="fa-solid fa-ellipsis-vertical"
                                aria-hidden="true"
                              />
                            </button>

                            {openMenuId === ride.id && (
                              <div className="rsm-dropdown" role="menu">
                                {!isFull && (
                                  <button
                                    type="button"
                                    className="rsm-dropdown-item"
                                    role="menuitem"
                                    onClick={() => handleMarkRideFull(ride.id)}
                                  >
                                    <i
                                      className="fa-solid fa-users"
                                      aria-hidden="true"
                                    />
                                    Mark as full
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="rsm-dropdown-item danger"
                                  role="menuitem"
                                  onClick={(e) =>
                                    handleOpenCancelModal(e, ride)
                                  }
                                >
                                  <i
                                    className="fa-solid fa-ban"
                                    aria-hidden="true"
                                  />
                                  Cancel ride
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expanded Panel */}
                      {ride.expanded && (
                        <div className="rsm-panel">
                          {/* Join Requests */}
                          {ride.requests && ride.requests.length > 0 && (
                            <>
                              <div className="rsm-panel-header">
                                Join requests
                              </div>

                              {ride.requests.map((request) => {
                                if (isFull) {
                                  return (
                                    <div
                                      key={request.id}
                                      className="rsm-request-row is-full"
                                    >
                                      <div className="rsm-person">
                                        <div className="rsm-avatar">
                                          {request.initials}
                                        </div>
                                        <div>
                                          <div className="rsm-person-name">
                                            {request.name}
                                          </div>
                                          <div className="rsm-person-meta">
                                            {request.meta}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="rsm-full-warning">
                                        <i
                                          className="fa-solid fa-triangle-exclamation"
                                          aria-hidden="true"
                                        />
                                        This ride is no longer accepting new
                                        requests.
                                      </div>
                                    </div>
                                  )
                                }

                                return (
                                  <div
                                    key={request.id}
                                    className="rsm-request-row"
                                  >
                                    <div className="rsm-person">
                                      <div className="rsm-avatar">
                                        {request.initials}
                                      </div>
                                      <div>
                                        <div className="rsm-person-name">
                                          {request.name}
                                        </div>
                                        <div className="rsm-person-meta">
                                          {request.meta}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="rsm-actions">
                                      <span className="rsm-status-dot pending">
                                        Pending
                                      </span>
                                      <button
                                        type="button"
                                        className="rsm-accept-btn"
                                        onClick={() =>
                                          handleAcceptRequest(ride.id, request)
                                        }
                                      >
                                        Accept
                                      </button>
                                      <button
                                        type="button"
                                        className="rsm-decline-btn"
                                        onClick={() =>
                                          handleDeclineRequest(
                                            ride.id,
                                            request.id,
                                          )
                                        }
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </>
                          )}

                          {/* Confirmed Passengers */}
                          <div className="rsm-panel-header">
                            Confirmed passengers
                          </div>

                          {isFull ? (
                            <div className="rsm-passenger-chips">
                              {ride.passengers.map((passenger) => (
                                <div
                                  key={passenger.id}
                                  className="rsm-passenger-chip"
                                >
                                  <div className="rsm-avatar">
                                    {passenger.initials}
                                  </div>
                                  <span>{passenger.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            ride.passengers.map((passenger) => (
                              <div
                                key={passenger.id}
                                className="rsm-passenger-row"
                              >
                                <div className="rsm-person">
                                  <div className="rsm-avatar">
                                    {passenger.initials}
                                  </div>
                                  <div className="rsm-person-name">
                                    {passenger.name}
                                  </div>
                                </div>
                                <span className="rsm-status-dot accepted">
                                  Accepted
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </>
            )}

            {/* Past & Cancelled Accordion */}
            {pastRides.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  className="rsm-past-toggle"
                  onClick={() => setPastExpanded(!pastExpanded)}
                  aria-expanded={pastExpanded}
                >
                  <span
                    className={`rsm-past-chevron ${pastExpanded ? 'expanded' : ''}`}
                  >
                    <i
                      className="fa-solid fa-chevron-right"
                      aria-hidden="true"
                    />
                  </span>
                  <span>Past &amp; cancelled ({pastRides.length})</span>
                </button>

                {pastExpanded && (
                  <div>
                    {pastRides.map((past) => (
                      <div key={past.id} className="rsm-past-card">
                        <div className="rsm-route">
                          <span>{past.origin}</span>
                          <i
                            className="fa-solid fa-arrow-right"
                            aria-hidden="true"
                          />
                          <span>{past.destination}</span>
                        </div>

                        <div className="rsm-meta">
                          <span>
                            <i
                              className="fa-regular fa-calendar"
                              aria-hidden="true"
                            />
                            {past.date}
                          </span>
                          <span>
                            <i
                              className="fa-regular fa-clock"
                              aria-hidden="true"
                            />
                            {past.time}
                          </span>
                        </div>

                        {past.status === 'Cancelled' ? (
                          <span className="rsm-pill rsm-pill-cancelled">
                            <i className="fa-solid fa-ban" aria-hidden="true" />
                            Cancelled
                          </span>
                        ) : (
                          <span className="rsm-pill rsm-pill-departed">
                            <i
                              className="fa-regular fa-clock"
                              aria-hidden="true"
                            />
                            Departed
                          </span>
                        )}
                      </div>
                    ))}
                    <div className="rsm-past-note">
                      No actions available on past or cancelled rides.
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Tab Content: Joined */}
        {activeTab === 'joined' && (
          <div className="rsm-empty">
            <div className="rsm-empty-icon" aria-hidden="true">
              <i className="fa-solid fa-car-side" />
            </div>
            <h2>You haven't joined any rides yet.</h2>
            <p>
              Search for available rides heading to your destination and request
              a seat.
            </p>
            <button
              type="button"
              className="rsm-offer-btn"
              onClick={onFindRide || (() => {})}
            >
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              Find a Ride
            </button>
          </div>
        )}
      </div>

      {/* Cancel Ride Modal */}
      {cancelModalRide && (
        <div
          className="rsm-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          onClick={() => setCancelModalRide(null)}
        >
          <div className="rsm-modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="cancel-modal-title">Cancel this ride?</h2>
            <p>
              Passengers who requested or joined will see it as cancelled. This
              can't be undone.
            </p>
            <div className="rsm-modal-actions">
              <button
                type="button"
                className="rsm-modal-keep"
                onClick={() => setCancelModalRide(null)}
              >
                Keep ride
              </button>
              <button
                type="button"
                className="rsm-modal-cancel"
                onClick={handleConfirmCancelRide}
              >
                Cancel ride
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default RideStatusManagement
