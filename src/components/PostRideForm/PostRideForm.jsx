import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
import SeatStepper from './SeatStepper'
import RidePreviewCard from './RidePreviewCard'
import DatePickerField from '../PickerFields/DatePickerField'
import TimePickerField from '../PickerFields/TimePickerField'
import { OFFICES, matchesOffice, officeLabel } from '../../lib/offices'
import './PostRideForm.css'

const DESCRIPTION_MAX_LENGTH = 500

const DIRECTIONS = [
  { value: 'to-office', label: 'To the office', icon: 'fa-building' },
  { value: 'from-office', label: 'From the office', icon: 'fa-house' },
]

function getInitialValues() {
  return {
    // Every ride starts or ends at an office: the office side is a dropdown,
    // the other side (`place`) is free text.
    direction: 'to-office',
    office: '',
    place: '',
    description: '',
    date: '',
    time: '',
    seats: 1,
  }
}

function toISODate(date) {
  const localMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
  return localMidnight.toISOString().slice(0, 10)
}

function formatDisplayDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDisplayTime(timeStr) {
  const [hourStr, minute] = timeStr.split(':')
  const hour = Number(hourStr)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute} ${period}`
}

/** The origin and destination strings the ride is posted with. */
function toRoute({ direction, office, place }) {
  const officeName = officeLabel(office)
  const placeName = place.trim()
  return direction === 'to-office'
    ? { origin: placeName, destination: officeName }
    : { origin: officeName, destination: placeName }
}

function validate(values, now) {
  const errors = {}
  const todayISODate = toISODate(now)
  const isToOffice = values.direction === 'to-office'

  if (!values.office) {
    errors.office = 'Please choose an office'
  }

  if (!values.place.trim()) {
    errors.place = isToOffice
      ? 'Please enter an origin'
      : 'Please enter a destination'
  } else if (matchesOffice(values.place, values.office)) {
    errors.place = 'Origin and destination must be different'
  }

  if (!values.date) {
    errors.date = 'Please enter a departure date'
  } else if (values.date < todayISODate) {
    errors.date = "Departure date can't be in the past"
  }

  if (!values.time) {
    errors.time = 'Please enter a departure time'
  }

  if (
    !Number.isInteger(Number(values.seats)) ||
    values.seats < 1 ||
    values.seats > 8
  ) {
    errors.seats = 'Seats must be between 1 and 8'
  }

  if (values.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Route description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`
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

