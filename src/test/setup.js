import { TextDecoder, TextEncoder } from 'node:util'
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from '@jest/globals'

// jsdom doesn't provide these globals, but react-router-dom's dependencies expect them.
globalThis.TextEncoder ??= TextEncoder
globalThis.TextDecoder ??= TextDecoder
// jsdom has no layout, so it only logs "Not implemented" for scrolling.
window.scrollTo = () => {}

globalThis.__VITE_API_BASE_URL__ = 'https://52.213.178.166.nip.io'
globalThis.process.env.VITE_API_BASE_URL = 'https://52.213.178.166.nip.io'

afterEach(() => {
  cleanup()
})
