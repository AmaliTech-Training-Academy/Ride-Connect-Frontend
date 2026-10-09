import { useEffect, useRef } from 'react'
import '../ConfirmDialog/ConfirmDialog.css'
import './RejoinRideDialog.css'

/**
 * Focus the "safe" action on open, wrap Tab inside the dialog, close on
 * Escape, and restore focus to whatever opened it on close.
 */
function useModalFocusTrap(dialogRef, safeRef, returnFocusTo, onDismiss) {
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    const previouslyFocused = returnFocusTo?.current ?? document.activeElement
    safeRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onDismissRef.current?.()
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
}

/**
 * The one extra ask a passenger gets after a decline: they say why they'd
 * like to join again, and it goes to the driver with the request. Shared by
 * Find a Ride and My Rides so both offer the same, single re-request.
 */
function RejoinRideDialog({
  ride,
  reason,
  onReasonChange,
  error,
  isPending,
  returnFocusTo,
  onCancel,
  onConfirm,
}) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  useModalFocusTrap(dialogRef, cancelRef, returnFocusTo, onCancel)

  const trimmedReason = reason.trim()

  return (
    <div className="confirm-dialog-backdrop">
      <div
        ref={dialogRef}
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rejoin-ride-title"
      >
        <div className="confirm-dialog-icon confirm-dialog-icon-neutral">
          <i className="fa-solid fa-rotate-right" aria-hidden="true" />
        </div>
        <h2 id="rejoin-ride-title">Request to join again?</h2>
        <p>
          Your last request for {ride.origin}{' '}
          <i className="fa-solid fa-arrow-right-long" aria-hidden="true" />{' '}
          {ride.destination} was declined. Let {ride.driverName} know why
          you&apos;d like to join again.
        </p>
        <p className="rejoin-dialog-note">
          You can only ask again once for this ride.
        </p>
        <label className="rejoin-dialog-field" htmlFor="rejoin-reason">
          Reason for rejoining
        </label>
        <textarea
          id="rejoin-reason"
          className="rejoin-dialog-textarea"
          rows={3}
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="e.g. I can be flexible on the pickup time."
        />
        {error && (
          <p className="rejoin-dialog-error" role="alert">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{' '}
            {error}
          </p>
        )}
        <div className="confirm-dialog-actions">
          <button
            ref={cancelRef}
            type="button"
            className="confirm-dialog-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="confirm-dialog-confirm confirm-dialog-confirm-neutral"
            disabled={isPending || !trimmedReason}
            onClick={onConfirm}
          >
            {isPending ? 'Sending...' : error ? 'Try again' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Renders the dialog only while a ride is targeted, fresh for each ride. */
export function RejoinRideModal({ ride, ...props }) {
  if (!ride) return null
  return <RejoinRideDialog key={ride.id} ride={ride} {...props} />
}

export default RejoinRideDialog