async function readResponseBody(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

// The backend sends each field's errors as a list; show the first.
const firstMessage = (value) => (Array.isArray(value) ? value[0] : value)

function mapServerFieldErrors(fields = {}, direction) {
  const isToOffice = direction === 'to-office'
  const officeSide = isToOffice ? fields.destination : fields.origin
  return {
    place: firstMessage(isToOffice ? fields.origin : fields.destination),
    // `office` itself (the enum) and the office-side text share one dropdown.
    office: firstMessage(fields.office ?? officeSide),
    date: firstMessage(fields.departureDate),
    time: firstMessage(fields.departureTime),
    seats: firstMessage(fields.availableSeats),
    description: firstMessage(fields.routeDescription),
  }
}

function PostRideForm({ onFindRide, userImage, userInitials }) {
  const [values, setValues] = useState(getInitialValues)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [toastMessage, setToastMessage] = useState(null)
  const [serverErrors, setServerErrors] = useState({})

  const now = new Date()
  const todayISODate = toISODate(now)
  const isSubmitting = status === 'submitting'
  const errors = validate(values, now)
  const isToOffice = values.direction === 'to-office'
  const route = toRoute(values)

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  const updateField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setServerErrors((prev) => ({ ...prev, [field]: undefined }))
    if (status === 'success' || status === 'error') setStatus('idle')
  }

  // The office has to stay a dropdown, so swapping flips the trip direction
  // (and with it which side the office is on) rather than the values.
  const handleSwap = () => {
    setValues((prev) => ({
      ...prev,
      direction: prev.direction === 'to-office' ? 'from-office' : 'to-office',
    }))
    setServerErrors({})
    if (status === 'success' || status === 'error') setStatus('idle')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setHasAttemptedSubmit(true)
    if (Object.keys(errors).length > 0) return

    setStatus('submitting')
    setToastMessage(null)
    setServerErrors({})

    try {
      const payload = {
        origin: route.origin,
        destination: route.destination,
        departureDate: values.date,
        departureTime: values.time,
        availableSeats: Number(values.seats),
        office: values.office,
      }

      // Route description is optional. Omit the key when it is blank rather
      // than sending null, which the backend schema rejects outright.
      const routeDescription = values.description.trim()
      if (routeDescription) {
        payload.routeDescription = routeDescription
      }

      const response = await apiFetch('/api/rides', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const body = await readResponseBody(response)
      if (response.ok || (response.status >= 200 && response.status < 300)) {
        setStatus('success')
        setToastMessage('Your ride is live!')
        onFindRide?.(body?.data?.id ?? body?.data?.ride?.id ?? body?.id)
      } else if (response.status === 400) {
        setServerErrors(
          mapServerFieldErrors(body?.data?.fields, values.direction),
        )
        setStatus('idle')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const handleCancel = () => {
    setValues(getInitialValues())
    setHasAttemptedSubmit(false)
    setStatus('idle')
    setToastMessage(null)
    setServerErrors({})
  }

  const isFormValid = Object.keys(errors).length === 0
  const showFieldErrors = hasAttemptedSubmit && status !== 'submitting'
  const getFieldError = (field) => serverErrors[field] || errors[field]
  const errorClass = (field) =>
    showFieldErrors && getFieldError(field) ? 'input-error' : ''

  const placeInput = (id) => (
    <input
      id={id}
      type="text"
      value={values.place}
      onChange={(event) => updateField('place', event.target.value)}
      disabled={isSubmitting}
      className={errorClass('place')}
      placeholder={isToOffice ? 'Starting point' : 'Drop-off point'}
    />
  )

  const officeSelect = (id) => (
    <select
      id={id}
      value={values.office}
      onChange={(event) => updateField('office', event.target.value)}
      disabled={isSubmitting}
      className={`office-select ${values.office ? '' : 'is-empty'} ${errorClass('office')}`}
    >
      <option value="" disabled>
        Select an office
      </option>
      {OFFICES.map((office) => (
        <option key={office.id} value={office.id}>
          {office.name} office
        </option>
      ))}
    </select>
  )

  const originField = isToOffice ? 'place' : 'office'
  const destinationField = isToOffice ? 'office' : 'place'

  return (
    <div className="post-ride-page">
      {status === 'error' && (
        <div className="error-banner">
          <span>
            <i
              className="fa-solid fa-triangle-exclamation"
              aria-hidden="true"
            />
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
            <div
              className="direction-toggle"
              role="radiogroup"
              aria-label="Trip direction"
            >
              {DIRECTIONS.map(({ value, label, icon }) => (
                <label
                  key={value}
                  className={`direction-option ${values.direction === value ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="direction"
                    value={value}
                    checked={values.direction === value}
                    onChange={() => updateField('direction', value)}
                    disabled={isSubmitting}
                  />
                  <i className={`fa-solid ${icon}`} aria-hidden="true" />
                  {label}
                </label>
              ))}
            </div>
            <div className="origin-destination-row">
              <div className="form-field">
                <label htmlFor="origin">Origin</label>
                {isToOffice ? placeInput('origin') : officeSelect('origin')}
                <FieldError
                  message={showFieldErrors ? getFieldError(originField) : null}
                />
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
                {isToOffice
                  ? officeSelect('destination')
                  : placeInput('destination')}
                <FieldError
                  message={
                    showFieldErrors ? getFieldError(destinationField) : null
                  }
                />
              </div>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="description">
              Route description{' '}
              <span className="optional-label">(optional)</span>
            </label>
            <textarea
              id="description"
              value={values.description}
              onChange={(event) =>
                updateField(
                  'description',
                  event.target.value.slice(0, DESCRIPTION_MAX_LENGTH),
                )
              }
              disabled={isSubmitting}
              maxLength={DESCRIPTION_MAX_LENGTH}
              placeholder="Mention roads you'll take or where you can pick people up."
              rows={3}
            />
            <span className="char-counter">
              {values.description.length} / {DESCRIPTION_MAX_LENGTH}
            </span>
            <FieldError
              message={showFieldErrors ? getFieldError('description') : null}
            />
          </div>

          <div className="form-section">
            <span className="section-label">When</span>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="date">Departure date</label>
                <DatePickerField
                  id="date"
                  value={values.date}
                  min={todayISODate}
                  onChange={(date) => updateField('date', date)}
                  disabled={isSubmitting}
                  hasError={Boolean(showFieldErrors && getFieldError('date'))}
                  formatValue={formatDisplayDate}
                />
                <FieldError
                  message={showFieldErrors ? getFieldError('date') : null}
                />
              </div>

              <div className="form-field">
                <label htmlFor="time">Departure time</label>
                <TimePickerField
                  id="time"
                  value={values.time}
                  onChange={(time) => updateField('time', time)}
                  disabled={isSubmitting}
                  hasError={Boolean(showFieldErrors && getFieldError('time'))}
                  formatValue={formatDisplayTime}
                />
                <FieldError
                  message={showFieldErrors ? getFieldError('time') : null}
                />
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
            <FieldError
              message={showFieldErrors ? getFieldError('seats') : null}
            />
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
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i
                    className="fa-solid fa-spinner fa-spin"
                    aria-hidden="true"
                  />
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
            driverImage={userImage}
            driverInitials={userInitials}
            ride={{ ...values, ...route }}
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
