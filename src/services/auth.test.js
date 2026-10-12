import { describe, expect, it } from '@jest/globals'
import {
  DuplicateEmailError,
  EmailDomainNotAllowedError,
  InvalidCredentialsError,
  changePassword,
  changePasswordErrorMessage,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  signUpError,
} from './auth'

describe('signUpError', () => {
  it('recognises the code the deployed backend actually sends', () => {
    // USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL, not the bare code: an exact
    // comparison never matched and left the status checks doing the work.
    expect(
      signUpError({
        code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
        status: 422,
        message: 'User already exists. Use another email.',
      }),
    ).toBeInstanceOf(DuplicateEmailError)
  })

  it('recognises a taken email from the error code', () => {
    // The code is what the backend actually guarantees.
    expect(
      signUpError({
        code: 'USER_ALREADY_EXISTS',
        status: 422,
        message: 'User already exists. Use another email.',
      }),
    ).toBeInstanceOf(DuplicateEmailError)
  })

  it('recognises it from the status alone, whichever one arrives', () => {
    // 422 today, 409 before; neither should need a code to be understood.
    expect(signUpError({ status: 422 })).toBeInstanceOf(DuplicateEmailError)
    expect(signUpError({ status: 409 })).toBeInstanceOf(DuplicateEmailError)
  })

  it('accepts a lowercase code', () => {
    expect(signUpError({ code: 'user_already_exists' })).toBeInstanceOf(
      DuplicateEmailError,
    )
  })

  it("turns a refused domain into its own error, keeping the backend's message", () => {
    const message =
      'Registration is restricted to @amalitech.com or @amalitechtraining.org email addresses.'
    const mapped = signUpError({
      code: 'EMAIL_DOMAIN_NOT_ALLOWED',
      status: 403,
      message,
    })

    expect(mapped).toBeInstanceOf(EmailDomainNotAllowedError)
    expect(mapped).not.toBeInstanceOf(DuplicateEmailError)
    expect(mapped.message).toBe(message)
  })

  it('falls back to a default message for a refused domain without one', () => {
    expect(signUpError({ code: 'EMAIL_DOMAIN_NOT_ALLOWED' }).message).toBe(
      'This email domain is not allowed to register.',
    )
  })

  it('leaves every other failure generic', () => {
    for (const error of [
      { status: 500 },
      { status: 400, code: 'PASSWORD_TOO_SHORT' },
      { message: 'network down' },
      {},
      undefined,
    ]) {
      const mapped = signUpError(error)
      expect(mapped).not.toBeInstanceOf(DuplicateEmailError)
      expect(mapped.message).toBe('Registration failed')
    }
  })
})

describe('auth backend configuration', () => {
  it('refuses registration when no backend URL is configured', async () => {
    await expect(
      registerUser({
        name: 'New User',
        email: 'new.user@amalitech.com',
        password: 'Sup3rSecret!',
      }),
    ).rejects.toThrow('Authentication backend is not configured.')
  })

  it('refuses login when no backend URL is configured', async () => {
    await expect(
      loginUser({
        email: 'kwame.mensah@amalitech.com',
        password: 'Sup3rSecret!',
      }),
    ).rejects.toThrow('Authentication backend is not configured.')
  })

  it('resolves to null when no backend URL is configured', async () => {
    await expect(getCurrentUser()).resolves.toBeNull()
  })

  it('is a no-op when no backend URL is configured', async () => {
    await expect(logoutUser()).resolves.toBeUndefined()
  })

  it('refuses a password change when no backend URL is configured', async () => {
    await expect(
      changePassword({ currentPassword: 'old-pass', newPassword: 'new-pass1' }),
    ).rejects.toThrow('Authentication backend is not configured.')
  })
})

describe('changePasswordErrorMessage', () => {
  it.each([
    ['INVALID_PASSWORD', 'Your current password is incorrect.'],
    ['PASSWORD_TOO_SHORT', 'Your new password must be at least 8 characters.'],
  ])('explains %s', (code, message) => {
    expect(changePasswordErrorMessage({ code })).toBe(message)
  })

  it("falls back to the backend's message, then a generic one", () => {
    expect(changePasswordErrorMessage({ message: 'Rate limited' })).toBe(
      'Rate limited',
    )
    expect(changePasswordErrorMessage(undefined)).toBe(
      'Could not change your password. Please try again.',
    )
  })
})

describe('DuplicateEmailError', () => {
  it('carries a message the screen can show as-is', () => {
    expect(new DuplicateEmailError().message).toBe(
      'An account may already exist for this email. Try signing in or use another work email.',
    )
  })

  it('is an Error with its own name', () => {
    const error = new DuplicateEmailError()
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('DuplicateEmailError')
  })
})

describe('EmailDomainNotAllowedError', () => {
  it("keeps the backend's message, with a fallback", () => {
    expect(new EmailDomainNotAllowedError('Only @a.com').message).toBe(
      'Only @a.com',
    )
    expect(new EmailDomainNotAllowedError().message).toBe(
      'This email domain is not allowed to register.',
    )
  })

  it('is an Error with its own name', () => {
    const error = new EmailDomainNotAllowedError()
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('EmailDomainNotAllowedError')
  })
})

describe('InvalidCredentialsError', () => {
  it('keeps a clear message for invalid username and password combinations', () => {
    expect(new InvalidCredentialsError().message).toBe(
      'Invalid email or password',
    )
  })
})
