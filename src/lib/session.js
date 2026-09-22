/**
 * A minimal notifier for session expiry.
 *
 * The API layer detects a 401 and announces it here; it deliberately knows
 * nothing about React or routing. The app subscribes once and decides what
 * expiry means, which keeps state changes owned by the component tree rather
 * than by the fetch helper.
 */

const listeners = new Set()

/**
 * Registers a listener and returns the function that removes it, so callers
 * can hand the result straight back from a useEffect.
 */
export function onSessionExpired(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifySessionExpired() {
  // Copied first so a listener that unsubscribes itself cannot disturb
  // iteration, and one that throws cannot stop the others from running.
  Array.from(listeners).forEach((listener) => {
    try {
      listener()
    } catch {
      // A failing listener is not the API layer's problem.
    }
  })
}

export function resetSessionListeners() {
  listeners.clear()
}
