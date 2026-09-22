import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { fetchMyRides, requestToJoinRide } from '../services/rides'
import './FindARide.css'

function toISODate(date) {
  return date.toISOString().slice(0, 10)
}

function getDateOffset(days) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

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

function normaliseRide(ride, currentUserId) {
  const departure = new Date(ride.departureAt)
  const date = `${departure.getFullYear()}-${String(departure.getMonth() + 1).padStart(2, '0')}-${String(departure.getDate()).padStart(2, '0')}`
  const time = `${String(departure.getHours()).padStart(2, '0')}:${String(departure.getMinutes()).padStart(2, '0')}`
  const driverInitials = ride.driverName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const rideDriverId = ride.driverId

  return {
    ...ride,
    description: ride.routeDescription || '',
    date,
    time,
    seatsTotal: ride.totalSeats,
    seatsAvailable: ride.availableSeats,
    driverInitials,
    isOwnRide:
      currentUserId != null &&
      String(rideDriverId).trim() === String(currentUserId).trim(),
  }
}

function getActiveDateLabel(date) {
  if (date === getDateOffset(0)) return 'Today'
  if (date === getDateOffset(1)) return 'Tomorrow'
  return formatDate(date)
}

function Avatar({ initials }) {
  return <span className="find-ride-avatar">{initials}</span>
}

function RideCard({ ride, onRequest, isHighlighted, requestState }) {
  const isLowSeat = ride.seatsAvailable === 1
  const isRequested = requestState === 'requested'
  const isSending = requestState === 'sending'
  const cardClassName = [
    'find-ride-card',
    isLowSeat ? 'find-ride-card-low-seat' : '',
    ride.isOwnRide ? 'find-ride-card-own' : '',
    isHighlighted ? 'find-ride-card-highlighted' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={cardClassName}>
      <div className="find-ride-card-header">
        <div className="find-ride-driver">
          <Avatar initials={ride.driverInitials} />
          <div>
            <strong>{ride.driverName}</strong>
            <span
              className={`find-ride-status ${ride.isOwnRide ? 'find-ride-status-own' : ''}`}
            >
              {ride.isOwnRide ? 'Your ride' : 'Open'}
            </span>
          </div>
        </div>
      </div>

      <div className="find-ride-route">
        <span>{ride.origin}</span>
        <i className="fa-solid fa-arrow-right-long" aria-hidden="true" />
        <span>{ride.destination}</span>
      </div>

      {ride.description && (
        <p className="find-ride-description">{ride.description}</p>
      )}

      <div className="find-ride-meta">
        <span>
          <i className="fa-regular fa-calendar" aria-hidden="true" />
          {formatDate(ride.date)}
        </span>
        <span>
          <i className="fa-regular fa-clock" aria-hidden="true" />
          {formatTime(ride.time)}
        </span>
      </div>

      <div
        className={`find-ride-seats ${isLowSeat ? 'find-ride-seats-warning' : ''}`}
      >
        {isLowSeat && (
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        )}
        {isLowSeat
          ? '1 seat left'
          : `${ride.seatsAvailable} of ${ride.seatsTotal} seats left`}
      </div>

      <div className="find-ride-card-action">
        {ride.isOwnRide ? (
          <button
            type="button"
            className="find-ride-button find-ride-button-outline"
          >
            Manage
          </button>
        ) : (
          <button
            type="button"
            className={`find-ride-button ${isRequested ? 'find-ride-button-requested' : ''}`}
            disabled={isRequested || isSending}
            onClick={() => onRequest(ride)}
          >
            {isRequested ? (
              <>
                <i className="fa-solid fa-check" aria-hidden="true" /> Requested
              </>
            ) : isSending ? (
              'Sending...'
            ) : (
              'Request to Join'
            )}
          </button>
        )}
      </div>
    </article>
  )
}

function LoadingCard() {
  return (
    <div className="find-ride-skeleton" aria-hidden="true">
      <div className="skeleton-driver">
        <span className="skeleton-circle" />
        <span className="skeleton-short" />
      </div>
      <span className="skeleton-route" />
      <span className="skeleton-line" />
      <span className="skeleton-line skeleton-line-short" />
      <span className="skeleton-action" />
    </div>
  )
}

function FilterChip({ children, onRemove }) {
  return (
    <button type="button" className="find-ride-filter-chip" onClick={onRemove}>
      {children} <span aria-hidden="true">×</span>
    </button>
  )
}

