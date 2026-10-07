import { useEffect, useId, useRef, useState } from 'react'
import UserAvatar from '../UserAvatar/UserAvatar'
import { officeName } from '../../lib/offices'
import { describePassengers } from '../../lib/passengers'
import './PassengerStack.css'

// Avatar size and overlap, mirrored in PassengerStack.css. Used to point the
// profile card's arrow at whichever avatar opened it.
const AVATAR_SIZE = 32
const AVATAR_STEP = 22
const OPEN_DELAY = 120
const CLOSE_DELAY = 160

const MORE = 'more'

function PassengerDetails({ passenger }) {
  const office = officeName(passenger.office)
  return (
    <>
      <UserAvatar
        className="passenger-card-photo"
        imageUrl={passenger.image}
        initials={passenger.initials}
      />
      <strong className="passenger-card-name">{passenger.name}</strong>
      {(office || passenger.role) && (
        <ul className="passenger-card-details">
          {passenger.role && (
            <li>
              <i className="fa-solid fa-briefcase" aria-hidden="true" />
              {passenger.role}
            </li>
          )}
          {office && (
            <li>
              <i className="fa-solid fa-building" aria-hidden="true" />
              {office} office
            </li>
          )}
        </ul>
      )}
      <span className="passenger-card-chip">
        <i className="fa-solid fa-circle-check" aria-hidden="true" />
        Confirmed passenger
      </span>
    </>
  )
}

/**
 * The passengers a driver has already accepted, as overlapping avatars. Each
 * one opens a small profile card on hover, keyboard focus or tap, so someone
 * deciding whether to join can see who they would be riding with.
 */
function PassengerStack({ passengers, max = 4 }) {
  const [openKey, setOpenKey] = useState(null)
  const cardId = useId()
  const wrapperRef = useRef(null)
  const timerRef = useRef(null)
  // A press focuses the button before its click; that focus must not open
  // the card, or the click would immediately toggle it shut again.
  const pressingRef = useRef(false)
  const returningFocusRef = useRef(false)

  // The key a hover is about to open, so moving within one avatar doesn't
  // restart its timer.
  const pendingKeyRef = useRef(null)

  const clearTimer = () => {
    clearTimeout(timerRef.current)
    timerRef.current = null
    pendingKeyRef.current = null
  }

  useEffect(() => clearTimer, [])

  useEffect(() => {
    if (openKey === null) return undefined

    const closeOnOutsidePress = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpenKey(null)
    }
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      setOpenKey(null)
      // Hand focus back to the avatar without that focus reopening the card.
      returningFocusRef.current = true
      wrapperRef.current
        ?.querySelector(`[data-passenger-key="${openKey}"]`)
        ?.focus()
      returningFocusRef.current = false
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openKey])

  if (!passengers?.length) return null

  const shown = passengers.slice(0, max)
  const hidden = passengers.slice(max)

  // Hovering opens after a short pause, and switching between avatars is
  // instant once one card is already showing.
  const hoverOpen = (key) => {
    if (key === openKey || key === pendingKeyRef.current) return
    clearTimer()
    if (openKey !== null) {
      setOpenKey(key)
      return
    }
    pendingKeyRef.current = key
    timerRef.current = setTimeout(() => {
      pendingKeyRef.current = null
      setOpenKey(key)
    }, OPEN_DELAY)
  }
  // Closing waits a moment, so the pointer can travel into the card itself.
  const hoverClose = () => {
    clearTimer()
    timerRef.current = setTimeout(() => setOpenKey(null), CLOSE_DELAY)
  }

  // One set of handlers on the row; each avatar is told apart by its key.
  const keyFrom = (event) =>
    event.target.closest?.('[data-passenger-key]')?.dataset.passengerKey ?? null

  const trigger = (key, label) => ({
    type: 'button',
    'data-passenger-key': key,
    'aria-label': label,
    'aria-describedby': openKey === key ? cardId : undefined,
    'data-open': openKey === key ? 'true' : undefined,
  })

  const openIndex =
    openKey === MORE ? shown.length : shown.findIndex((p) => p.id === openKey)
  const openPassenger = shown[openIndex]

  return (
    <div
      ref={wrapperRef}
      className="passenger-stack"
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') hoverClose()
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' && openKey !== null) clearTimer()
      }}
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget)) {
          clearTimer()
          setOpenKey(null)
        }
      }}
    >
      <ul
        className="passenger-stack-avatars"
        aria-label={`Already on this ride: ${describePassengers(passengers)}`}
        onPointerOver={(event) => {
          const key = keyFrom(event)
          if (key && event.pointerType === 'mouse') hoverOpen(key)
        }}
        onPointerDown={() => {
          pressingRef.current = true
        }}
        onFocus={(event) => {
          const key = keyFrom(event)
          if (key && !pressingRef.current && !returningFocusRef.current) {
            setOpenKey(key)
          }
        }}
        onClick={(event) => {
          const key = keyFrom(event)
          pressingRef.current = false
          if (!key) return
          clearTimer()
          setOpenKey((current) => (current === key ? null : key))
        }}
      >
        {shown.map((passenger) => (
          <li key={passenger.id}>
            <button
              className="passenger-stack-trigger"
              {...trigger(passenger.id, passenger.name)}
            >
              <UserAvatar
                className="passenger-stack-avatar"
                imageUrl={passenger.image}
                initials={passenger.initials}
              />
            </button>
          </li>
        ))}
        {hidden.length > 0 && (
          <li>
            <button
              className="passenger-stack-trigger passenger-stack-more"
              {...trigger(
                MORE,
                `${hidden.length} more ${hidden.length === 1 ? 'passenger' : 'passengers'}`,
              )}
            >
              +{hidden.length}
            </button>
          </li>
        )}
      </ul>
      {/* Short enough to sit beside the card's button; the list's label
          gives screen readers the names. */}
      <span className="passenger-stack-label" aria-hidden="true">
        {passengers.length} riding
      </span>

      {openKey !== null && (openPassenger || openKey === MORE) && (
        <div
          id={cardId}
          role="tooltip"
          className="passenger-card"
          style={{
            '--passenger-card-arrow': `${openIndex * AVATAR_STEP + AVATAR_SIZE / 2}px`,
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') clearTimer()
          }}
        >
          {openKey === MORE ? (
            <>
              <strong className="passenger-card-heading">
                Also on this ride
              </strong>
              <ul className="passenger-card-others">
                {hidden.map((passenger) => (
                  <li key={passenger.id}>
                    <UserAvatar
                      className="passenger-card-mini"
                      imageUrl={passenger.image}
                      initials={passenger.initials}
                    />
                    <span>
                      {passenger.name}
                      {officeName(passenger.office) && (
                        <small>{officeName(passenger.office)} office</small>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <PassengerDetails passenger={openPassenger} />
          )}
        </div>
      )}
    </div>
  )
}

export default PassengerStack
