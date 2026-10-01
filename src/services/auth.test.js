import { describe, expect, it } from '@jest/globals'
import {
  DuplicateEmailError,
  InvalidCredentialsError,
  changePassword,
  changePasswordErrorMessage,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  signUpError,
  updateProfileImage,
} from './auth'

describe('signUpError', () => {
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

  it('refuses a picture change when no backend URL is configured', async () => {
    await expect(
      updateProfileImage('https://res.cloudinary.com/x/me.png'),
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
      'An account with this email already exists.',
    )
  })

  it('is an Error with its own name', () => {
    const error = new DuplicateEmailError()
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('DuplicateEmailError')
  })
})

describe('InvalidCredentialsError', () => {
  it('keeps a clear message for invalid username and password combinations', () => {
    expect(new InvalidCredentialsError().message).toBe(
      'Invalid email or password',
    )
  })
})
