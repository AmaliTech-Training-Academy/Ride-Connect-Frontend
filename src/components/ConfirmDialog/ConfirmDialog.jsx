import { useEffect, useId, useRef } from 'react'
import './ConfirmDialog.css'

/**
 * A small "are you sure?" dialog in the app's style, used instead of the
 * browser's confirm(). Mounted only while open, so the focus trap sets up and
 * tears down with it: focus starts on the safe choice, stays inside while
 * open, and goes back to whatever opened it.
 */
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  icon = 'fa-solid fa-circle-question',
  tone = 'danger',
  isPending = false,
  pendingLabel,
  onConfirm,
  onCancel,
}) {
  const titleId = useId()
  const messageId = useId()
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  const onCancelRef = useRef(onCancel)
  const isPendingRef = useRef(isPending)

  useEffect(() => {
    onCancelRef.current = onCancel
    isPendingRef.current = isPending
  }, [onCancel, isPending])

  useEffect(() => {
    const previouslyFocused = document.activeElement
    cancelRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!isPendingRef.current) onCancelRef.current?.()
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
  }, [])

  return (
    <div
      className="confirm-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel?.()
      }}
    >
      <div
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
      >
        <div className={`confirm-dialog-icon confirm-dialog-icon-${tone}`}>
          <i className={icon} aria-hidden="true" />
        </div>
        <h2 id={titleId}>{title}</h2>
        {message && <p id={messageId}>{message}</p>}
        <div className="confirm-dialog-actions">
          <button
            ref={cancelRef}
            type="button"
            className="confirm-dialog-cancel"
            disabled={isPending}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-dialog-confirm confirm-dialog-confirm-${tone}`}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending && pendingLabel ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
