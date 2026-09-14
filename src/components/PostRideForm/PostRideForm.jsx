import { useEffect, useRef, useState } from 'react'
import SeatStepper from './SeatStepper'
import RidePreviewCard from './RidePreviewCard'
import './PostRideForm.css'

const DESCRIPTION_MAX_LENGTH = 200

function getInitialValues() {
  return {
    origin: '',
    destination: 'AmaliTech Office',
    description: '',
    date: '',
    time: '',
    seats: 1,
  }
}

function toISODate(date) {
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return localMidnight.toISOString().slice(0, 10)
}

function formatDisplayDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDisplayTime(timeStr) {
  const [hourStr, minute] = timeStr.split(':')
  const hour = Number(hourStr)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute} ${period}`
}

function validate(values, now) {
  const errors = {}
  const todayISODate = toISODate(now)

  if (!values.origin.trim()) {
    errors.origin = 'Please enter an origin'
  }

  if (!values.destination.trim()) {
    errors.destination = 'Please enter a destination'
  }

  if (!values.date) {
    errors.date = 'Please enter a departure date'
  } else if (values.date < todayISODate) {
    errors.date = "Departure date can't be in the past"
  }

  if (!values.time) {
    errors.time = 'Please enter a departure time'
  } else if (values.date === todayISODate) {
    const departureDateTime = new Date(`${values.date}T${values.time}`)
    if (departureDateTime < now) {
      errors.time = "Departure time can't be in the past"
    }
  }

  if (values.seats < 1 || values.seats > 8) {
    errors.seats = 'Seats must be between 1 and 8'
  }

  return errors
}

function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="field-error">
      <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
      {message}
    </p>
  )
}

function PostRideForm() {
  const [values, setValues] = useState(getInitialValues)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [toastMessage, setToastMessage] = useState(null)

  const dateInputRef = useRef(null)
  const timeInputRef = useRef(null)

  const now = new Date()
  const todayISODate = toISODate(now)
  const isSubmitting = status === 'submitting'
  const errors = validate(values, now)

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  const updateField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (status === 'success' || status === 'error') setStatus('idle')
  }

  const handleSwap = () => {
    setValues((prev) => ({ ...prev, origin: prev.destination, destination: prev.origin }))
    if (status === 'success' || status === 'error') setStatus('idle')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setHasAttemptedSubmit(true)
    if (Object.keys(errors).length > 0) return

    setStatus('submitting')
    setToastMessage(null)

    // TODO: replace this mock submit with a real POST /rides call once the API is ready
    setTimeout(() => {
      setStatus('success')
      setToastMessage('Your ride is live!')
      console.log('Ride posted (mock):', values)
    }, 1500)
  }

  const handleCancel = () => {
    setValues(getInitialValues())
    setHasAttemptedSubmit(false)
    setStatus('idle')
    setToastMessage(null)
  }

  const isFormValid = Object.keys(errors).length === 0
  const showFieldErrors = hasAttemptedSubmit && status !== 'submitting'

  return (
    <div className="post-ride-page">
      <header className="app-header">
        <i className="fa-solid fa-car-side" aria-hidden="true" />
        <span>RideConnect</span>
      </header>

      {status === 'error' && (
        <div className="error-banner">
          <span>
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            Something went wrong posting your ride. Please try again.
          </span>
          <button
            type="button"
            className="error-banner-dismiss"
            onClick={() => setStatus('idle')}
            aria-label="Dismiss error"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="post-ride-layout">
        <form className="post-ride-form" onSubmit={handleSubmit} noValidate>
          <h1>Offer a ride</h1>

          <div className="form-section">
            <span className="section-label">Route</span>
            <div className="origin-destination-row">
              <div className="form-field">
                <label htmlFor="origin">Origin</label>
                <input
                  id="origin"
                  type="text"
                  value={values.origin}
                  onChange={(event) => updateField('origin', event.target.value)}
                  disabled={isSubmitting}
                  className={showFieldErrors && errors.origin ? 'input-error' : ''}
                  placeholder="Starting point"
                />
                <FieldError message={showFieldErrors ? errors.origin : null} />
              </div>

              <div className="swap-btn-wrap">
                <button
                  type="button"
                  className="swap-btn"
                  onClick={handleSwap}
                  disabled={isSubmitting}
                  aria-label="Swap origin and destination"
                >
                  <i className="fa-solid fa-right-left" aria-hidden="true" />
                </button>
              </div>

              <div className="form-field">
                <label htmlFor="destination">Destination</label>
                <input
                  id="destination"
                  type="text"
                  value={values.destination}
                  onChange={(event) => updateField('destination', event.target.value)}
                  disabled={isSubmitting}
                  className={showFieldErrors && errors.destination ? 'input-error' : ''}
                  placeholder="Drop-off point"
                />
                <FieldError message={showFieldErrors ? errors.destination : null} />
              </div>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="description">
              Route description <span className="optional-label">(optional)</span>
            </label>
            <textarea
              id="description"
              value={values.description}
              onChange={(event) =>
                updateField('description', event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))
              }
              disabled={isSubmitting}
              maxLength={DESCRIPTION_MAX_LENGTH}
              placeholder="Mention roads you'll take or where you can pick people up."
              rows={3}
            />
            <span className="char-counter">
              {values.description.length} / {DESCRIPTION_MAX_LENGTH}
            </span>
          </div>

          <div className="form-section">
            <span className="section-label">When</span>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="date">Departure date</label>
                <div
                  className={`styled-date-field ${showFieldErrors && errors.date ? 'input-error' : ''} ${isSubmitting ? 'is-disabled' : ''}`}
                  onClick={() => !isSubmitting && dateInputRef.current?.showPicker?.()}
                >
                  <span className={values.date ? '' : 'placeholder'}>
                    {values.date ? formatDisplayDate(values.date) : 'Select a date'}
                  </span>
                  <i className="fa-regular fa-calendar" aria-hidden="true" />
                  <input
                    ref={dateInputRef}
                    id="date"
                    type="date"
                    className="styled-date-field-native"
                    value={values.date}
                    min={todayISODate}
                    onChange={(event) => updateField('date', event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <FieldError message={showFieldErrors ? errors.date : null} />
              </div>

              <div className="form-field">
                <label htmlFor="time">Departure time</label>
                <div
                  className={`styled-date-field ${showFieldErrors && errors.time ? 'input-error' : ''} ${isSubmitting ? 'is-disabled' : ''}`}
                  onClick={() => !isSubmitting && timeInputRef.current?.showPicker?.()}
                >
                  <span className={values.time ? '' : 'placeholder'}>
                    {values.time ? formatDisplayTime(values.time) : 'Select a time'}
                  </span>
                  <i className="fa-regular fa-clock" aria-hidden="true" />
                  <input
                    ref={timeInputRef}
                    id="time"
                    type="time"
                    className="styled-date-field-native"
                    value={values.time}
                    onChange={(event) => updateField('time', event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <FieldError message={showFieldErrors ? errors.time : null} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <span className="section-label">Seats</span>
            <SeatStepper
              value={values.seats}
              onChange={(seats) => updateField('seats', seats)}
              disabled={isSubmitting}
            />
            <FieldError message={showFieldErrors ? errors.seats : null} />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                  Posting…
                </>
              ) : (
                'Post Ride'
              )}
            </button>
          </div>
        </form>

        <aside className="post-ride-preview">
          <RidePreviewCard
            ride={values}
            isValid={isFormValid}
            showErrorState={hasAttemptedSubmit}
            isNew={status === 'success'}
          />
        </aside>
      </div>

      {toastMessage && (
        <div className="toast">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          {toastMessage}
        </div>
      )}
    </div>
  )
}

export default PostRideForm
