import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from '@jest/globals'

globalThis.__VITE_API_BASE_URL__ = 'https://52.213.178.166.nip.io/api'
globalThis.process.env.VITE_API_BASE_URL = 'https://52.213.178.166.nip.io/api'

afterEach(() => {
  cleanup()
})
