import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from '@jest/globals'
import { jest } from '@jest/globals'
import App from './App'
import { DuplicateEmailError } from './services/auth'
import { loginUser, registerUser } from './services/auth'
import { apiFetch } from './lib/api'
import { notifySessionExpired, resetSessionListeners } from './lib/session'

jest.mock('./services/auth', () => ({
  DuplicateEmailError: class DuplicateEmailError extends Error {
    constructor(message = 'An account with this email already exists.') {
      super(message)
      this.name = 'DuplicateEmailError'
    }
  },
  registerUser: jest.fn(),
  loginUser: jest.fn(),
}))

jest.mock('./lib/api', () => ({
  apiFetch: jest.fn(),
}))

// FindARide reads the viewer's own rides to mark ones already requested.
jest.mock('./services/rides', () => ({
  fetchMyRides: jest.fn(() => Promise.resolve({ data: { joined: [] } })),
  requestToJoinRide: jest.fn(),
}))

const TAKEN = { email: 'kwame.mensah@amalitech.com', password: 'Sup3rSecret!' }

function freshEmail() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2)}@amalitech.com`
}

function futureISODate(daysAhead) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function fillForm(user, { name, email, password }) {
  await user.type(screen.getByLabelText(/full name/i), name)
  await user.type(screen.getByLabelText(/work email/i), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText(/confirm password/i), password)
  await user.click(screen.getByRole('button', { name: /create account/i }))
}

describe('App', () => {
  afterEach(() => resetSessionListeners())

  beforeEach(() => {
    jest.clearAllMocks()
    registerUser.mockImplementation(async ({ email }) => {
      if (email.toLowerCase() === TAKEN.email.toLowerCase()) {
        throw new DuplicateEmailError()
      }

      return { email: email.toLowerCase() }
    })
    loginUser.mockResolvedValue({ email: TAKEN.email })
  })

  it('starts on the registration screen', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument()
  })

  it('AC1 and AC3 - registers a new colleague and takes them to the ride listing', async () => {
    const user = userEvent.setup()
    const email = freshEmail()
    render(<App />)

    await fillForm(user, { name: 'Ama Owusu', email, password: 'Sup3rSecret!' })

    expect(
      await screen.findByRole(
        'heading',
        { name: /offer a ride/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Post Ride' }),
    ).toBeInTheDocument()
  }, 10000)

  it('AC2 - reports an email that is already registered', async () => {
    const user = userEvent.setup()
    render(<App />)

    await fillForm(user, {
      name: 'Kwame Mensah',
      email: TAKEN.email,
      password: TAKEN.password,
    })

    expect(
      await screen.findByText(
        'An account with this email already exists.',
        undefined,
        {
          timeout: 5000,
        },
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /offer a ride/i }),
    ).not.toBeInTheDocument()
  })

  it('AC1 - keeps an invalid form on the registration screen', async () => {
    const user = userEvent.setup()
    render(<App />)

    await fillForm(user, {
      name: 'Ama Owusu',
      email: freshEmail(),
      password: 'Sh0rt!',
    })

    expect(
      await screen.findByText('Password must be at least 8 characters'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /offer a ride/i }),
    ).not.toBeInTheDocument()
  })

  it('logs an existing colleague in and opens the post-ride screen', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await user.type(screen.getByLabelText('Work email'), TAKEN.email)
    await user.type(screen.getByLabelText('Password'), TAKEN.password)
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(
      await screen.findByRole('heading', { name: /offer a ride/i }),
    ).toBeInTheDocument()
  })

  it('returns to login when the API layer reports an expired session', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await user.type(screen.getByLabelText('Work email'), TAKEN.email)
    await user.type(screen.getByLabelText('Password'), TAKEN.password)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await screen.findByRole('heading', { name: /offer a ride/i })

    // No screen handles this itself - the API layer announces it once and App
    // is the only subscriber.
    act(() => notifySessionExpired())

    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeInTheDocument()
  })

  it('stops listening for expiry once unmounted', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await user.type(screen.getByLabelText('Work email'), TAKEN.email)
    await user.type(screen.getByLabelText('Password'), TAKEN.password)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await screen.findByRole('heading', { name: /offer a ride/i })

    unmount()

    expect(() => notifySessionExpired()).not.toThrow()
  })

  it('opens the find-ride screen after posting a ride successfully', async () => {
    const user = userEvent.setup()
    const email = freshEmail()
    apiFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: { id: 'ride-1' } }),
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
    render(<App />)

    await fillForm(user, { name: 'Ama Owusu', email, password: 'Sup3rSecret!' })
    await screen.findByRole(
      'heading',
      { name: /offer a ride/i },
      { timeout: 5000 },
    )

    await user.type(screen.getByLabelText('Origin'), 'Kumasi')
    fireEvent.change(screen.getByLabelText('Departure date'), {
      target: { value: futureISODate(3) },
    })
    fireEvent.change(screen.getByLabelText('Departure time'), {
      target: { value: '08:30' },
    })
    await user.click(screen.getByRole('button', { name: 'Post Ride' }))

    expect(
      await screen.findByRole('heading', { name: /find a ride/i }),
    ).toBeInTheDocument()
  }, 10000)
})
