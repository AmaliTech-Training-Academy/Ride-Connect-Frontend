import { useEffect, useRef, useState } from 'react'
import {
  acceptPassengerRequest,
  declinePassengerRequest,
  fetchMyRides,
  updateRideStatus,
} from '../services/rides'
import { normaliseMyRides } from '../lib/myRides'
import './MyRidesDashboard.css'

function formatDate(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
function formatTime(timeString) {
  const [hourString, minute] = timeString.split(':')
  const hour = Number(hourString)
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`
}
function hasDeparted(ride) {
  return new Date(`${ride.date}T${ride.time}`) < new Date()
}
/**
 * The server already splits rides into `driving` and `pastAndCancelled`, which
 * `isPast` records. Departure time is still checked so a ride that departs
 * while the page is open moves across on its own.
 */
function isPastRide(ride) {
  return (
    ride.isPast ||
    ride.status === 'cancelled' ||
    ride.status === 'completed' ||
    hasDeparted(ride)
  )
}
function getRideStatus(ride) {
  const normalized = String(ride.status || '').toLowerCase()
  if (normalized === 'cancelled') return 'cancelled'
  if (normalized === 'completed') return 'completed'
  if (normalized === 'in-progress' || normalized === 'in_progress')
    return 'in-progress'
  if (hasDeparted(ride)) return 'departed'
  if (normalized === 'full' || ride.seatsAvailable === 0) return 'full'
  return 'open'
}

function Avatar({ initials }) {
  return <span className="my-rides-avatar">{initials}</span>
}
function StatusBadge({ status }) {
  const normalizedStatus = String(status || '').replace('_', '-')
  return (
    <span className={`my-rides-status my-rides-status-${normalizedStatus}`}>
      {normalizedStatus}
    </span>
  )
}

function JoinRequestRow({ request, isFull, isPending, onAccept, onDecline }) {
  return (
    <div
      className={`my-rides-person-row ${isFull ? 'my-rides-person-row-warning' : ''}`}
    >
      <Avatar initials={request.initials} />
      <div className="my-rides-person-info">
        <strong>{request.name}</strong>
        <span>Requested {request.requestedLabel} ago</span>
      </div>
      <StatusBadge status="pending" />
      {isFull && (
        <p className="my-rides-full-warning">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />{' '}
          This ride is now full - decline or reopen to accept.
        </p>
      )}
      <div className="my-rides-person-actions">
        <button
          type="button"
          className="my-rides-accept"
          disabled={isFull || isPending}
          onClick={onAccept}
        >
          Accept
        </button>
        <button
          type="button"
          className="my-rides-decline"
          disabled={isPending}
          onClick={onDecline}
        >
          Decline
        </button>
      </div>
    </div>
  )
}

function ConfirmedPassengerRow({ passenger }) {
  return (
    <div className="my-rides-person-row">
      <Avatar initials={passenger.initials} />
      <div className="my-rides-person-info">
        <strong>{passenger.name}</strong>
      </div>
      <StatusBadge status="accepted" />
    </div>
  )
}

function RideMenu({ ride, onStatusChange, onRequestCancel }) {
  const isRideFull = getRideStatus(ride) === 'full'

  return (
    <div
      className="my-rides-context-menu"
      onClick={(event) => event.stopPropagation()}
    >
      {isRideFull && ride.seatsAvailable > 0 && (
        <button type="button" onClick={() => onStatusChange('OPEN')}>
          Reopen ride
        </button>
      )}
      {!isRideFull && ride.status !== 'cancelled' && (
        <button type="button" onClick={() => onStatusChange('FULL')}>
          Mark as Full
        </button>
      )}
      <button type="button" onClick={onRequestCancel}>
        Cancel ride
      </button>
    </div>
  )
}

function RideRow({
  ride,
  isExpanded,
  isMenuOpen,
  onToggle,
  onMenu,
  onAccept,
  onDecline,
  onStatusChange,
  onRequestCancel,
  isRequestPending,
}) {
  const menuButtonRef = useRef(null)
  const status = getRideStatus(ride)
  return (
    <article
      className={`my-rides-card ${isExpanded ? 'my-rides-card-expanded' : ''}`}
    >
      <div className="my-rides-card-summary">
        <button
          type="button"
          className="my-rides-summary-button"
          onClick={onToggle}
          aria-expanded={isExpanded}
        >
          <i
            className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} my-rides-chevron`}
            aria-hidden="true"
          />
          <span className="my-rides-route">
            {ride.origin}{' '}
            <i className="fa-solid fa-arrow-right-long" aria-hidden="true" />{' '}
            {ride.destination}
          </span>
          <span className="my-rides-summary-meta">
            <i className="fa-regular fa-calendar" aria-hidden="true" />{' '}
            {formatDate(ride.date)}
          </span>
          <span className="my-rides-summary-meta">
            <i className="fa-regular fa-clock" aria-hidden="true" />{' '}
            {formatTime(ride.time)}
          </span>
          <StatusBadge status={status} />
          <span className="my-rides-seat-count">
            {ride.seatsAvailable} of {ride.seatsTotal} seats left
          </span>
          {ride.pendingRequests.length > 0 && (
            <span className="my-rides-request-pill">
              {ride.pendingRequests.length} new requests
            </span>
          )}
        </button>
        <button
          ref={menuButtonRef}
          type="button"
          className="my-rides-menu-button"
          aria-label={`Options for ${ride.origin} to ${ride.destination}`}
          aria-expanded={isMenuOpen}
          onClick={(event) => {
            event.stopPropagation()
            onMenu()
          }}
        >
          <i className="fa-solid fa-ellipsis-vertical" aria-hidden="true" />
        </button>
        {isMenuOpen && (
          <RideMenu
            ride={ride}
            onStatusChange={onStatusChange}
            onRequestCancel={() => onRequestCancel(menuButtonRef.current)}
          />
        )}
      </div>
      {isExpanded && (
        <div className="my-rides-card-details">
          {ride.pendingRequests.length > 0 && (
            <section className="my-rides-detail-section">
              <h3>Join requests</h3>
              {ride.pendingRequests.map((request) => (
                <JoinRequestRow
                  key={request.id}
                  request={request}
                  isFull={status === 'full'}
                  isPending={isRequestPending(ride.id, request.id)}
                  onAccept={() => onAccept(ride.id, request.id)}
                  onDecline={() => onDecline(ride.id, request.id)}
                />
              ))}
            </section>
          )}
          {ride.confirmedPassengers.length > 0 && (
            <section className="my-rides-detail-section">
              <h3>Confirmed passengers</h3>
              {ride.confirmedPassengers.map((passenger) => (
                <ConfirmedPassengerRow
                  key={passenger.id}
                  passenger={passenger}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </article>
  )
}

/**
 * Rendered only while a ride is pending cancellation, so the focus-trap effect
 * runs on open and tears down on close. aria-modal is only honest if focus
 * actually stays inside, hence the Tab wrap and the focus restore.
 */
function CancelRideDialog({
  error,
  isPending,
  returnFocusTo,
  onKeep,
  onConfirm,
}) {
  const dialogRef = useRef(null)
  const keepRef = useRef(null)
  const onKeepRef = useRef(onKeep)

  useEffect(() => {
    onKeepRef.current = onKeep
  }, [onKeep])

  useEffect(() => {
    const previouslyFocused = returnFocusTo?.current ?? document.activeElement
    keepRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onKeepRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="my-rides-modal-backdrop">
      <div
        ref={dialogRef}
        className="my-rides-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-ride-title"
      >
        <div className="my-rides-modal-icon">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        </div>
        <h2 id="cancel-ride-title">Cancel this ride?</h2>
        <p>
          Passengers who requested or joined will see it as cancelled. This
          can&apos;t be undone.
        </p>
        {error && (
          <p className="my-rides-modal-error" role="alert">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{' '}
            {error}
          </p>
        )}
        <div className="my-rides-modal-actions">
          <button
            ref={keepRef}
            type="button"
            className="my-rides-ghost-button"
            onClick={onKeep}
          >
            Keep ride
          </button>
          <button
            type="button"
            className="my-rides-danger-button"
            disabled={isPending}
            onClick={onConfirm}
          >
            {error ? 'Try again' : 'Cancel ride'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CancelRideModal({ ride, ...props }) {
  if (!ride) return null
  // `key` remounts the dialog if a different ride is targeted, so the
  // focus trap and error state reset with it.
  return <CancelRideDialog key={ride.id} {...props} />
}

function MyRidesDashboard({ onFindRide, onOfferRide, onUnauthorized }) {
  const [rides, setRides] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [activeTab, setActiveTab] = useState('driving')
  const [expandedRideId, setExpandedRideId] = useState(null)
  const [menuRideId, setMenuRideId] = useState(null)
  const [rideToCancel, setRideToCancel] = useState(null)
  const [cancelError, setCancelError] = useState('')
  const cancelTriggerRef = useRef(null)
  const [toast, setToast] = useState(null)
  // Ref is the source of truth for the in-flight guard so two clicks in the
  // same tick can't both get past it; the state mirror only drives `disabled`.
  const pendingRef = useRef(new Set())
  const [pendingKeys, setPendingKeys] = useState([])

  const showToast = (message, tone = 'success') => setToast({ message, tone })
  const isRequestPending = (rideId, requestId) =>
    pendingKeys.includes(`request:${rideId}:${requestId}`)

  const runExclusive = async (key, action) => {
    if (pendingRef.current.has(key)) return
    pendingRef.current.add(key)
    setPendingKeys([...pendingRef.current])
    try {
      await action()
    } finally {
      pendingRef.current.delete(key)
      setPendingKeys([...pendingRef.current])
    }
  }

  // Held in a ref so a new callback identity from the parent doesn't retrigger
  // the fetch on every re-render.
  const onUnauthorizedRef = useRef(onUnauthorized)
  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized
  }, [onUnauthorized])

  useEffect(() => {
    let ignore = false

    fetchMyRides()
      .then((payload) => {
        if (ignore) return
        const loaded = normaliseMyRides(payload)
        setRides(loaded)
        setExpandedRideId(loaded.find((ride) => !isPastRide(ride))?.id ?? null)
        setLoadState('loaded')
      })
      .catch((error) => {
        if (ignore) return
        if (error?.status === 401) {
          onUnauthorizedRef.current?.()
          return
        }
        setLoadError(error?.message || 'Unable to load your rides')
        setLoadState('error')
      })

    return () => {
      ignore = true
    }
  }, [reloadToken])

  const retryLoad = () => {
    setLoadState('loading')
    setLoadError('')
    setReloadToken((token) => token + 1)
  }

  const upcomingRides = rides.filter((ride) => !isPastRide(ride))
  const pastRides = rides.filter(isPastRide)
  const pendingRequestCount = upcomingRides.filter(
    (ride) => ride.pendingRequests.length > 0,
  ).length

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!menuRideId) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuRideId(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuRideId])

  // Throws on failure; callers decide how to surface it (toast vs. inline).
  const applyStatusChange = async (rideId, targetStatus) => {
    const updatedData = await updateRideStatus(rideId, targetStatus)
    setRides((currentRides) =>
      currentRides.map((ride) =>
        ride.id === rideId
          ? {
              ...ride,
              status: (updatedData?.status || targetStatus).toLowerCase(),
              seatsAvailable:
                typeof updatedData?.availableSeats === 'number'
                  ? updatedData.availableSeats
                  : ride.seatsAvailable,
            }
          : ride,
      ),
    )
  }

  const handleStatusChange = (rideId, newStatus) =>
    runExclusive(`ride:${rideId}`, async () => {
      const targetStatus = newStatus.toUpperCase()
      try {
        await applyStatusChange(rideId, targetStatus)
        if (targetStatus === 'CANCELLED') {
          showToast('Ride has been cancelled.')
        } else if (targetStatus === 'FULL') {
          showToast('Ride marked as full.')
        } else if (targetStatus === 'OPEN') {
          showToast('Ride reopened for bookings.')
        }
      } catch (error) {
        if (error?.status === 401) {
          onUnauthorized?.()
        } else {
          showToast(error?.message || 'Failed to update ride status.', 'error')
        }
      }
    })

  const acceptRequest = (rideId, requestId) =>
    runExclusive(`request:${rideId}:${requestId}`, async () => {
      const ride = rides.find((item) => item.id === rideId)
      const request = ride?.pendingRequests.find(
        (item) => item.id === requestId,
      )
      if (!request || ride.seatsAvailable === 0) return

      try {
        const accepted = await acceptPassengerRequest(rideId, requestId)
        // Prefer the server's seat count; fall back to a local decrement for
        // backends that return only the request object.
        const serverSeats =
          typeof accepted?.availableSeats === 'number'
            ? accepted.availableSeats
            : null
        setRides((currentRides) =>
          currentRides.map((item) => {
            if (item.id !== rideId) return item
            const seatsAvailable = serverSeats ?? item.seatsAvailable - 1
            return {
              ...item,
              seatsAvailable,
              status: seatsAvailable === 0 ? 'full' : item.status,
              pendingRequests: item.pendingRequests.filter(
                (pending) => pending.id !== requestId,
              ),
              confirmedPassengers: [
                ...item.confirmedPassengers,
                { ...request, id: `passenger-${request.id}` },
              ],
            }
          }),
        )
        showToast(`${request.name} has been added to your ride.`)
      } catch (error) {
        if (error?.status === 401) {
          onUnauthorized?.()
        } else {
          showToast(
            error?.message || 'Failed to accept passenger request.',
            'error',
          )
        }
      }
    })

  const declineRequest = (rideId, requestId) =>
    runExclusive(`request:${rideId}:${requestId}`, async () => {
      const ride = rides.find((item) => item.id === rideId)
      const request = ride?.pendingRequests.find(
        (item) => item.id === requestId,
      )

      try {
        await declinePassengerRequest(rideId, requestId)
        setRides((currentRides) =>
          currentRides.map((r) =>
            r.id === rideId
              ? {
                  ...r,
                  pendingRequests: r.pendingRequests.filter(
                    (req) => req.id !== requestId,
                  ),
                }
              : r,
          ),
        )
        if (request) {
          showToast(`Declined request from ${request.name}.`)
        }
      } catch (error) {
        if (error?.status === 401) {
          onUnauthorized?.()
        } else {
          showToast(
            error?.message || 'Failed to decline passenger request.',
            'error',
          )
        }
      }
    })

  const confirmCancel = () => {
    if (!rideToCancel) return undefined
    const ride = rideToCancel
    return runExclusive(`ride:${ride.id}`, async () => {
      setCancelError('')
      try {
        await applyStatusChange(ride.id, 'CANCELLED')
        setRideToCancel(null)
        setMenuRideId(null)
        showToast('Ride has been cancelled.')
      } catch (error) {
        if (error?.status === 401) {
          // The app is navigating to login, so there is no modal to return to.
          setRideToCancel(null)
          onUnauthorized?.()
        } else {
          setCancelError(error?.message || 'Failed to cancel this ride.')
        }
      }
    })
  }

  return (
    <main className="my-rides-page" onClick={() => setMenuRideId(null)}>
      <header className="my-rides-header">
        <a
          className="my-rides-brand"
          href="#my-rides"
          onClick={(event) => event.preventDefault()}
        >
          <i className="fa-solid fa-car-side" aria-hidden="true" />
          <span>RideConnect</span>
        </a>
        <nav className="my-rides-nav" aria-label="Main navigation">
          <button
            type="button"
            className="my-rides-nav-link"
            onClick={onFindRide}
          >
            Find a Ride
          </button>
          <button type="button" className="my-rides-nav-link active">
            My Rides
          </button>
        </nav>
        <div className="my-rides-header-actions">
          <button
            type="button"
            className="my-rides-offer-link"
            onClick={onOfferRide}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" /> Offer a Ride
          </button>
          <button
            type="button"
            className="my-rides-icon-button"
            aria-label="Notifications"
          >
            <i className="fa-regular fa-bell" aria-hidden="true" />
            <span className="my-rides-unread-dot" />
          </button>
          <Avatar initials="YO" />
        </div>
      </header>
      <section className="my-rides-content">
        <div className="my-rides-title-row">
          <div>
            <p className="my-rides-eyebrow">YOUR JOURNEY</p>
            <h1>My rides</h1>
            <p className="my-rides-subtitle">
              Manage rides you&apos;re driving and rides you&apos;ve joined.
            </p>
          </div>
        </div>
        <div
          className="my-rides-tabs"
          role="tablist"
          aria-label="My rides views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'driving'}
            className={activeTab === 'driving' ? 'active' : ''}
            onClick={() => setActiveTab('driving')}
          >
            Rides I&apos;m driving{' '}
            <span className="my-rides-count-badge">{pendingRequestCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'joined'}
            className={activeTab === 'joined' ? 'active' : ''}
            onClick={() => setActiveTab('joined')}
          >
            Rides I&apos;ve joined
          </button>
        </div>
        {activeTab === 'joined' ? (
          <div className="my-rides-placeholder">
            <i className="fa-solid fa-route" aria-hidden="true" />
            <h2>Coming soon</h2>
            <p>Your joined rides will appear here.</p>
          </div>
        ) : loadState === 'loading' ? (
          <div className="my-rides-loading" role="status">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
            <p>Loading your rides...</p>
          </div>
        ) : loadState === 'error' ? (
          <div className="my-rides-empty-state" role="alert">
            <div className="my-rides-empty-icon">
              <i
                className="fa-solid fa-triangle-exclamation"
                aria-hidden="true"
              />
            </div>
            <h2>We couldn&apos;t load your rides.</h2>
            <p>{loadError}</p>
            <button
              type="button"
              className="my-rides-primary-button"
              onClick={retryLoad}
            >
              Try again
            </button>
          </div>
        ) : upcomingRides.length === 0 ? (
          <div className="my-rides-empty-state">
            <div className="my-rides-empty-icon">
              <i className="fa-solid fa-car-side" aria-hidden="true" />
            </div>
            <h2>You haven&apos;t offered any rides yet.</h2>
            <p>
              Post a ride and colleagues nearby will be able to request a seat.
            </p>
            <button
              type="button"
              className="my-rides-primary-button"
              onClick={onOfferRide}
            >
              <i className="fa-solid fa-plus" aria-hidden="true" /> Offer a Ride
            </button>
          </div>
        ) : (
          <>
            <h2 className="my-rides-section-label">Upcoming</h2>
            <div className="my-rides-list">
              {upcomingRides.map((ride) => (
                <RideRow
                  key={ride.id}
                  ride={ride}
                  isExpanded={expandedRideId === ride.id}
                  onToggle={() =>
                    setExpandedRideId(
                      expandedRideId === ride.id ? null : ride.id,
                    )
                  }
                  isMenuOpen={menuRideId === ride.id}
                  onMenu={() =>
                    setMenuRideId(menuRideId === ride.id ? null : ride.id)
                  }
                  onAccept={acceptRequest}
                  onDecline={declineRequest}
                  isRequestPending={isRequestPending}
                  onStatusChange={(status) => {
                    setMenuRideId(null)
                    handleStatusChange(ride.id, status)
                  }}
                  onRequestCancel={(trigger) => {
                    cancelTriggerRef.current = trigger
                    setMenuRideId(null)
                    setCancelError('')
                    setRideToCancel(ride)
                  }}
                />
              ))}
            </div>
          </>
        )}
        {activeTab === 'driving' &&
          loadState === 'loaded' &&
          pastRides.length > 0 && (
            <section className="my-rides-past-section">
              <button
                type="button"
                className="my-rides-past-toggle"
                onClick={() =>
                  setExpandedRideId(expandedRideId === 'past' ? null : 'past')
                }
              >
                <i
                  className={`fa-solid fa-chevron-${expandedRideId === 'past' ? 'down' : 'right'}`}
                  aria-hidden="true"
                />{' '}
                Past &amp; cancelled ({pastRides.length})
              </button>
              {expandedRideId === 'past' && (
                <div className="my-rides-past-list">
                  {pastRides.map((ride) => (
                    <div className="my-rides-past-row" key={ride.id}>
                      <div>
                        <strong>
                          {ride.origin}{' '}
                          <i
                            className="fa-solid fa-arrow-right-long"
                            aria-hidden="true"
                          />{' '}
                          {ride.destination}
                        </strong>
                        <span>
                          <i
                            className="fa-regular fa-calendar"
                            aria-hidden="true"
                          />{' '}
                          {formatDate(ride.date)} · {formatTime(ride.time)}
                        </span>
                      </div>
                      <StatusBadge status={getRideStatus(ride)} />
                    </div>
                  ))}
                  <p className="my-rides-past-note">
                    No actions available on past or cancelled rides.
                  </p>
                </div>
              )}
            </section>
          )}
      </section>
      <>
        {toast && (
          <div
            className={`my-rides-toast my-rides-toast-${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            <i
              className={
                toast.tone === 'error'
                  ? 'fa-solid fa-circle-exclamation'
                  : 'fa-solid fa-circle-check'
              }
              aria-hidden="true"
            />{' '}
            {toast.message}
          </div>
        )}
        <CancelRideModal
          ride={rideToCancel}
          error={cancelError}
          returnFocusTo={cancelTriggerRef}
          isPending={
            rideToCancel
              ? pendingKeys.includes(`ride:${rideToCancel.id}`)
              : false
          }
          onKeep={() => {
            setCancelError('')
            setRideToCancel(null)
          }}
          onConfirm={confirmCancel}
        />
      </>
    </main>
  )
}

export default MyRidesDashboard
