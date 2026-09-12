import { describe, expect, it } from 'vitest'
import { InvalidCredentialsError, loginUser } from './auth'

const KNOWN = { email: 'kwame.mensah@amalitech.com', password: 'Sup3rSecret!' }

describe('loginUser', () => {
  it('resolves with the account for correct credentials', async () => {
    await expect(loginUser(KNOWN)).resolves.toEqual({ email: KNOWN.email })
  })

  it('accepts the email in any case', async () => {
    await expect(
      loginUser({ ...KNOWN, email: 'Kwame.Mensah@AMALITECH.com' }),
    ).resolves.toEqual({ email: KNOWN.email })
  })

  it('ignores surrounding whitespace on the email', async () => {
    await expect(
      loginUser({ ...KNOWN, email: `  ${KNOWN.email}  ` }),
    ).resolves.toEqual({ email: KNOWN.email })
  })

  it('rejects a wrong password', async () => {
    await expect(
      loginUser({ ...KNOWN, password: 'WrongPassword1!' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('rejects an unknown email', async () => {
    await expect(
      loginUser({ email: 'nobody@amalitech.com', password: KNOWN.password }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('is case sensitive on the password', async () => {
    await expect(
      loginUser({ ...KNOWN, password: KNOWN.password.toLowerCase() }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError)
  })

  it('gives the same error for an unknown email and a wrong password', async () => {
    const unknownEmail = await loginUser({
      email: 'nobody@amalitech.com',
      password: KNOWN.password,
    }).catch((error) => error)
    const wrongPassword = await loginUser({
      ...KNOWN,
      password: 'WrongPassword1!',
    }).catch((error) => error)

    expect(unknownEmail.message).toBe(wrongPassword.message)
  })
})

describe('InvalidCredentialsError', () => {
  it('carries the message the screen shows as-is', () => {
    expect(new InvalidCredentialsError().message).toBe(
      'Invalid email or password',
    )
  })

  it('names neither the email nor the password field', () => {
    expect(new InvalidCredentialsError().message).not.toMatch(
      /incorrect password|no account|not found|unknown email/i,
    )
  })

  it('is an Error with its own name', () => {
    const error = new InvalidCredentialsError()
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('InvalidCredentialsError')
  })
})
