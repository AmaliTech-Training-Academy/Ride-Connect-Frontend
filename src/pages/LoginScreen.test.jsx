import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LoginScreen from './LoginScreen'
import { InvalidCredentialsError } from '../services/auth'

const VALID = { email: 'kwame.mensah@amalitech.com', password: 'Sup3rSecret!' }

function setup(props = {}) {
  const login = props.login ?? vi.fn().mockResolvedValue({ email: VALID.email })
  const utils = render(<LoginScreen login={login} {...props} />)
  return { ...utils, login, user: userEvent.setup() }
}

async function fillForm(user, overrides = {}) {
  const values = { ...VALID, ...overrides }

  await user.clear(screen.getByLabelText(/work email/i))
  if (values.email) {
    await user.type(screen.getByLabelText(/work email/i), values.email)
  }
  await user.clear(screen.getByLabelText('Password'))
  if (values.password) {
    await user.type(screen.getByLabelText('Password'), values.password)
  }
}

function submit(user) {
  return user.click(screen.getByRole('button', { name: /log in/i }))
}

describe('LoginScreen', () => {
  describe('AC3 - a registered user can log in and is taken to the ride listing', () => {
    it('calls the login service with the trimmed credentials', async () => {
      const { login, user } = setup()

      await fillForm(user, { email: `  ${VALID.email}  ` })
      await submit(user)

      await waitFor(() => expect(login).toHaveBeenCalledTimes(1))
      expect(login).toHaveBeenCalledWith(VALID)
    })

    it('hands the authenticated user to the caller on success', async () => {
      const onLoggedIn = vi.fn()
      const { user } = setup({ onLoggedIn })

      await fillForm(user)
      await submit(user)

      await waitFor(() =>
        expect(onLoggedIn).toHaveBeenCalledWith({ email: VALID.email }),
      )
    })

    it('does not redirect while the request is still pending', async () => {
      const onLoggedIn = vi.fn()
      let resolveLogin
      const login = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve
          }),
      )
      const { user } = setup({ login, onLoggedIn })

      await fillForm(user)
      await submit(user)

      expect(onLoggedIn).not.toHaveBeenCalled()
      resolveLogin({ email: VALID.email })
      await waitFor(() => expect(onLoggedIn).toHaveBeenCalled())
    })

    it('does not redirect when the credentials are rejected', async () => {
      const onLoggedIn = vi.fn()
      const login = vi.fn().mockRejectedValue(new InvalidCredentialsError())
      const { user } = setup({ login, onLoggedIn })

      await fillForm(user)
      await submit(user)

      expect(
        await screen.findByText('Invalid email or password'),
      ).toBeInTheDocument()
      expect(onLoggedIn).not.toHaveBeenCalled()
    })
  })

  describe('AC4 - an incorrect password does not reveal which field is wrong', () => {
    it('shows the generic message for a wrong password', async () => {
      const login = vi.fn().mockRejectedValue(new InvalidCredentialsError())
      const { user } = setup({ login })

      await fillForm(user, { password: 'WrongPassword1!' })
      await submit(user)

      expect(
        await screen.findByText('Invalid email or password'),
      ).toBeInTheDocument()
    })

    it('shows the identical message for an unknown email', async () => {
      const login = vi.fn().mockRejectedValue(new InvalidCredentialsError())
      const { user } = setup({ login })

      await fillForm(user, { email: 'nobody@amalitech.com' })
      await submit(user)

      expect(
        await screen.findByText('Invalid email or password'),
      ).toBeInTheDocument()
    })

    it('never names the email or the password field in the failure message', async () => {
      const login = vi.fn().mockRejectedValue(new InvalidCredentialsError())
      const { user } = setup({ login })

      await fillForm(user)
      await submit(user)

      const message = await screen.findByText('Invalid email or password')
      expect(message.textContent).not.toMatch(
        /incorrect password|no account|not found/i,
      )
    })

    it('does not mark either field as invalid on an auth failure', async () => {
      const login = vi.fn().mockRejectedValue(new InvalidCredentialsError())
      const { user } = setup({ login })

      await fillForm(user)
      await submit(user)

      await screen.findByText('Invalid email or password')
      expect(screen.getByLabelText(/work email/i)).toHaveAttribute(
        'aria-invalid',
        'false',
      )
      expect(screen.getByLabelText('Password')).toHaveAttribute(
        'aria-invalid',
        'false',
      )
    })

    it('announces the failure to assistive technology', async () => {
      const login = vi.fn().mockRejectedValue(new InvalidCredentialsError())
      const { user } = setup({ login })

      await fillForm(user)
      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Invalid email or password',
      )
    })

    it('distinguishes an unexpected failure from bad credentials', async () => {
      const login = vi.fn().mockRejectedValue(new Error('network down'))
      const { user } = setup({ login })

      await fillForm(user)
      await submit(user)

      expect(
        await screen.findByText('Something went wrong. Please try again.'),
      ).toBeInTheDocument()
    })
  })

  describe('form behaviour', () => {
    it('requires both fields before calling the service', async () => {
      const { login, user } = setup()

      await submit(user)

      expect(
        await screen.findByText('Please enter your work email'),
      ).toBeInTheDocument()
      expect(screen.getByText('Please enter your password')).toBeInTheDocument()
      expect(login).not.toHaveBeenCalled()
    })

    it('clears a previous auth error when the form is resubmitted', async () => {
      const login = vi
        .fn()
        .mockRejectedValueOnce(new InvalidCredentialsError())
        .mockResolvedValueOnce({ email: VALID.email })
      const { user } = setup({ login })

      await fillForm(user)
      await submit(user)
      expect(
        await screen.findByText('Invalid email or password'),
      ).toBeInTheDocument()

      await submit(user)

      await waitFor(() =>
        expect(
          screen.queryByText('Invalid email or password'),
        ).not.toBeInTheDocument(),
      )
    })

    it('re-enables the submit button after a failure', async () => {
      const login = vi.fn().mockRejectedValue(new InvalidCredentialsError())
      const { user } = setup({ login })

      await fillForm(user)
      await submit(user)

      await screen.findByText('Invalid email or password')
      expect(screen.getByRole('button', { name: /log in/i })).toBeEnabled()
    })

    it('toggles password visibility', async () => {
      const { user } = setup()

      const password = screen.getByLabelText('Password')
      expect(password).toHaveAttribute('type', 'password')

      await user.click(screen.getByRole('button', { name: /show password/i }))
      expect(password).toHaveAttribute('type', 'text')
    })

    it('lets the user switch to the registration screen', async () => {
      const onRegisterClick = vi.fn()
      const { user } = setup({ onRegisterClick })

      await user.click(
        screen.getByRole('button', { name: /create an account/i }),
      )
      expect(onRegisterClick).toHaveBeenCalledTimes(1)
    })

    it('links validation errors to their fields for assistive technology', async () => {
      const { user } = setup()

      await submit(user)

      await waitFor(() =>
        expect(screen.getByLabelText(/work email/i)).toHaveAttribute(
          'aria-invalid',
          'true',
        ),
      )
      expect(screen.getByLabelText(/work email/i)).toHaveAccessibleDescription(
        'Please enter your work email',
      )
    })
  })
})
