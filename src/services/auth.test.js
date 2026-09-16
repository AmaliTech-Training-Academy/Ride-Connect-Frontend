import { describe, expect, it } from '@jest/globals'
import {
  DuplicateEmailError,
  InvalidCredentialsError,
  loginUser,
  registerUser,
} from './auth'

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
