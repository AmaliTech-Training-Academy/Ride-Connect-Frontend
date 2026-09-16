import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import LoginScreen from './LoginScreen'

describe('LoginScreen', () => {
  it('shows validation errors before submitting an empty form', async () => {
    const user = userEvent.setup()
    render(<LoginScreen />)

    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(screen.getByText('Please enter your work email')).toBeInTheDocument()
    expect(screen.getByText('Please enter your password')).toBeInTheDocument()
  })

  it('submits valid credentials and forwards the signed-in user', async () => {
    const user = userEvent.setup()
    const login = jest
      .fn()
      .mockResolvedValue({ email: 'kwame.mensah@amalitech.com' })
    const onLoggedIn = jest.fn()

    render(<LoginScreen login={login} onLoggedIn={onLoggedIn} />)

    await user.type(
      screen.getByLabelText(/work email/i),
      'kwame.mensah@amalitech.com',
    )
    await user.type(screen.getByLabelText(/^password$/i), 'Sup3rSecret!')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({
        email: 'kwame.mensah@amalitech.com',
        password: 'Sup3rSecret!',
      }),
    )
    await waitFor(() =>
      expect(onLoggedIn).toHaveBeenCalledWith({
        email: 'kwame.mensah@amalitech.com',
      }),
    )
  })

  it('shows an auth error when the credentials are rejected', async () => {
    const user = userEvent.setup()
    const login = jest.fn().mockRejectedValue(new Error('bad credentials'))

    render(<LoginScreen login={login} />)

    await user.type(
      screen.getByLabelText(/work email/i),
      'kwame.mensah@amalitech.com',
    )
    await user.type(screen.getByLabelText(/^password$/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(
      await screen.findByText('Invalid email or password'),
    ).toBeInTheDocument()
  })

  it('offers the create-account route and toggles password visibility', async () => {
    const user = userEvent.setup()
    const onCreateAccount = jest.fn()

    render(<LoginScreen onCreateAccount={onCreateAccount} />)

    await user.click(screen.getByRole('button', { name: /create an account/i }))
    expect(onCreateAccount).toHaveBeenCalledTimes(1)

    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: /show password/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})
