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

/**
 * The backend endpoint does not exist yet, so this resolves against an
 * in-memory store to keep the screen demonstrable. Replace the body with the
 * real request once POST /auth/register is available; what the screen depends
 * on is the thrown error type, not the transport.
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

export async function registerUser({ email, password }) {
  await pause()

  const key = normalise(email)
  if (accounts.has(key)) {
    throw new DuplicateEmailError()
  }

  accounts.set(key, password)
  return { email: key }
}
