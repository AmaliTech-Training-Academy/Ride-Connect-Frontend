import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

const KNOWN = { email: 'kwame.mensah@amalitech.com', password: 'Sup3rSecret!' }

async function logIn(user, credentials = KNOWN) {
  await user.type(screen.getByLabelText(/work email/i), credentials.email)
  await user.type(screen.getByLabelText('Password'), credentials.password)
  await user.click(screen.getByRole('button', { name: /log in/i }))
}

describe('App', () => {
  it('starts on the login screen', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument()
  })

  it('AC3 - sends a registered user to the ride listing after logging in', async () => {
    const user = userEvent.setup()
    render(<App />)

    await logIn(user)

    expect(
      await screen.findByRole(
        'heading',
        { name: /find a ride/i },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(`Signed in as ${KNOWN.email}`)).toBeInTheDocument()
  })

  it('AC4 - keeps a user with the wrong password on the login screen', async () => {
    const user = userEvent.setup()
    render(<App />)

    await logIn(user, { ...KNOWN, password: 'WrongPassword1!' })

    expect(
      await screen.findByText('Invalid email or password', undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /find a ride/i }),
    ).not.toBeInTheDocument()
  })

  it('returns to the login screen on logout', async () => {
    const user = userEvent.setup()
    render(<App />)

    await logIn(user)
    await screen.findByRole(
      'heading',
      { name: /find a ride/i },
      { timeout: 3000 },
    )

    await user.click(screen.getByRole('button', { name: /log out/i }))

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /welcome back/i }),
      ).toBeInTheDocument(),
    )
  })
})
