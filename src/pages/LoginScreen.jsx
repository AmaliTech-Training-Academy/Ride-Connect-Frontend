import { useState } from 'react'
import CarIcon from '../components/CarIcon'
import EyeIcon from '../components/EyeIcon'
import { InvalidCredentialsError, loginUser } from '../services/auth'
import './LoginScreen.css'

function LoginScreen({ onRegisterClick, onLoggedIn, login = loginUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {}

    if (!email.trim()) {
      nextErrors.email = 'Please enter your work email'
    }

    if (!password) {
      nextErrors.password = 'Please enter your password'
    }

    setErrors(nextErrors)
    setAuthError('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsLoading(true)

    try {
      const user = await login({ email: email.trim(), password })
      onLoggedIn?.(user)
    } catch (error) {
      // The same message for an unknown email and a wrong password, so the
      // form never reveals which of the two was wrong.
      setAuthError(
        error instanceof InvalidCredentialsError
          ? 'Invalid email or password'
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="brand-panel" aria-label="RideConnect introduction">
        <div className="orb orb-top" />
        <div className="orb orb-bottom" />
        <div className="brand-content">
          <div className="brand">
            <CarIcon />
            <span>RideConnect</span>
          </div>
          <h1>
            Share the drive to work. Save fuel, cut traffic, meet colleagues.
          </h1>
          <div className="ride-illustration" aria-hidden="true">
            <div className="car-card">
              <CarIcon />
            </div>
            <div className="avatars">
              <span>AO</span>
              <span>KM</span>
            </div>
          </div>
        </div>
      </section>

      <section className="form-panel">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h2>Welcome back</h2>
          <p className="intro">
            Log in with your work account to find or offer a ride.
          </p>

          <label htmlFor="email">Work email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className={errors.email ? 'has-error' : ''}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
          />
          {errors.email && (
            <p className="field-error" id="login-email-error" role="alert">
              {errors.email}
            </p>
          )}

          <label htmlFor="password">Password</label>
          <div
            className={`password-field ${errors.password ? 'has-error' : ''}`}
          >
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? 'login-password-error' : undefined
              }
            />
            <button
              type="button"
              className="visibility-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon hidden={showPassword} />
            </button>
          </div>
          {errors.password && (
            <p className="field-error" id="login-password-error" role="alert">
              {errors.password}
            </p>
          )}

          {authError && (
            <p className="login-error" role="alert">
              {authError}
            </p>
          )}

          <button className="submit-button" type="submit" disabled={isLoading}>
            {isLoading ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              'Log in'
            )}
          </button>
          {onRegisterClick && (
            <p className="signup">
              New to RideConnect?{' '}
              <button
                type="button"
                className="signup-link"
                onClick={onRegisterClick}
              >
                Create an account
              </button>
            </p>
          )}
        </form>
      </section>
    </main>
  )
}

export default LoginScreen
