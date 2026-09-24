import { notifySessionExpired } from './session'

const API_BASE_URL =
  globalThis.__VITE_API_BASE_URL__ ||
  globalThis.process?.env?.VITE_API_BASE_URL ||
  ''

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    // Per-user state (open requests, seat counts) changes on every action, so
    // a refresh must never be answered from the browser's HTTP cache.
    cache: 'no-store',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })

  // Session expiry is an app-wide concern, so it is announced once here
  // rather than re-handled at every call site. This only emits an event; what
  // expiry means is decided by whoever subscribes.
  if (response.status === 401) {
    notifySessionExpired()
  }

  return response
}
