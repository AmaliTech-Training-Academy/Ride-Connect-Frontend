import { describe, expect, it } from 'vitest'
import { DuplicateEmailError, registerUser } from './auth'

const TAKEN = { email: 'kwame.mensah@amalitech.com', password: 'Sup3rSecret!' }

function freshEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@amalitech.com`
}

describe('registerUser', () => {
  it('resolves with the normalised email for a new address', async () => {
    const email = freshEmail('new')
    await expect(
      registerUser({ email, password: 'Sup3rSecret!' }),
    ).resolves.toEqual({
      email: email.toLowerCase(),
    })
  })

  it('lowercases and trims the stored email', async () => {
    const email = freshEmail('Mixed').toUpperCase()
    const result = await registerUser({
      email: `  ${email}  `,
      password: 'Sup3rSecret!',
    })
    expect(result.email).toBe(email.trim().toLowerCase())
  })

  it('rejects an email that is already taken', async () => {
    await expect(registerUser(TAKEN)).rejects.toBeInstanceOf(
      DuplicateEmailError,
    )
  })

  it('rejects a second registration of the same address', async () => {
    const email = freshEmail('repeat')

    await registerUser({ email, password: 'Sup3rSecret!' })
    await expect(
      registerUser({ email, password: 'Sup3rSecret!' }),
    ).rejects.toBeInstanceOf(DuplicateEmailError)
  })

  it('treats a differently-cased duplicate as taken', async () => {
    await expect(
      registerUser({ ...TAKEN, email: 'Kwame.Mensah@AMALITECH.com' }),
    ).rejects.toBeInstanceOf(DuplicateEmailError)
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
