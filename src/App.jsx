import { useState } from 'react'
import './App.css'

function CarIcon() {
  return (
    <svg className="car-icon" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M5.2 18.3h17.6a2 2 0 0 0 2-2v-3.1l-2.5-5.7a2 2 0 0 0-1.8-1.2H7.5a2 2 0 0 0-1.8 1.2l-2.5 5.7v3.1a2 2 0 0 0 2 2Z" />
      <path d="M3.2 13.3h21.6M7.7 18.3v2.2M20.3 18.3v2.2M7.1 11h13.8" />
      <circle cx="7.3" cy="15.8" r="1.2" />
      <circle cx="20.7" cy="15.8" r="1.2" />
    </svg>
  )
}

function EyeIcon({ hidden }) {
  return (
    <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
      {hidden ? (
        <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 9 5 9 7s-3.8 7-9 7a9.8 9.8 0 0 1-4.5-1.1M5.2 8.2C3.8 9.5 3 11 3 12c0 2 3.8 7 9 7" />
      ) : (
        <>
          <path d="M3 12c0-2 3.8-7 9-7s9 5 9 7-3.8 7-9 7-9-5-9-7Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
    </svg>
  )
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!email.trim()) nextErrors.email = 'Please enter your work email'
    if (!password) nextErrors.password = 'Please enter your password'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setIsLoading(true)
    window.setTimeout(() => setIsLoading(false), 1200)
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
          <h1>Share the drive to work. Save fuel, cut traffic, meet colleagues.</h1>
          <div className="ride-illustration" aria-hidden="true">
            <div className="car-card"><CarIcon /></div>
            <div className="avatars"><span>AO</span><span>KM</span></div>
          </div>
        </div>
      </section>

      <section className="form-panel">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h2>Welcome back</h2>
          <p className="intro">Log in with your work account to find or offer a ride.</p>

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
          {errors.email && <p className="field-error" role="alert">{errors.email}</p>}

          <label htmlFor="password">Password</label>
          <div className={`password-field ${errors.password ? 'has-error' : ''}`}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button type="button" className="visibility-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              <EyeIcon hidden={showPassword} />
            </button>
          </div>
          {errors.password && <p className="field-error" role="alert">{errors.password}</p>}

          <button className="submit-button" type="submit" disabled={isLoading}>
            {isLoading ? <span className="spinner" aria-hidden="true" /> : 'Log in'}
          </button>
          <p className="signup">New to RideConnect? <a href="#create-account">Create an account</a></p>
        </form>
      </section>
    </main>
  )
}

export default App