function EmptyState({ hasFilters, emptyMessage, onClear, onOfferRide }) {
  return (
    <div className="find-ride-empty-state">
      <div className="find-ride-empty-icon">
        <i
          className={`fa-solid ${hasFilters ? 'fa-magnifying-glass' : 'fa-car-side'}`}
          aria-hidden="true"
        />
      </div>
      <h2>
        {emptyMessage ||
          (hasFilters ? 'No rides found for this date' : 'No rides posted yet')}
      </h2>
      <p>
        {hasFilters
          ? 'Try a different date or route, or offer a ride yourself.'
          : 'Be the first colleague to offer a ride to the office.'}
      </p>
      <div className="find-ride-empty-actions">
        {hasFilters && (
          <button
            type="button"
            className="find-ride-button find-ride-button-outline"
            onClick={onClear}
          >
            Clear filters
          </button>
        )}
        <button
          type="button"
          className="find-ride-button"
          onClick={onOfferRide}
        >
          <i className="fa-solid fa-plus" aria-hidden="true" /> Offer a Ride
        </button>
      </div>
    </div>
  )
}

function getEmptyMessage(message, hasFilters) {
  if (message?.toLowerCase().includes('date'))
    return 'No rides found for this date'
  if (message?.toLowerCase().includes('route'))
    return 'No rides found for this route'
  if (message) return 'No rides found'
  return hasFilters ? 'No rides found for this date' : undefined
}

