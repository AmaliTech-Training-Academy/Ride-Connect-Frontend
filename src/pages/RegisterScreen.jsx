import { useEffect, useState } from 'react'
import CarIcon from '../components/CarIcon'
import CheckIcon from '../components/CheckIcon'
import EyeIcon from '../components/EyeIcon'
import {
  MIN_PASSWORD_LENGTH,
  WORK_EMAIL_DOMAIN,
  passwordStrength,
  validateRegistration,
} from '../lib/registration'
import { DuplicateEmailError, registerUser } from '../services/auth'
import './RegisterScreen.css'

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' }

function RegisterScreen({
  onLoginClick,
  onRegistered,
  register = registerUser,
  redirectDelay = 1500,
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [duplicateEmail, setDuplicateEmail] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [status, setStatus] = useState('idle')
  const [registeredUser, setRegisteredUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  // Hold on the success state briefly so the confirmation is readable, then
  // hand off to whatever renders the ride listing.
  useEffect(() => {
    if (status !== 'success' || !onRegistered) {
      return undefined
    }

    const timer = setTimeout(() => onRegistered(registeredUser), redirectDelay)
    return () => clearTimeout(timer)
  }, [status, onRegistered, redirectDelay, registeredUser])

  function updateField(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateRegistration(form)
    setErrors(nextErrors)
    setDuplicateEmail(false)
    setSubmitError('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setStatus('submitting')

    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      setRegisteredUser(user ?? null)
      setStatus('success')
    } catch (error) {
      setStatus('idle')
      if (error instanceof DuplicateEmailError) {
        setDuplicateEmail(true)
      } else {
        setSubmitError('Something went wrong. Please try again.')
      }
    }
  }

  const strength = passwordStrength(form.password)
  const isSubmitting = status === 'submitting'

  return (
    <main className="auth-shell">
      <section className="auth-brand" aria-label="RideConnect introduction">
        <div className="auth-orb auth-orb-top" />
        <div className="auth-brand-content">
          <div className="auth-wordmark">
            <CarIcon />
            <span>RideConnect</span>
          </div>
          <h1 className="auth-headline">
            Share the drive to work. Save fuel, cut traffic, meet colleagues.
          </h1>
          <div className="auth-illustration" aria-hidden="true">
            <div className="auth-car-card">
              <CarIcon />
            </div>
            <div className="auth-avatars">
              <span>AO</span>
              <span>KM</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        {status === 'success' ? (
          <div className="register-success" role="status">
            <div className="register-success-badge">
              <CheckIcon />
            </div>
            <h2>Account created!</h2>
            <p>Taking you to Find a Ride…</p>
            <div className="register-progress" aria-hidden="true">
              <div className="register-progress-bar" />
            </div>
          </div>
        ) : (
          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <h2>Create your account</h2>
            <p className="register-intro">
              Use your work email to join your colleagues.
            </p>

            {duplicateEmail && (
              <div className="register-banner" role="alert">
                <p>An account with this email already exists.</p>
                {onLoginClick && (
                  <button
                    type="button"
                    className="register-banner-link"
                    onClick={onLoginClick}
                  >
                    Log in instead
                  </button>
                )}
              </div>
            )}

            {submitError && (
              <div className="register-banner" role="alert">
                <p>{submitError}</p>
              </div>
            )}

            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={updateField('name')}
              placeholder="Kwame Mensah"
              autoComplete="name"
              className={errors.name ? 'has-error' : ''}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p className="register-field-error" id="name-error" role="alert">
                {errors.name}
              </p>
            )}

            <label htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={updateField('email')}
              placeholder={`you@${WORK_EMAIL_DOMAIN}`}
              autoComplete="email"
              className={errors.email ? 'has-error' : ''}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : 'email-hint'}
            />
            {errors.email ? (
              <p className="register-field-error" id="email-error" role="alert">
                {errors.email}
              </p>
            ) : (
              <p className="register-hint" id="email-hint">
                Must be your @{WORK_EMAIL_DOMAIN} email
              </p>
            )}

            <label htmlFor="password">Password</label>
            <div
              className={`register-password ${errors.password ? 'has-error' : ''}`}
            >
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={updateField('password')}
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'password-error' : 'password-hint'
                }
              />
              <button
                type="button"
                className="register-visibility"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>

            {form.password && (
              <div className="register-strength" aria-hidden="true">
                <div className="register-strength-track">
                  <div
                    className={`register-strength-fill strength-${strength.score}`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
              </div>
            )}

            {errors.password ? (
              <p
                className="register-field-error"
                id="password-error"
                role="alert"
              >
                {errors.password}
              </p>
            ) : (
              <p
                className={`register-hint ${strength.score === 4 ? 'is-strong' : ''}`}
                id="password-hint"
              >
                {form.password && strength.label
                  ? strength.label
                  : `At least ${MIN_PASSWORD_LENGTH} characters`}
              </p>
            )}

            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={updateField('confirmPassword')}
              placeholder="••••••••"
              autoComplete="new-password"
              className={errors.confirmPassword ? 'has-error' : ''}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={
                errors.confirmPassword ? 'confirm-error' : undefined
              }
            />
            {errors.confirmPassword && (
              <p
                className="register-field-error"
                id="confirm-error"
                role="alert"
              >
                {errors.confirmPassword}
              </p>
            )}

            <button
              className="register-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span
                  className="register-spinner"
                  aria-label="Creating account"
                />
              ) : (
                'Create account'
              )}
            </button>

            {onLoginClick && (
              <p className="register-switch">
                Already have an account?{' '}
                <button
                  type="button"
                  className="register-link"
                  onClick={onLoginClick}
                >
                  Log in
                </button>
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  )
}

export default RegisterScreen
