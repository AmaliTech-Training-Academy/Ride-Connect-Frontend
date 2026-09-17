import { useEffect, useState } from 'react'
import { initialDrivingRides } from './myRidesMockData'
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
function getRideStatus(ride) {
  if (ride.status === 'cancelled') return 'cancelled'
  if (hasDeparted(ride)) return 'departed'
  if (ride.seatsAvailable === 0) return 'full'
  return 'open'
}

function Avatar({ initials }) {
  return <span className="my-rides-avatar">{initials}</span>
}
function StatusBadge({ status }) {
  return (
    <span className={`my-rides-status my-rides-status-${status}`}>
      {status}
    </span>
  )
}

function JoinRequestRow({ request, isFull, onAccept, onDecline }) {
  return (
    <div
      className={`my-rides-person-row ${isFull ? 'my-rides-person-row-warning' : ''}`}
    >
      <Avatar initials={request.initials} />
      <div className="my-rides-person-info">
        <strong>{request.name}</strong>
        <span>Requested {request.requestedMinutesAgo} min ago</span>
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
          disabled={isFull}
          onClick={onAccept}
        >
          Accept
        </button>
        <button type="button" className="my-rides-decline" onClick={onDecline}>
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

function RideRow({ ride, isExpanded, onToggle, onMenu, onAccept, onDecline }) {
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
          type="button"
          className="my-rides-menu-button"
          aria-label={`Options for ${ride.origin} to ${ride.destination}`}
          onClick={onMenu}
        >
          <i className="fa-solid fa-ellipsis-vertical" aria-hidden="true" />
        </button>
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

function CancelRideModal({ ride, onKeep, onConfirm }) {
  if (!ride) return null
  return (
    <div className="my-rides-modal-backdrop">
      <div
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
        <div className="my-rides-modal-actions">
          <button
            type="button"
            className="my-rides-ghost-button"
            onClick={onKeep}
          >
            Keep ride
          </button>
          <button
            type="button"
            className="my-rides-danger-button"
            onClick={onConfirm}
          >
            Cancel ride
          </button>
        </div>
      </div>
    </div>
  )
}

function MyRidesDashboard({ onFindRide, onOfferRide }) {
  const [rides, setRides] = useState(initialDrivingRides)
  const [activeTab, setActiveTab] = useState('driving')
  const [expandedRideId, setExpandedRideId] = useState('driving-1')
  const [menuRideId, setMenuRideId] = useState(null)
  const [rideToCancel, setRideToCancel] = useState(null)
  const [toast, setToast] = useState(null)
  const upcomingRides = rides.filter(
    (ride) => ride.status !== 'cancelled' && !hasDeparted(ride),
  )
  const pastRides = rides.filter(
    (ride) => ride.status === 'cancelled' || hasDeparted(ride),
  )
  const pendingRequestCount = upcomingRides.filter(
    (ride) => ride.pendingRequests.length > 0,
  ).length

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const acceptRequest = (rideId, requestId) => {
    // TODO: replace mock mutation with RID-4 accept endpoint.
    const ride = rides.find((item) => item.id === rideId)
    const request = ride?.pendingRequests.find((item) => item.id === requestId)
    if (!request || ride.seatsAvailable === 0) return
    setRides((currentRides) =>
      currentRides.map((item) =>
        item.id !== rideId
          ? item
          : {
              ...item,
              seatsAvailable: item.seatsAvailable - 1,
              status: item.seatsAvailable - 1 === 0 ? 'full' : item.status,
              pendingRequests: item.pendingRequests.filter(
                (pending) => pending.id !== requestId,
              ),
              confirmedPassengers: [
                ...item.confirmedPassengers,
                { ...request, id: `passenger-${request.id}` },
              ],
            },
      ),
    )
    setToast(`${request.name} has been added to your ride.`)
  }

  const declineRequest = (rideId, requestId) => {
    // TODO: replace mock mutation with RID-4 decline endpoint.
    setRides((currentRides) =>
      currentRides.map((ride) =>
        ride.id === rideId
          ? {
              ...ride,
              pendingRequests: ride.pendingRequests.filter(
                (request) => request.id !== requestId,
              ),
            }
          : ride,
      ),
    )
  }

  const confirmCancel = () => {
    // TODO: replace mock mutation with RID-4 cancel endpoint.
    setRides((currentRides) =>
      currentRides.map((ride) =>
        ride.id === rideToCancel?.id ? { ...ride, status: 'cancelled' } : ride,
      ),
    )
    setRideToCancel(null)
    setMenuRideId(null)
  }

  return (
    <main
      className="my-rides-page"
      onClick={() => menuRideId && setMenuRideId(null)}
    >
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
                  onMenu={() =>
                    setMenuRideId(menuRideId === ride.id ? null : ride.id)
                  }
                  onAccept={acceptRequest}
                  onDecline={declineRequest}
                />
              ))}
            </div>
            {menuRideId && (
              <div
                className="my-rides-context-menu"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setRideToCancel(
                      rides.find((ride) => ride.id === menuRideId),
                    )
                    setMenuRideId(null)
                  }}
                >
                  Cancel ride
                </button>
              </div>
            )}
          </>
        )}
        {activeTab === 'driving' && pastRides.length > 0 && (
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
          <div className="my-rides-toast" role="status">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />{' '}
            {toast}
          </div>
        )}
        <CancelRideModal
          ride={rideToCancel}
          onKeep={() => setRideToCancel(null)}
          onConfirm={confirmCancel}
        />
      </>
    </main>
  )
}

export default MyRidesDashboard
