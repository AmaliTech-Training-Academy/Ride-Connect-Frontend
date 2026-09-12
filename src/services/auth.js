/**
 * Thrown when a login fails. The message is deliberately identical for an
 * unknown email and a wrong password so the response cannot be used to work
 * out which accounts exist.
 */
export class InvalidCredentialsError extends Error {
  constructor(message = 'Invalid email or password') {
    super(message)
    this.name = 'InvalidCredentialsError'
  }
}

/**
 * The backend endpoints do not exist yet, so this resolves against an
 * in-memory store to keep the screen demonstrable. Replace the body with the
 * real request once POST /auth/login is available; what the screen depends on
 * is the thrown error type, not the transport.
 *
 * Passwords are held in plain text here only because nothing leaves the
 * browser. Hashing is the backend's responsibility and is covered by its own
 * acceptance criterion.
 */
export const accounts = new Map([
  ['kwame.mensah@amalitech.com', 'Sup3rSecret!'],
])

const LATENCY_MS = 600

export function normalise(email) {
  return email.trim().toLowerCase()
}

export function pause() {
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
}

export async function loginUser({ email, password }) {
  await pause()

  const key = normalise(email)
  if (!accounts.has(key) || accounts.get(key) !== password) {
    throw new InvalidCredentialsError()
  }

  return { email: key }
}
