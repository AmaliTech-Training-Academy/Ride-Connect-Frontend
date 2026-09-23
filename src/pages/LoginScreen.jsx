import { useState } from 'react'
import CarIcon from '../components/CarIcon'
import EyeIcon from '../components/EyeIcon'
import { loginUser } from '../services/auth'
import './authLayout.css'
import './LoginScreen.css'

function LoginScreen({ onCreateAccount, onLoggedIn, login = loginUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {}

    if (!email.trim()) {
      nextErrors.email = 'Please enter your work email'
    }

    if (!password) {
      nextErrors.password = 'Please enter your password'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setAuthError('')
      return
    }

    setIsLoading(true)

    login({ email, password })
      .then((user) => onLoggedIn?.(user))
      .catch(() => setAuthError('Invalid email or password'))
      .finally(() => setIsLoading(false))
  }

  return (
    <main className="auth-shell">
      <div className="auth-backdrop" aria-hidden="true" />
      <div className="auth-container">
        <div className="auth-wordmark">
          <CarIcon />
          <span>
            Ride<strong>Connect</strong>
          </span>
        </div>

        <div className="auth-card">
          {onCreateAccount && (
            <div className="auth-tabs">
              <button type="button" className="auth-tab auth-tab-active">
                Sign in
              </button>
              <button
                type="button"
                className="auth-tab"
                onClick={onCreateAccount}
              >
                Register
              </button>
            </div>
          )}

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
            />
            {errors.email && (
              <p className="field-error" role="alert">
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
              <p className="field-error" role="alert">
                {errors.password}
              </p>
            )}

            {authError && (
              <p className="login-error" role="alert">
                {authError}
              </p>
            )}

            <button
              className="submit-button"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                'Log in'
              )}
            </button>
          </form>
        </div>

        <p className="auth-footnote">
          Use your <strong>@amalitech.com</strong> email to keep it
          colleagues-only.
        </p>
      </div>
    </main>
  )
}

export default LoginScreen