async function readResponseBody(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function FindARide({
  onOfferRide,
  onMyRides,
  onUnauthorized,
  currentUserId,
  highlightedRideId,
}) {
  const [rides, setRides] = useState([])
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [emptyMessage, setEmptyMessage] = useState('')
  const [toast, setToast] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)
  // rideId -> 'sending' | 'requested'
  const [requestStates, setRequestStates] = useState({})

  const today = getDateOffset(0)
  const tomorrow = getDateOffset(1)
  const hasFilters = Boolean(search.trim() || selectedDate)
  const filteredRides = rides

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (selectedDate) params.set('date', selectedDate)
    if (search.trim()) params.set('search', search.trim())

    apiFetch(`/api/rides?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await readResponseBody(response)
        if (!response.ok) {
          const message =
            body?.message || `Request failed with status ${response.status}`
          if (response.status === 401) onUnauthorized?.()
          throw new Error(message)
        }
        setRides(
          (body?.data || []).map((ride) => normaliseRide(ride, currentUserId)),
        )
        setEmptyMessage(body?.message || '')
        setLoadError('')
        setLoadState('loaded')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Unable to load rides:', error)
          setLoadError(error.message || 'Unable to load rides')
          setLoadState('error')
        }
      })

    return () => controller.abort()
  }, [search, selectedDate, currentUserId, onUnauthorized, reloadToken])

  useEffect(() => {
    let ignore = false

    // `GET /api/rides` carries no per-user request status, so the rides this
    // user has already asked to join are read from their own joined buckets.
    fetchMyRides()
      .then((payload) => {
        if (ignore) return
        const joined = [
          ...(payload?.data?.joined ?? []),
          ...(payload?.data?.joinedPastAndCancelled ?? []),
        ]
        if (joined.length === 0) return
        setRequestStates((current) => {
          const next = { ...current }
          joined.forEach((ride) => {
            if (ride?.id && !next[ride.id]) next[ride.id] = 'requested'
          })
          return next
        })
      })
      .catch(() => {
        // A failure here only costs the pre-marked state; the request itself
        // still reports a duplicate, so the screen stays usable.
      })

    return () => {
      ignore = true
    }
  }, [reloadToken])

  const startLoading = () => setLoadState('loading')

  const clearFilters = () => {
    startLoading()
    setSearch('')
    setSelectedDate('')
  }

  const retryLoad = () => {
    startLoading()
    setReloadToken((token) => token + 1)
  }

  const handleSearchChange = (event) => {
    startLoading()
    setSearch(event.target.value)
  }

  const handleDateChange = (event) => {
    startLoading()
    setSelectedDate(event.target.value)
  }

  const handleQuickDateChange = (date) => {
    startLoading()
    setSelectedDate(selectedDate === date ? '' : date)
  }

  const handleRequest = async (ride) => {
    if (requestStates[ride.id]) return

    setRequestStates((current) => ({ ...current, [ride.id]: 'sending' }))

    try {
      await requestToJoinRide(ride.id)
      setRequestStates((current) => ({ ...current, [ride.id]: 'requested' }))
      setToast({
        tone: 'success',
        message: `Request sent to ${ride.driverName}. The driver will be notified.`,
      })
    } catch (error) {
      if (error?.status === 401) {
        onUnauthorized?.()
        return
      }
      if (error?.status === 409) {
        // Already requested - reflect that rather than inviting a retry.
        setRequestStates((current) => ({ ...current, [ride.id]: 'requested' }))
        setToast({
          tone: 'error',
          message: error.message || 'You have already requested this ride.',
        })
        return
      }
      setRequestStates((current) => {
        const next = { ...current }
        delete next[ride.id]
        return next
      })
      setToast({
        tone: 'error',
        message: error?.message || 'Could not send your request.',
      })
    }
  }

  const renderResults = () => {
    if (loadState === 'loading') {
      return (
        <div className="find-ride-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <LoadingCard key={index} />
          ))}
        </div>
      )
    }

    if (loadState === 'error') {
      return (
        <div className="find-ride-error-state">
          <div className="find-ride-empty-icon find-ride-error-icon">
            <i
              className="fa-solid fa-triangle-exclamation"
              aria-hidden="true"
            />
          </div>
          <h2>Couldn&apos;t load rides</h2>
          <p>
            {loadError || 'Something went wrong on our end. Please try again.'}
          </p>
          <button
            type="button"
            className="find-ride-button"
            onClick={retryLoad}
          >
            Try again
          </button>
        </div>
      )
    }

    if (filteredRides.length === 0 && hasFilters) {
      return (
        <EmptyState
          hasFilters={hasFilters}
          emptyMessage={getEmptyMessage(emptyMessage, hasFilters)}
          onClear={clearFilters}
          onOfferRide={onOfferRide}
        />
      )
    }

    if (rides.length === 0) {
      return (
        <EmptyState
          hasFilters={false}
          emptyMessage={getEmptyMessage(emptyMessage, false)}
          onOfferRide={onOfferRide}
        />
      )
    }

    return (
      <div className="find-ride-grid">
        {rides.map((ride) => (
          <RideCard
            key={ride.id}
            ride={ride}
            onRequest={handleRequest}
            requestState={requestStates[ride.id]}
            isHighlighted={ride.id === highlightedRideId}
          />
        ))}
      </div>
    )
  }

  return (
    <main className="find-ride-page">
      <header className="find-ride-header">
        <a
          className="find-ride-brand"
          href="#find-ride"
          onClick={(event) => event.preventDefault()}
        >
          <i className="fa-solid fa-car-side" aria-hidden="true" />
          <span>RideConnect</span>
        </a>
        <nav className="find-ride-nav" aria-label="Main navigation">
          <button type="button" className="find-ride-nav-link active">
            Find a Ride
          </button>
          <button
            type="button"
            className="find-ride-nav-link"
            onClick={onMyRides}
          >
            My Rides
          </button>
        </nav>
        <div className="find-ride-header-actions">
          <button
            type="button"
            className="find-ride-offer-link"
            onClick={onOfferRide}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" /> Offer a Ride
          </button>
          <button
            type="button"
            className="find-ride-icon-button"
            aria-label="Notifications"
          >
            <i className="fa-regular fa-bell" aria-hidden="true" />
            <span className="find-ride-unread-dot" />
          </button>
          <Avatar initials="YO" />
        </div>
      </header>

      <section className="find-ride-content">
        <div className="find-ride-title-row">
          <div>
            <p className="find-ride-eyebrow">COLLEAGUE CARPOOL</p>
            <h1>Find a ride</h1>
            <p className="find-ride-subtitle">
              Open rides from your colleagues · {filteredRides.length} rides
              available
            </p>
          </div>
        </div>

        <div className="find-ride-filters">
          <label className="find-ride-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <span className="sr-only">Search by origin or destination</span>
            <input
              type="search"
              placeholder="Search by origin or destination (e.g. Madina)"
              value={search}
              onChange={handleSearchChange}
            />
          </label>
          <label className="find-ride-date-select">
            <span className="sr-only">Filter by date</span>
            <i className="fa-regular fa-calendar" aria-hidden="true" />
            <select value={selectedDate} onChange={handleDateChange}>
              <option value="">Any date</option>
              <option value={today}>{formatDate(today)}</option>
              <option value={tomorrow}>{formatDate(tomorrow)}</option>
              <option value={getDateOffset(2)}>
                {formatDate(getDateOffset(2))}
              </option>
              <option value={getDateOffset(4)}>
                {formatDate(getDateOffset(4))}
              </option>
            </select>
          </label>
          <div
            className="find-ride-quick-filters"
            aria-label="Quick date filters"
          >
            <button
              type="button"
              className={selectedDate === today ? 'active' : ''}
              onClick={() => handleQuickDateChange(today)}
            >
              Today
            </button>
            <button
              type="button"
              className={selectedDate === tomorrow ? 'active' : ''}
              onClick={() => handleQuickDateChange(tomorrow)}
            >
              Tomorrow
            </button>
          </div>
        </div>

        {hasFilters && (
          <div className="find-ride-filter-chips">
            <span>Active filters:</span>
            {search.trim() && (
              <FilterChip onRemove={() => setSearch('')}>
                {search.trim()}
              </FilterChip>
            )}
            {selectedDate && (
              <FilterChip onRemove={() => setSelectedDate('')}>
                {getActiveDateLabel(selectedDate)}
              </FilterChip>
            )}
            <button
              type="button"
              className="find-ride-clear-link"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        )}

        {toast && (
          <div
            className={`find-ride-toast find-ride-toast-${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            <i
              className={
                toast.tone === 'error'
                  ? 'fa-solid fa-circle-exclamation'
                  : 'fa-solid fa-circle-check'
              }
              aria-hidden="true"
            />
            <span>{toast.message}</span>
          </div>
        )}

        {renderResults()}
      </section>
    </main>
  )
}

export default FindARide
