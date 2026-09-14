import { useEffect, useMemo, useState } from 'react'
import { createMockRides } from './findARideMockData'
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

function getActiveDateLabel(date) {
  if (date === getDateOffset(0)) return 'Today'
  if (date === getDateOffset(1)) return 'Tomorrow'
  return formatDate(date)
}

function Avatar({ initials }) {
  return <span className="find-ride-avatar">{initials}</span>
}

function RideCard({ ride, onRequest }) {
  const isLowSeat = ride.seatsAvailable === 1
  const cardClassName = [
    'find-ride-card',
    isLowSeat ? 'find-ride-card-low-seat' : '',
    ride.isOwnRide ? 'find-ride-card-own' : '',
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
            <span className={`find-ride-status ${ride.isOwnRide ? 'find-ride-status-own' : ''}`}>
              {ride.isOwnRide ? 'Your ride' : 'Open'}
            </span>
          </div>
        </div>
        <i className="fa-solid fa-ellipsis" aria-hidden="true" />
      </div>

      <div className="find-ride-route">
        <span>{ride.origin}</span>
        <i className="fa-solid fa-arrow-right-long" aria-hidden="true" />
        <span>{ride.destination}</span>
      </div>

      {ride.description && <p className="find-ride-description">{ride.description}</p>}

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

      <div className={`find-ride-seats ${isLowSeat ? 'find-ride-seats-warning' : ''}`}>
        {isLowSeat && <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}
        {isLowSeat
          ? '1 seat left'
          : `${ride.seatsAvailable} of ${ride.seatsTotal} seats left`}
      </div>

      <div className="find-ride-card-action">
        {ride.isOwnRide ? (
          <button type="button" className="find-ride-button find-ride-button-outline">
            Manage
          </button>
        ) : ride.requestStatus === 'pending' ? (
          <span className="find-ride-action-pill find-ride-action-pending">Request pending</span>
        ) : ride.requestStatus === 'accepted' ? (
          <span className="find-ride-action-pill find-ride-action-accepted">✓ You&apos;re in</span>
        ) : (
          <button type="button" className="find-ride-button" onClick={() => onRequest(ride)}>
            Request to Join
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

function EmptyState({ hasFilters, onClear, onOfferRide }) {
  return (
    <div className="find-ride-empty-state">
      <div className="find-ride-empty-icon">
        <i className={`fa-solid ${hasFilters ? 'fa-magnifying-glass' : 'fa-car-side'}`} aria-hidden="true" />
      </div>
      <h2>{hasFilters ? 'No rides found for this date' : 'No rides posted yet'}</h2>
      <p>
        {hasFilters
          ? 'Try a different date or route, or offer a ride yourself.'
          : 'Be the first colleague to offer a ride to the office.'}
      </p>
      <div className="find-ride-empty-actions">
        {hasFilters && (
          <button type="button" className="find-ride-button find-ride-button-outline" onClick={onClear}>
            Clear filters
          </button>
        )}
        <button type="button" className="find-ride-button" onClick={onOfferRide}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Offer a Ride
        </button>
      </div>
    </div>
  )
}

function FindARide({ onOfferRide, onMyRides }) {
  // TODO: replace the local mock load with GET /rides when the backend is ready.
  const [rides, setRides] = useState(() => createMockRides())
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [loadState, setLoadState] = useState('loaded')
  const [toast, setToast] = useState(null)
  const [showDevControls, setShowDevControls] = useState(false)

  const today = getDateOffset(0)
  const tomorrow = getDateOffset(1)
  const hasFilters = Boolean(search.trim() || selectedDate)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const filteredRides = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    return rides.filter((ride) => {
      const matchesSearch = !searchTerm || [ride.origin, ride.destination].some((place) => place.toLowerCase().includes(searchTerm))
      const matchesDate = !selectedDate || ride.date === selectedDate
      return matchesSearch && matchesDate && ride.status === 'open'
    })
  }, [rides, search, selectedDate])

  const clearFilters = () => {
    setSearch('')
    setSelectedDate('')
  }

  const handleRequest = (ride) => {
    setToast(ride.driverName)
    setRides((currentRides) =>
      currentRides.map((currentRide) =>
        currentRide.id === ride.id ? { ...currentRide, requestStatus: 'pending' } : currentRide,
      ),
    )
  }

  const retryLoad = () => {
    setLoadState('loading')
    setTimeout(() => setLoadState('loaded'), 500)
  }

  const renderResults = () => {
    if (loadState === 'loading') {
      return <div className="find-ride-grid">{Array.from({ length: 6 }, (_, index) => <LoadingCard key={index} />)}</div>
    }

    if (loadState === 'error') {
      return (
        <div className="find-ride-error-state">
          <div className="find-ride-empty-icon find-ride-error-icon">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          </div>
          <h2>Couldn&apos;t load rides</h2>
          <p>Something went wrong on our end. Please try again.</p>
          <button type="button" className="find-ride-button" onClick={retryLoad}>Try again</button>
        </div>
      )
    }

    if (rides.length === 0) {
      return <EmptyState hasFilters={false} onOfferRide={onOfferRide} />
    }

    if (filteredRides.length === 0) {
      return <EmptyState hasFilters={hasFilters} onClear={clearFilters} onOfferRide={onOfferRide} />
    }

    return (
      <div className="find-ride-grid">
        {filteredRides.map((ride) => <RideCard key={ride.id} ride={ride} onRequest={handleRequest} />)}
      </div>
    )
  }

  return (
    <main className="find-ride-page">
      <header className="find-ride-header">
        <a className="find-ride-brand" href="#find-ride" onClick={(event) => event.preventDefault()}>
          <i className="fa-solid fa-car-side" aria-hidden="true" />
          <span>RideConnect</span>
        </a>
        <nav className="find-ride-nav" aria-label="Main navigation">
          <button type="button" className="find-ride-nav-link active">Find a Ride</button>
          <button type="button" className="find-ride-nav-link" onClick={onMyRides}>My Rides</button>
        </nav>
        <div className="find-ride-header-actions">
          <button type="button" className="find-ride-offer-link" onClick={onOfferRide}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Offer a Ride
          </button>
          <button type="button" className="find-ride-icon-button" aria-label="Notifications">
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
            <p className="find-ride-subtitle">Open rides from your colleagues · {filteredRides.length} rides available</p>
          </div>
          <button type="button" className="find-ride-dev-toggle" onClick={() => setShowDevControls((visible) => !visible)}>
            <i className="fa-solid fa-flask" aria-hidden="true" /> Dev states
          </button>
        </div>

        {showDevControls && (
          <div className="find-ride-dev-controls" aria-label="Development state controls">
            <span>Preview:</span>
            <button type="button" onClick={() => setLoadState('loaded')}>Loaded</button>
            <button type="button" onClick={() => setLoadState('loading')}>Loading</button>
            <button type="button" onClick={() => setLoadState('error')}>Error</button>
            <button type="button" onClick={() => setRides([])}>No rides</button>
            <button type="button" onClick={() => setRides(createMockRides())}>Reset data</button>
          </div>
        )}

        <div className="find-ride-filters">
          <label className="find-ride-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <span className="sr-only">Search by origin or destination</span>
            <input
              type="search"
              placeholder="Search by origin or destination (e.g. Madina)"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="find-ride-date-select">
            <span className="sr-only">Filter by date</span>
            <i className="fa-regular fa-calendar" aria-hidden="true" />
            <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
              <option value="">Any date</option>
              <option value={today}>{formatDate(today)}</option>
              <option value={tomorrow}>{formatDate(tomorrow)}</option>
              <option value={getDateOffset(2)}>{formatDate(getDateOffset(2))}</option>
              <option value={getDateOffset(4)}>{formatDate(getDateOffset(4))}</option>
            </select>
          </label>
          <div className="find-ride-quick-filters" aria-label="Quick date filters">
            <button type="button" className={selectedDate === today ? 'active' : ''} onClick={() => setSelectedDate(selectedDate === today ? '' : today)}>Today</button>
            <button type="button" className={selectedDate === tomorrow ? 'active' : ''} onClick={() => setSelectedDate(selectedDate === tomorrow ? '' : tomorrow)}>Tomorrow</button>
          </div>
        </div>

        {hasFilters && (
          <div className="find-ride-filter-chips">
            <span>Active filters:</span>
            {search.trim() && <FilterChip onRemove={() => setSearch('')}>{search.trim()}</FilterChip>}
            {selectedDate && <FilterChip onRemove={() => setSelectedDate('')}>{getActiveDateLabel(selectedDate)}</FilterChip>}
            <button type="button" className="find-ride-clear-link" onClick={clearFilters}>Clear filters</button>
          </div>
        )}

        {toast && (
          <div className="find-ride-toast" role="status">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
            <span>Request sent to {toast}. You&apos;ll see the status in My Rides.</span>
          </div>
        )}

        {renderResults()}
      </section>
    </main>
  )
}

export default FindARide
