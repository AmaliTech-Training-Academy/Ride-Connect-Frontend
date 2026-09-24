import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import {
  fetchMyRides,
  requestToJoinRide,
  withdrawRideRequest,
} from '../services/rides'
import UserMenu from '../components/UserMenu/UserMenu'
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

const INACTIVE_REQUEST_STATUSES = ['DECLINED', 'WITHDRAWN']

/**
 * `GET /api/rides` carries no per-user request status, so the viewer's open
 * requests come from their own joined buckets: rideId -> requestId.
 */
async function fetchActiveRequestIds() {
  const payload = await fetchMyRides()
  const entries = [
    ...(payload?.data?.joined ?? []),
    ...(payload?.data?.joinedPastAndCancelled ?? []),
  ]
  const active = {}
  entries.forEach((ride) => {
    const status = String(ride?.requestStatus || '').toUpperCase()
    if (!ride?.id || INACTIVE_REQUEST_STATUSES.includes(status)) return
    if (!active[ride.id]) active[ride.id] = ride.requestId ?? null
  })
  return active
}

function getActiveDateLabel(date) {
  if (date === getDateOffset(0)) return 'Today'
  if (date === getDateOffset(1)) return 'Tomorrow'
  return formatDate(date)
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getFirstName(name) {
  return name?.trim().split(/\s+/)[0] || 'there'
}

function Avatar({ initials }) {
  return <span className="find-ride-avatar">{initials}</span>
}

function RideCard({
  ride,
  onRequest,
  onWithdraw,
  onManage,
  isHighlighted,
  requestState,
}) {
  const isLowSeat = ride.seatsAvailable === 1
  const isRequested = requestState === 'requested'
  const isSending = requestState === 'sending'
  const isWithdrawing = requestState === 'withdrawing'
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
        <span
          className={`find-ride-status ${ride.isOwnRide ? 'find-ride-status-own' : ''}`}
        >
          {ride.isOwnRide ? 'Your ride' : 'Open'}
        </span>
        {typeof ride.price === 'number' && (
          <span className="find-ride-price">
            GHS {ride.price}
            <small>/seat</small>
          </span>
        )}
      </div>

      <div className="find-ride-route">
        <span className="find-ride-route-timeline" aria-hidden="true">
          <span className="find-ride-route-dot find-ride-route-dot-start" />
          <span className="find-ride-route-line" />
          <span className="find-ride-route-dot find-ride-route-dot-end" />
        </span>
        <span className="find-ride-route-labels">
          <span>{ride.origin}</span>
          <span>{ride.destination}</span>
        </span>
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

      <div className="find-ride-card-divider" />

      <div className="find-ride-driver-row">
        <div className="find-ride-driver">
          <Avatar initials={ride.driverInitials} />
          <strong>{ride.driverName}</strong>
        </div>
        <div
          className={`find-ride-seats ${isLowSeat ? 'find-ride-seats-warning' : ''}`}
        >
          {isLowSeat && (
            <i
              className="fa-solid fa-triangle-exclamation"
              aria-hidden="true"
            />
          )}
          {isLowSeat
            ? '1 seat left'
            : `${ride.seatsAvailable} of ${ride.seatsTotal} seats left`}
        </div>
      </div>

      <div className="find-ride-card-action">
        {ride.isOwnRide ? (
          <button
            type="button"
            className="find-ride-button find-ride-button-outline"
            onClick={() => onManage(ride)}
          >
            Manage
          </button>
        ) : (
          <button
            type="button"
            className={`find-ride-button ${isRequested ? 'find-ride-button-requested' : ''}`}
            disabled={isSending || isWithdrawing}
            onClick={() =>
              isRequested ? onWithdraw(ride) : onRequest(ride)
            }
          >
            {isRequested ? (
              isWithdrawing ? (
                'Withdrawing...'
              ) : (
                'Withdraw request'
              )
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
  onManageRide,
  onLogout,
  userInitials,
  userName,
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
  // rideId -> 'sending' | 'requested' | 'withdrawing'
  const [requestStates, setRequestStates] = useState({})
  // rideId -> requestId, for rides with a request in `requestStates`
  const [requestIds, setRequestIds] = useState({})
  // Cards wait for this so a requested ride never flashes "Request to Join".
  const [requestStatusReady, setRequestStatusReady] = useState(false)

  const today = getDateOffset(0)
  const tomorrow = getDateOffset(1)
  const weekFromNow = getDateOffset(6)
  const hasFilters = Boolean(search.trim() || selectedDate)
  const filteredRides = rides
  const ridesTodayCount = rides.filter((ride) => ride.date === today).length
  const openSeatsCount = rides.reduce(
    (sum, ride) => sum + (ride.seatsAvailable || 0),
    0,
  )
  const driversThisWeekCount = new Set(
    rides
      .filter((ride) => ride.date >= today && ride.date <= weekFromNow)
      .map((ride) => ride.driverId),
  ).size

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
  }, [search, selectedDate, currentUserId, reloadToken])

  useEffect(() => {
    let ignore = false

    fetchActiveRequestIds()
      .then((active) => {
        if (ignore) return
        setRequestStates((current) => {
          const next = { ...current }
          Object.keys(active).forEach((rideId) => {
            if (!next[rideId]) next[rideId] = 'requested'
          })
          return next
        })
        setRequestIds((current) => {
          const next = { ...current }
          Object.entries(active).forEach(([rideId, requestId]) => {
            if (requestId) next[rideId] = requestId
          })
          return next
        })
      })
      .catch((error) => {
        // Falls back to "Request to Join"; a click on an already-requested
        // ride then self-corrects through the 409 handling below.
        if (!ignore) console.error('Unable to load your ride requests:', error)
      })
      .finally(() => {
        if (!ignore) setRequestStatusReady(true)
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
      const requestResult = await requestToJoinRide(ride.id)
      setRequestStates((current) => ({ ...current, [ride.id]: 'requested' }))
      if (requestResult?.id) {
        setRequestIds((current) => ({
          ...current,
          [ride.id]: requestResult.id,
        }))
      }
      setToast({
        tone: 'success',
        message: `Request sent to ${ride.driverName}. The driver will be notified.`,
      })
    } catch (error) {
      if (error?.status === 409) {
        // 409 means "already requested" or "ride closed"; the viewer's own
        // requests tell the two apart and supply the id Withdraw needs.
        const active = await fetchActiveRequestIds().catch(() => null)
        if (active && !(ride.id in active)) {
          setRequestStates((current) => {
            const next = { ...current }
            delete next[ride.id]
            return next
          })
          setToast({
            tone: 'error',
            message: error.message || 'This ride is no longer open.',
          })
          return
        }
        setRequestStates((current) => ({ ...current, [ride.id]: 'requested' }))
        if (active?.[ride.id]) {
          setRequestIds((current) => ({
            ...current,
            [ride.id]: active[ride.id],
          }))
        }
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

  const handleWithdraw = async (ride) => {
    setRequestStates((current) => ({ ...current, [ride.id]: 'withdrawing' }))

    let requestId = requestIds[ride.id]
    if (!requestId) {
      const active = await fetchActiveRequestIds().catch(() => null)
      requestId = active?.[ride.id]
    }
    if (!requestId) {
      setRequestStates((current) => ({ ...current, [ride.id]: 'requested' }))
      setToast({
        tone: 'error',
        message: 'Could not find your request for this ride.',
      })
      return
    }

    try {
      await withdrawRideRequest(ride.id, requestId)
      setRequestStates((current) => {
        const next = { ...current }
        delete next[ride.id]
        return next
      })
      setRequestIds((current) => {
        const next = { ...current }
        delete next[ride.id]
        return next
      })
      setToast({
        tone: 'success',
        message: 'Your request has been withdrawn.',
      })
    } catch (error) {
      setRequestStates((current) => ({ ...current, [ride.id]: 'requested' }))
      setToast({
        tone: 'error',
        message: error?.message || 'Could not withdraw your request.',
      })
    }
  }

  const renderResults = () => {
    if (
      loadState === 'loading' ||
      (loadState === 'loaded' && !requestStatusReady)
    ) {
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
            onWithdraw={handleWithdraw}
            onManage={onManageRide}
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
          <span className="find-ride-logo-badge">
            <i className="fa-solid fa-car-side" aria-hidden="true" />
          </span>
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
          <div className="find-ride-profile-group">
            <button
              type="button"
              className="find-ride-icon-button"
              aria-label="Notifications"
            >
              <i className="fa-regular fa-bell" aria-hidden="true" />
              <span className="find-ride-unread-dot" />
            </button>
            <UserMenu initials={userInitials || '?'} onLogout={onLogout} />
          </div>
        </div>
      </header>

      <section className="find-ride-hero">
        <div className="find-ride-hero-inner">
          <p className="find-ride-hero-eyebrow">
            {getGreeting()}, {getFirstName(userName)}
          </p>
          <h2 className="find-ride-hero-heading">Where are you headed today?</h2>
          <p className="find-ride-hero-subtitle">
            Find a colleague heading your way and share the ride.
          </p>
          <div className="find-ride-stats">
            <div className="find-ride-stat-card">
              <span className="find-ride-stat-value">{ridesTodayCount}</span>
              <span className="find-ride-stat-label">Rides on offer today</span>
            </div>
            <div className="find-ride-stat-card">
              <span className="find-ride-stat-value">{openSeatsCount}</span>
              <span className="find-ride-stat-label">
                Seats waiting to be filled
              </span>
            </div>
            <div className="find-ride-stat-card">
              <span className="find-ride-stat-value">
                {driversThisWeekCount}
              </span>
              <span className="find-ride-stat-label">
                Colleagues driving this week
              </span>
            </div>
          </div>
        </div>
      </section>

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
