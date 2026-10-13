import { useEffect, useState } from 'react'

/*
 * One breakpoint, shared with the stylesheets. The bottom navigation and the
 * CSS that collapses the header must switch at the same width, so the value
 * lives here and is mirrored by `@media (max-width: 680px)` rules.
 */
export const MOBILE_QUERY = '(max-width: 680px)'

/**
 * True while the viewport is phone-sized.
 *
 * Read through matchMedia rather than a resize listener so it flips at exactly
 * the width the CSS does, and so it costs nothing between breakpoint crossings.
 * Environments without matchMedia (jsdom, for one) report desktop.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => globalThis.matchMedia?.(MOBILE_QUERY)?.matches ?? false,
  )

  useEffect(() => {
    const query = globalThis.matchMedia?.(MOBILE_QUERY)
    if (!query?.addEventListener) return undefined

    const handleChange = (event) => setIsMobile(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
