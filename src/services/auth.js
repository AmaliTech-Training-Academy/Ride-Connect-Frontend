import { createAuthClient } from 'better-auth/react'

const apiBaseURL =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_API_BASE_URL ?? '')
    : ''

let authClient = null

if (typeof Request !== 'undefined' && apiBaseURL) {
  authClient = createAuthClient({
    baseURL: `${apiBaseURL}/api/auth`,
  })
}

/**
 * Thrown when the backend rejects a registration because the email is taken.
 * Kept as its own type so the screen can show the "log in instead" prompt
 * rather than a generic failure.
 */
export class DuplicateEmailError extends Error {
  constructor(message = 'An account with this email already exists.') {
    super(message)
    this.name = 'DuplicateEmailError'
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message = 'Invalid email or password') {
    super(message)
    this.name = 'InvalidCredentialsError'
  }
}

export async function registerUser({ name, email, password }) {
  if (!authClient || !apiBaseURL) {
    throw new Error('Authentication backend is not configured.')
  }

  const result = await authClient.signUp.email({ name, email, password })

  if (result.error?.status === 409) {
    throw new DuplicateEmailError()
  }

  if (result.error) {
    throw new Error('Registration failed')
  }

  return result.data?.user ?? result.data
}

export async function loginUser({ email, password }) {
  if (!authClient || !apiBaseURL) {
    throw new Error('Authentication backend is not configured.')
  }

  const result = await authClient.signIn.email({ email, password })

  if (result.error?.status === 401 || result.error?.status === 404) {
    throw new InvalidCredentialsError()
  }

  if (result.error) {
    throw new Error('Login failed')
  }

  return result.data?.user ?? result.data
}
