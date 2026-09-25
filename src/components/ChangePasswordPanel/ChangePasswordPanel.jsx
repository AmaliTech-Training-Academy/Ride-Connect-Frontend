import { useEffect, useRef, useState } from 'react'
import { changePassword } from '../../services/auth'
import './ChangePasswordPanel.css'

export const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

const FIELDS = [
  {
    name: 'currentPassword',
    label: 'Current password',
    autoComplete: 'current-password',
  },
  { name: 'newPassword', label: 'New password', autoComplete: 'new-password' },
  {
    name: 'confirmPassword',
    label: 'Confirm new password',
    autoComplete: 'new-password',
  },
]

function validate({ currentPassword, newPassword, confirmPassword }) {
  const errors = {}
  if (!currentPassword) {
    errors.currentPassword = 'Enter your current password.'
  }
  if (!newPassword) {
    errors.newPassword = 'Enter a new password.'
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  } else if (newPassword === currentPassword) {
    errors.newPassword = 'Choose a password different from your current one.'
  }
  if (confirmPassword !== newPassword) {
    errors.confirmPassword = 'This does not match your new password.'
  }
  return errors
}

/**
 * Right-aligned panel for changing the password. Mounted only while open, so
 * the focus trap and form reset with it.
 */
function ChangePasswordPanel({ onClose, onChanged, returnFocusTo }) {
  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [serverError, setServerError] = useState('')
  const panelRef = useRef(null)
  const firstFieldRef = useRef(null)
  const closeRef = useRef(onClose)
  const isSavingRef = useRef(false)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previouslyFocused = returnFocusTo?.current ?? document.activeElement
    firstFieldRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!isSavingRef.current) closeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = panelRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled])',
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

  const errors = validate(values)
  const showErrors = hasAttemptedSubmit

  const updateField = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    setServerError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setHasAttemptedSubmit(true)
    if (Object.keys(errors).length > 0 || isSavingRef.current) return

    isSavingRef.current = true
    setIsSaving(true)
    setServerError('')
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      onChanged?.()
    } catch (error) {
      setServerError(
        error?.message || 'Could not change your password. Please try again.',
      )
      isSavingRef.current = false
      setIsSaving(false)
    }
  }

  return (
    <div
      className="password-panel-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose?.()
      }}
    >
      <aside
        ref={panelRef}
        className="password-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-panel-title"
      >
        <div className="password-panel-header">
          <h2 id="password-panel-title">Change password</h2>
          <button
            type="button"
            className="password-panel-close"
            aria-label="Close"
            disabled={isSaving}
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <p className="password-panel-intro">
          Use at least {MIN_PASSWORD_LENGTH} characters. You&apos;ll stay signed
          in here, and your other devices will be signed out.
        </p>

        <form className="password-panel-form" onSubmit={handleSubmit} noValidate>
          {FIELDS.map(({ name, label, autoComplete }, index) => {
            const error = showErrors ? errors[name] : ''
            const errorId = `${name}-error`
            return (
              <div className="password-panel-field" key={name}>
                <label htmlFor={name}>{label}</label>
                <input
                  ref={index === 0 ? firstFieldRef : undefined}
                  id={name}
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete={autoComplete}
                  maxLength={MAX_PASSWORD_LENGTH}
                  value={values[name]}
                  disabled={isSaving}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  onChange={(event) => updateField(name, event.target.value)}
                />
                {error && (
                  <p id={errorId} className="password-panel-field-error">
                    {error}
                  </p>
                )}
              </div>
            )
          })}

          <label className="password-panel-show">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(event) => setShowPasswords(event.target.checked)}
            />
            Show passwords
          </label>

          {serverError && (
            <p className="password-panel-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
              {serverError}
            </p>
          )}

          <div className="password-panel-actions">
            <button
              type="button"
              className="password-panel-cancel"
              disabled={isSaving}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="password-panel-submit"
              disabled={isSaving}
            >
              {isSaving ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}

export default ChangePasswordPanel
