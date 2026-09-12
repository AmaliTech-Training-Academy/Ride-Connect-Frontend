import { useState } from 'react'
import CarIcon from '../components/CarIcon'
import EyeIcon from '../components/EyeIcon'
import './LoginScreen.css'

function LoginScreen() {
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

    window.setTimeout(() => {
      setIsLoading(false)
      setAuthError('Invalid email or password')
    }, 1200)
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

          <button className="submit-button" type="submit" disabled={isLoading}>
            {isLoading ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              'Log in'
            )}
          </button>
          <p className="signup">
            New to RideConnect? <a href="#create-account">Create an account</a>
          </p>
        </form>
      </section>
    </main>
  )
}

export default LoginScreen
