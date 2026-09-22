const API_BASE_URL =
  globalThis.__VITE_API_BASE_URL__ ||
  globalThis.process?.env?.VITE_API_BASE_URL ||
  ''

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  return response
}
