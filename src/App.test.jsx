import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import App from './App'
import { DuplicateEmailError, loginUser, registerUser } from './services/auth'

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

const TAKEN = { email: 'kwame.mensah@amalitech.com', password: 'Sup3rSecret!' }

function freshEmail() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2)}@amalitech.com`
}

async function fillForm(user, { name, email, password }) {
  await user.type(screen.getByLabelText(/full name/i), name)
  await user.type(screen.getByLabelText(/work email/i), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText(/confirm password/i), password)
  await user.click(screen.getByRole('button', { name: /create account/i }))
}

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    registerUser.mockImplementation(async ({ email }) => {
      if (email.toLowerCase() === TAKEN.email.toLowerCase()) {
        throw new DuplicateEmailError()
      }

      return { email: email.toLowerCase() }
    })

    loginUser.mockImplementation(async ({ email, password }) => {
      if (
        email.toLowerCase() === TAKEN.email.toLowerCase() &&
        password === TAKEN.password
      ) {
        return { id: 'colleague-1', email: TAKEN.email.toLowerCase() }
      }

      throw new Error('Invalid email or password')
    })
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
})
