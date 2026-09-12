import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import RegisterScreen from './RegisterScreen'
import { DuplicateEmailError } from '../services/auth'

const VALID = {
  name: 'Kwame Mensah',
  email: 'kwame.mensah@amalitech.com',
  password: 'Sup3rSecret!',
}

function setup(props = {}) {
  const register =
    props.register ?? vi.fn().mockResolvedValue({ email: VALID.email })
  const utils = render(
    <RegisterScreen register={register} redirectDelay={0} {...props} />,
  )
  return { ...utils, register, user: userEvent.setup() }
}

async function fillField(user, label, value) {
  const field = screen.getByLabelText(label)
  await user.clear(field)
  // user.type rejects an empty string, and clearing already leaves it empty.
  if (value) {
    await user.type(field, value)
  }
}

async function fillForm(user, overrides = {}) {
  const values = { ...VALID, confirmPassword: VALID.password, ...overrides }

  await fillField(user, /full name/i, values.name)
  await fillField(user, /work email/i, values.email)
  await fillField(user, 'Password', values.password)
  await fillField(user, /confirm password/i, values.confirmPassword)
}

function submit(user) {
  return user.click(screen.getByRole('button', { name: /create account/i }))
}

describe('RegisterScreen', () => {
  describe('AC1 - a new user can register with name, work email and a password of at least 8 characters', () => {
    it('renders the three required fields plus confirmation', () => {
      setup()

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/work email/i)).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('submits the trimmed name, email and password when the form is valid', async () => {
      const { register, user } = setup()

      await fillForm(user, { name: '  Kwame Mensah  ' })
      await submit(user)

      await waitFor(() => expect(register).toHaveBeenCalledTimes(1))
      expect(register).toHaveBeenCalledWith({
        name: 'Kwame Mensah',
        email: VALID.email,
        password: VALID.password,
      })
    })

    it('does not call the API when a field is invalid', async () => {
      const { register, user } = setup()

      await fillForm(user, { name: '' })
      await submit(user)

      expect(
        await screen.findByText('Please enter your full name'),
      ).toBeInTheDocument()
      expect(register).not.toHaveBeenCalled()
    })

    it('rejects a password shorter than 8 characters', async () => {
      const { register, user } = setup()

      await fillForm(user, { password: 'Sh0rt!', confirmPassword: 'Sh0rt!' })
      await submit(user)

      expect(
        await screen.findByText('Password must be at least 8 characters'),
      ).toBeInTheDocument()
      expect(register).not.toHaveBeenCalled()
    })

    it('rejects a non-work email address', async () => {
      const { register, user } = setup()

      await fillForm(user, { email: 'kwame.mensah@gmail.com' })
      await submit(user)

      expect(
        await screen.findByText('Please use your @amalitech.com work email'),
      ).toBeInTheDocument()
      expect(register).not.toHaveBeenCalled()
    })

    it('rejects a confirmation that does not match', async () => {
      const { register, user } = setup()

      await fillForm(user, { confirmPassword: 'Different1!' })
      await submit(user)

      expect(
        await screen.findByText("Passwords don't match"),
      ).toBeInTheDocument()
      expect(register).not.toHaveBeenCalled()
    })

    it('shows every validation error at once', async () => {
      const { user } = setup()

      await submit(user)

      expect(
        await screen.findByText('Please enter your full name'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Please enter your work email'),
      ).toBeInTheDocument()
      expect(screen.getByText('Please enter a password')).toBeInTheDocument()
      expect(
        screen.getByText('Please confirm your password'),
      ).toBeInTheDocument()
    })
  })

  describe('AC2 - registering with an already-used email returns a clear error', () => {
    it('shows the duplicate account message when the API reports a conflict', async () => {
      const register = vi.fn().mockRejectedValue(new DuplicateEmailError())
      const { user } = setup({ register })

      await fillForm(user)
      await submit(user)

      expect(
        await screen.findByText('An account with this email already exists.'),
      ).toBeInTheDocument()
    })

    it('offers a route to log in instead', async () => {
      const onLoginClick = vi.fn()
      const register = vi.fn().mockRejectedValue(new DuplicateEmailError())
      const { user } = setup({ register, onLoginClick })

      await fillForm(user)
      await submit(user)

      await user.click(
        await screen.findByRole('button', { name: /log in instead/i }),
      )
      expect(onLoginClick).toHaveBeenCalledTimes(1)
    })

    it('announces the duplicate error to assistive technology', async () => {
      const register = vi.fn().mockRejectedValue(new DuplicateEmailError())
      const { user } = setup({ register })

      await fillForm(user)
      await submit(user)

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(
        'An account with this email already exists.',
      )
    })

    it('clears the duplicate error when the form is resubmitted', async () => {
      const register = vi
        .fn()
        .mockRejectedValueOnce(new DuplicateEmailError())
        .mockResolvedValueOnce({ email: 'new@amalitech.com' })
      const { user } = setup({ register })

      await fillForm(user)
      await submit(user)
      expect(
        await screen.findByText('An account with this email already exists.'),
      ).toBeInTheDocument()

      await fillForm(user, { email: 'new@amalitech.com' })
      await submit(user)

      await waitFor(() =>
        expect(
          screen.queryByText('An account with this email already exists.'),
        ).not.toBeInTheDocument(),
      )
    })

    it('distinguishes an unexpected failure from a duplicate', async () => {
      const register = vi.fn().mockRejectedValue(new Error('network down'))
      const { user } = setup({ register })

      await fillForm(user)
      await submit(user)

      expect(
        await screen.findByText('Something went wrong. Please try again.'),
      ).toBeInTheDocument()
      expect(
        screen.queryByText('An account with this email already exists.'),
      ).not.toBeInTheDocument()
    })
  })

  describe('AC3 - a registered user is taken on to the ride listing', () => {
    it('confirms the account was created', async () => {
      const { user } = setup()

      await fillForm(user)
      await submit(user)

      expect(await screen.findByText('Account created!')).toBeInTheDocument()
      expect(screen.getByText('Taking you to Find a Ride…')).toBeInTheDocument()
    })

    it('hands off to the caller so it can show the ride listing', async () => {
      const onRegistered = vi.fn()
      const { user } = setup({ onRegistered })

      await fillForm(user)
      await submit(user)

      await waitFor(() => expect(onRegistered).toHaveBeenCalledTimes(1))
    })

    it('does not hand off while registration is still pending', async () => {
      const onRegistered = vi.fn()
      let resolveRegister
      const register = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveRegister = resolve
          }),
      )
      const { user } = setup({ register, onRegistered })

      await fillForm(user)
      await submit(user)

      expect(onRegistered).not.toHaveBeenCalled()
      resolveRegister({ email: VALID.email })
      await waitFor(() => expect(onRegistered).toHaveBeenCalled())
    })
  })

  describe('form behaviour', () => {
    it('disables the submit button while the request is in flight', async () => {
      let resolveRegister
      const register = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveRegister = resolve
          }),
      )
      const { user } = setup({ register })

      await fillForm(user)
      await submit(user)

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /creating account/i }),
        ).toBeDisabled(),
      )
      resolveRegister({ email: VALID.email })
    })

    it('toggles password visibility', async () => {
      const { user } = setup()

      const password = screen.getByLabelText('Password')
      expect(password).toHaveAttribute('type', 'password')

      await user.click(screen.getByRole('button', { name: /show password/i }))
      expect(password).toHaveAttribute('type', 'text')

      await user.click(screen.getByRole('button', { name: /hide password/i }))
      expect(password).toHaveAttribute('type', 'password')
    })

    it('lets the user switch to the login screen', async () => {
      const onLoginClick = vi.fn()
      const { user } = setup({ onLoginClick })

      await user.click(screen.getByRole('button', { name: /^log in$/i }))
      expect(onLoginClick).toHaveBeenCalledTimes(1)
    })

    it('hides the log in link when there is nowhere to go', () => {
      setup({ onLoginClick: undefined })

      expect(
        screen.queryByRole('button', { name: /^log in$/i }),
      ).not.toBeInTheDocument()
    })

    it('hides the log in instead link on a duplicate when there is nowhere to go', async () => {
      const register = vi.fn().mockRejectedValue(new DuplicateEmailError())
      const { user } = setup({ register, onLoginClick: undefined })

      await fillForm(user)
      await submit(user)

      expect(
        await screen.findByText('An account with this email already exists.'),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /log in instead/i }),
      ).not.toBeInTheDocument()
    })

    it('marks invalid fields for assistive technology', async () => {
      const { user } = setup()

      await submit(user)

      await waitFor(() =>
        expect(screen.getByLabelText(/full name/i)).toHaveAttribute(
          'aria-invalid',
          'true',
        ),
      )
      expect(screen.getByLabelText(/full name/i)).toHaveAccessibleDescription(
        'Please enter your full name',
      )
    })

    it('describes the email and password rules before any error', () => {
      setup()

      expect(screen.getByLabelText(/work email/i)).toHaveAccessibleDescription(
        'Must be your @amalitech.com email',
      )
      expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
        'At least 8 characters',
      )
    })
  })
})
