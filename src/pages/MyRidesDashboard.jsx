import { useEffect, useRef, useState } from 'react'
import {
  acceptPassengerRequest,
  declinePassengerRequest,
  fetchMyRides,
  updateRideStatus,
} from '../services/rides'
import { normaliseMyJoinedRides, normaliseMyRides } from '../lib/myRides'
import UserMenu from '../components/UserMenu/UserMenu'
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
          onClick={(event) => onDecline(event.currentTarget)}
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

function RideMenu({ ride, isBusy, onStatusChange, onRequestCancel }) {
  const isRideFull = getRideStatus(ride) === 'full'

  return (
    <div
      className="my-rides-context-menu"
      onClick={(event) => event.stopPropagation()}
    >
      {isRideFull && ride.seatsAvailable > 0 && (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onStatusChange('OPEN')}
        >
          Reopen ride
        </button>
      )}
      {!isRideFull && ride.status !== 'cancelled' && (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onStatusChange('FULL')}
        >
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
  isBusy,
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
            isBusy={isBusy}
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
                  isPending={isBusy}
                  onAccept={() => onAccept(ride.id, request.id)}
                  onDecline={(trigger) =>
                    onDecline(ride.id, request.id, trigger)
                  }
                />
              ))}
            </section>
          )}
          {ride.pendingRequests.length === 0 &&
            ride.confirmedPassengers.length === 0 && (
              <p className="my-rides-detail-empty">
                No join requests yet. Colleagues who ask for a seat will show up
                here.
              </p>
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

function JoinedRideRow({ ride, onWithdraw }) {
  const status = String(ride.requestStatus ?? '').toUpperCase()
  const isDeclined = status === 'DECLINED'
  // Withdrawing applies to a request still standing, not one already refused.
  const canWithdraw = status === 'PENDING' || status === 'ACCEPTED'

  return (
    <div
      className={`my-rides-joined-row ${isDeclined ? 'my-rides-joined-row-declined' : ''}`}
    >
      <div className="my-rides-joined-info">
        <strong>
          {ride.origin}{' '}
          <i className="fa-solid fa-arrow-right-long" aria-hidden="true" />{' '}
          {ride.destination}
        </strong>
        <span>
          <i className="fa-regular fa-calendar" aria-hidden="true" />{' '}
          {formatDate(ride.date)} · {formatTime(ride.time)}
        </span>
        <span className="my-rides-joined-driver">
          Driver: {ride.driverName}
        </span>
        {isDeclined && (
          <p className="my-rides-decline-note">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />{' '}
            {ride.rejectionReason ? (
              <>
                <span className="my-rides-decline-note-label">
                  {ride.driverName} said:
                </span>{' '}
                {ride.rejectionReason}
              </>
            ) : (
              'The driver did not give a reason.'
            )}
          </p>
        )}
      </div>
      <div className="my-rides-joined-actions">
        <StatusBadge status={status.toLowerCase()} />
        {canWithdraw && (
          <button
            type="button"
            className="my-rides-withdraw-button"
            onClick={() => onWithdraw(ride)}
          >
            Withdraw request
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Rendered only while a ride is pending cancellation, so the focus-trap effect
 * runs on open and tears down on close. aria-modal is only honest if focus
 * actually stays inside, hence the Tab wrap and the focus restore.
 */
// Matches the backend rule: 1-500 characters after trimming.
const DECLINE_REASON_MAX_LENGTH = 500

/**
 * Declining runs in two steps: confirm, then give a reason. The reason is
 * optional, so the driver can decline without explaining, but the step exists
 * because a passenger who is turned down deserves a chance at an explanation.
 *
 * Mounted only while a request is targeted, so the focus trap sets up and tears
 * down with it.
 */
function DeclineRequestDialog({
  request,
  error,
  isPending,
  returnFocusTo,
  onClose,
  onConfirm,
}) {
  const [step, setStep] = useState('confirm')
  const [reason, setReason] = useState('')
  const dialogRef = useRef(null)
  const initialFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previouslyFocused = returnFocusTo?.current ?? document.activeElement
    initialFocusRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled])',
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

  // Moving to the reason step should land the caret in the box.
  useEffect(() => {
    if (step === 'reason') initialFocusRef.current?.focus()
  }, [step])

  return (
    <div className="my-rides-modal-backdrop">
      <div
        ref={dialogRef}
        className="my-rides-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="decline-request-title"
      >
        <div className="my-rides-modal-icon my-rides-modal-icon-warning">
          <i className="fa-solid fa-user-xmark" aria-hidden="true" />
        </div>

        {step === 'confirm' ? (
          <>
            <h2 id="decline-request-title">
              Decline {request.name}&apos;s request?
            </h2>
            <p>
              They will be told their request was turned down, and the seat
              stays available for someone else.
            </p>
            {error && (
              <p className="my-rides-modal-error" role="alert">
                <i
                  className="fa-solid fa-circle-exclamation"
                  aria-hidden="true"
                />{' '}
                {error}
              </p>
            )}
            <div className="my-rides-modal-actions">
              <button
                ref={initialFocusRef}
                type="button"
                className="my-rides-ghost-button"
                onClick={onClose}
              >
                Keep request
              </button>
              <button
                type="button"
                className="my-rides-danger-button"
                onClick={() => setStep('reason')}
              >
                Yes, decline
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="decline-request-title">Why are you declining?</h2>
            <p>
              This is optional, and {request.name} will see whatever you write.
            </p>
            <label className="my-rides-reason-label" htmlFor="decline-reason">
              Reason
            </label>
            <textarea
              ref={initialFocusRef}
              id="decline-reason"
              className="my-rides-reason-input"
              rows={3}
              maxLength={DECLINE_REASON_MAX_LENGTH}
              value={reason}
              placeholder="The car is full, or the route has changed..."
              onChange={(event) => setReason(event.target.value)}
            />
            <p className="my-rides-reason-count">
              {reason.length}/{DECLINE_REASON_MAX_LENGTH}
            </p>
            {error && (
              <p className="my-rides-modal-error" role="alert">
                <i
                  className="fa-solid fa-circle-exclamation"
                  aria-hidden="true"
                />{' '}
                {error}
              </p>
            )}
            <div className="my-rides-modal-actions">
              <button
                type="button"
                className="my-rides-ghost-button"
                disabled={isPending}
                onClick={() => setStep('confirm')}
              >
                Back
              </button>
              <button
                type="button"
                className="my-rides-danger-button"
                disabled={isPending || !reason.trim()}
                onClick={() => onConfirm(reason)}
              >
                {error ? 'Try again' : 'Decline request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DeclineRequestModal({ request, ...props }) {
  if (!request) return null
  return <DeclineRequestDialog key={request.id} request={request} {...props} />
}

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

function MyRidesDashboard({
  onFindRide,
  onOfferRide,
  managedRideId,
  onLogout,
  userInitials,
}) {
  const [rides, setRides] = useState([])
  const [joinedRides, setJoinedRides] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [activeTab, setActiveTab] = useState('driving')
  const [expandedRideId, setExpandedRideId] = useState(null)
  const [menuRideId, setMenuRideId] = useState(null)
  const [rideToCancel, setRideToCancel] = useState(null)
  const [cancelError, setCancelError] = useState('')
  const [requestToDecline, setRequestToDecline] = useState(null)
  const [declineError, setDeclineError] = useState('')
  const declineTriggerRef = useRef(null)
  const cancelTriggerRef = useRef(null)
  const [toast, setToast] = useState(null)
  // Ref is the source of truth for the in-flight guard so two clicks in the
  // same tick can't both get past it; the state mirror only drives `disabled`.
  const pendingRef = useRef(new Set())
  const [pendingKeys, setPendingKeys] = useState([])

  const showToast = (message, tone = 'success') => setToast({ message, tone })

  /**
   * Accepting a request, declining one and changing a ride's status all write
   * to the same seat count, so they are serialised per ride rather than per
   * request. Two accepts on one ride could otherwise resolve out of order and
   * leave the seat count stale.
   */
  const isRideBusy = (rideId) => pendingKeys.includes(`ride:${rideId}`)

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

  useEffect(() => {
    let ignore = false

    fetchMyRides()
      .then((payload) => {
        if (ignore) return
        const loaded = normaliseMyRides(payload)
        setRides(loaded)
        // A "Manage" click from Find a Ride asks for one ride's requests
        // directly; otherwise fall back to the first upcoming ride.
        const preferredId =
          managedRideId && loaded.some((ride) => ride.id === managedRideId)
            ? managedRideId
            : (loaded.find((ride) => !isPastRide(ride))?.id ?? null)
        setExpandedRideId(preferredId)
        setJoinedRides(normaliseMyJoinedRides(payload))
        setLoadState('loaded')
      })
      .catch((error) => {
        if (ignore) return
        setLoadError(error?.message || 'Unable to load your rides')
        setLoadState('error')
      })

    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken])

  const retryLoad = () => {
    setLoadState('loading')
    setLoadError('')
    setReloadToken((token) => token + 1)
  }

  const upcomingRides = rides.filter((ride) => !isPastRide(ride))
  const pastRides = rides.filter(isPastRide)
  const pendingRequestCount = upcomingRides.reduce(
    (total, ride) => total + ride.pendingRequests.length,
    0,
  )
  const pendingJoinedRides = joinedRides.filter(
    (ride) => ride.requestStatus === 'PENDING',
  )
  const approvedJoinedRides = joinedRides.filter(
    (ride) => ride.requestStatus === 'ACCEPTED',
  )
  // Without this the passenger's request simply disappears when refused.
  const declinedJoinedRides = joinedRides.filter(
    (ride) => ride.requestStatus === 'DECLINED',
  )

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
        showToast(error?.message || 'Failed to update ride status.', 'error')
      }
    })

  const acceptRequest = (rideId, requestId) =>
    runExclusive(`ride:${rideId}`, async () => {
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
        showToast(
          error?.message || 'Failed to accept passenger request.',
          'error',
        )
      }
    })

  const openDeclineDialog = (rideId, requestId, trigger) => {
    const ride = rides.find((item) => item.id === rideId)
    const request = ride?.pendingRequests.find((item) => item.id === requestId)
    if (!request) return

    declineTriggerRef.current = trigger ?? null
    setDeclineError('')
    setRequestToDecline({ ...request, rideId })
  }

  const confirmDecline = (reason) => {
    if (!requestToDecline) return undefined
    const { rideId, id: requestId, name } = requestToDecline

    return runExclusive(`ride:${rideId}`, async () => {
      setDeclineError('')
      try {
        await declinePassengerRequest(rideId, requestId, reason)
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
        setRequestToDecline(null)
        showToast(`Declined request from ${name}.`)
      } catch (error) {
        // Keep the dialog open so the reason is not lost on a retry.
        setDeclineError(
          error?.message || 'Failed to decline passenger request.',
        )
      }
    })
  }

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
        setCancelError(error?.message || 'Failed to cancel this ride.')
      }
    })
  }

  const handleWithdraw = () => {
    // TODO: wire up once the backend exposes a withdraw-request endpoint.
    showToast("Withdrawing a request isn't available yet.", 'error')
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
          <div className="my-rides-profile-group">
            <button
              type="button"
              className="my-rides-icon-button"
              aria-label="Notifications"
            >
              <i className="fa-regular fa-bell" aria-hidden="true" />
              <span className="my-rides-unread-dot" />
            </button>
            <UserMenu initials={userInitials || '?'} onLogout={onLogout} />
          </div>
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
            {pendingRequestCount > 0 && (
              <span className="my-rides-count-badge">
                {pendingRequestCount}
              </span>
            )}
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
          loadState === 'loading' ? (
            <div className="my-rides-loading" role="status">
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
              <p>Loading your joined rides...</p>
            </div>
          ) : loadState === 'error' ? (
            <div className="my-rides-empty-state" role="alert">
              <div className="my-rides-empty-icon">
                <i
                  className="fa-solid fa-triangle-exclamation"
                  aria-hidden="true"
                />
              </div>
              <h2>Couldn&apos;t load your joined rides</h2>
              <p>{loadError}</p>
              <button
                type="button"
                className="my-rides-primary-button"
                onClick={retryLoad}
              >
                Try again
              </button>
            </div>
          ) : joinedRides.length === 0 ? (
            <div className="my-rides-empty-state">
              <div className="my-rides-empty-icon">
                <i className="fa-solid fa-route" aria-hidden="true" />
              </div>
              <h2>You haven&apos;t requested any rides yet.</h2>
              <p>Find a ride and request a seat to see it here.</p>
              <button
                type="button"
                className="my-rides-primary-button"
                onClick={onFindRide}
              >
                <i
                  className="fa-solid fa-magnifying-glass"
                  aria-hidden="true"
                />{' '}
                Find a Ride
              </button>
            </div>
          ) : (
            <>
              {pendingJoinedRides.length > 0 && (
                <>
                  <h2 className="my-rides-section-label">Pending</h2>
                  <div className="my-rides-joined-list">
                    {pendingJoinedRides.map((ride) => (
                      <JoinedRideRow
                        key={ride.requestId}
                        ride={ride}
                        onWithdraw={handleWithdraw}
                      />
                    ))}
                  </div>
                </>
              )}
              {approvedJoinedRides.length > 0 && (
                <>
                  <h2 className="my-rides-section-label">Approved</h2>
                  <div className="my-rides-joined-list">
                    {approvedJoinedRides.map((ride) => (
                      <JoinedRideRow
                        key={ride.requestId}
                        ride={ride}
                        onWithdraw={handleWithdraw}
                      />
                    ))}
                  </div>
                </>
              )}
              {declinedJoinedRides.length > 0 && (
                <>
                  <h2 className="my-rides-section-label">Declined</h2>
                  <div className="my-rides-joined-list">
                    {declinedJoinedRides.map((ride) => (
                      <JoinedRideRow
                        key={ride.requestId}
                        ride={ride}
                        onWithdraw={handleWithdraw}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )
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
                  onDecline={openDeclineDialog}
                  isBusy={isRideBusy(ride.id)}
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
        <DeclineRequestModal
          request={requestToDecline}
          error={declineError}
          isPending={
            requestToDecline
              ? pendingKeys.includes(`ride:${requestToDecline.rideId}`)
              : false
          }
          returnFocusTo={declineTriggerRef}
          onClose={() => {
            setDeclineError('')
            setRequestToDecline(null)
          }}
          onConfirm={confirmDecline}
        />
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
