import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from '@jest/globals'
import { jest } from '@jest/globals'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { DuplicateEmailError } from './services/auth'
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from './services/auth'
import { apiFetch } from './lib/api'
import { notifySessionExpired, resetSessionListeners } from './lib/session'
import { fetchMyRides } from './services/rides'

jest.mock('./services/auth', () => ({
  DuplicateEmailError: class DuplicateEmailError extends Error {
    constructor(message = 'An account with this email already exists.') {
      super(message)
      this.name = 'DuplicateEmailError'
    }
  },
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  getCurrentUser: jest.fn(),
  logoutUser: jest.fn(),
}))

jest.mock('./lib/api', () => ({
  apiFetch: jest.fn(),
}))

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>,
  )
}

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
  await user.type(await screen.findByLabelText(/full name/i), name)
  await user.type(screen.getByLabelText(/work email/i), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText(/confirm password/i), password)
  await user.click(screen.getByRole('button', { name: /create account/i }))
}

describe('App', () => {
  afterEach(() => resetSessionListeners())

  beforeEach(() => {
    jest.clearAllMocks()
    getCurrentUser.mockResolvedValue(null)
    registerUser.mockImplementation(async ({ email }) => {
      if (email.toLowerCase() === TAKEN.email.toLowerCase()) {
        throw new DuplicateEmailError()
      }

      return { email: email.toLowerCase() }
    })
    loginUser.mockResolvedValue({ email: TAKEN.email })
    logoutUser.mockResolvedValue(undefined)
  })

  it('starts on the registration screen', async () => {
    renderApp()
    expect(
      await screen.findByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument()
  })

  it('rehydrates an existing session on load instead of showing the login screen', async () => {
    getCurrentUser.mockResolvedValue({ id: 'user-1', email: TAKEN.email })
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    })
    renderApp()

    expect(
      await screen.findByRole('heading', { name: /offer a ride/i }),
    ).toBeInTheDocument()
  })

  it('falls back to the registration screen when the session check fails', async () => {
    getCurrentUser.mockRejectedValue(new Error('network error'))
    renderApp()

    expect(
      await screen.findByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument()
  })

  it('lets a logged-out visitor switch from login to registration', async () => {
    const user = userEvent.setup()
    renderApp('/login')

    await user.click(
      await screen.findByRole('button', { name: 'Create an account' }),
    )

    expect(
      await screen.findByRole('heading', { name: /create your account/i }),
    ).toBeInTheDocument()
  })

  it('moves between the offer, find, and my-rides screens via the nav links', async () => {
    const user = userEvent.setup()
    const click = (name) =>
      user.click(screen.getAllByRole('button', { name })[0])
    getCurrentUser.mockResolvedValue({ id: 'user-1', email: TAKEN.email })
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    })
    renderApp()
    await screen.findByRole('heading', { name: /offer a ride/i })

    await click('My Rides')
    await screen.findAllByRole('button', { name: 'Find a Ride' })

    await click('Find a Ride')
    await screen.findByRole('heading', { name: /find a ride/i })

    await click('Offer a Ride')
    await screen.findByRole('heading', { name: /offer a ride/i })

    await click('My Rides')
    await screen.findAllByRole('button', { name: 'Find a Ride' })

    await click('Find a Ride')
    await screen.findByRole('heading', { name: /find a ride/i })

    await click('My Rides')
    await screen.findAllByRole('button', { name: 'Offer a Ride' })

    await click('Offer a Ride')
    expect(
      await screen.findByRole('heading', { name: /offer a ride/i }),
    ).toBeInTheDocument()
  })

  it('logs the user out from the account menu and returns to the login screen', async () => {
    const user = userEvent.setup()
    getCurrentUser.mockResolvedValue({ id: 'user-1', email: TAKEN.email })
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    })
    renderApp()
    await screen.findByRole('heading', { name: /offer a ride/i })

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: /logout/i }))

    expect(logoutUser).toHaveBeenCalled()
    expect(
      await screen.findByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument()
  })

  it('opens the join-requests panel for a ride the driver manages', async () => {
    const user = userEvent.setup()
    getCurrentUser.mockResolvedValue({ id: 'user-1', email: TAKEN.email })
    apiFetch.mockImplementation((path) => {
      if (path.startsWith('/api/rides?')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: 'ride-1',
                driverId: 'user-1',
                driverName: 'Ama Owusu',
                origin: 'Madina',
                destination: 'AmaliTech Office',
                departureAt: '2099-09-20T07:30:00.000Z',
                totalSeats: 4,
                availableSeats: 3,
                status: 'open',
              },
            ],
          }),
        })
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
    })
    // FindARide's own mount-time fetchMyRides() call would consume a
    // mockResolvedValueOnce before My Rides ever mounts, so this needs to
    // apply to every call.
    fetchMyRides.mockResolvedValue({
      data: {
        driving: [
          {
            id: 'ride-1',
            driverId: 'user-1',
            origin: 'Madina',
            destination: 'AmaliTech Office',
            departureAt: '2099-09-20T07:30:00.000Z',
            totalSeats: 4,
            availableSeats: 3,
            status: 'OPEN',
            pendingRequests: [
              {
                id: 'request-1',
                passengerId: 'passenger-1',
                passengerName: 'Kojo Mensah',
                createdAt: '2099-09-20T07:00:00.000Z',
              },
            ],
            confirmedPassengers: [],
          },
        ],
        pastAndCancelled: [],
        joined: [],
        joinedPastAndCancelled: [],
      },
    })
    renderApp('/find-a-ride')

    await user.click(await screen.findByRole('button', { name: 'Manage' }))

    expect(
      await screen.findByRole('heading', { name: /join requests/i }),
    ).toBeInTheDocument()
  })

  it('redirects to login when visiting a protected route while logged out', async () => {
    renderApp('/my-rides')

    expect(
      await screen.findByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument()
  })

  it('AC1 and AC3 - registers a new colleague and takes them to the ride listing', async () => {
    const user = userEvent.setup()
    const email = freshEmail()
    renderApp()

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
    renderApp()

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
    renderApp()

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
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Log in' }))
    await user.type(screen.getByLabelText('Work email'), TAKEN.email)
    await user.type(screen.getByLabelText('Password'), TAKEN.password)
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(
      await screen.findByRole('heading', { name: /offer a ride/i }),
    ).toBeInTheDocument()
  })

  it('returns to login when the API layer reports an expired session', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Log in' }))
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
    const { unmount } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Log in' }))
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
    renderApp()

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
