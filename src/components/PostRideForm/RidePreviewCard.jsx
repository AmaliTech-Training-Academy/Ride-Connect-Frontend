function formatDisplayDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatDisplayTime(timeStr) {
  const [hourStr, minute] = timeStr.split(':')
  const hour = Number(hourStr)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute} ${period}`
}

function RidePreviewCard({ ride, isValid, showErrorState, isNew }) {
  if (!isValid) {
    return (
      <div className="preview-placeholder">
        <i className="fa-regular fa-clone" aria-hidden="true" />
        <p>
          {showErrorState
            ? 'Fix the errors to preview your ride card.'
            : 'Fill in the details to preview your ride card.'}
        </p>
      </div>
    )
  }

  const { origin, destination, description, date, time, seats } = ride

  return (
    <div className={`preview-card ${isNew ? 'is-new' : ''}`}>
      {isNew && <span className="new-badge">NEW</span>}

      <div className="preview-header">
        <div className="avatar">Y</div>
        <div>
          <p className="driver-name">You</p>
          <span className="status-badge">Open</span>
        </div>
      </div>

      <div className="preview-route">
        <span>{origin}</span>
        <i className="fa-solid fa-arrow-right-long" aria-hidden="true" />
        <span>{destination}</span>
      </div>

      {description && <p className="preview-description">{description}</p>}

      <div className="preview-meta">
        <span>
          <i className="fa-regular fa-calendar" aria-hidden="true" />
          {formatDisplayDate(date)}
        </span>
        <span>
          <i className="fa-regular fa-clock" aria-hidden="true" />
          {formatDisplayTime(time)}
        </span>
        <span>
          <i className="fa-solid fa-user" aria-hidden="true" />
          {seats} seat{seats > 1 ? 's' : ''}
        </span>
      </div>

      <button type="button" className="request-join-btn" disabled>
        Request to Join
      </button>
    </div>
  )
}

export default RidePreviewCard
