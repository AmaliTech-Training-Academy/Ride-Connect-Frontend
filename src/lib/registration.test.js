import { describe, expect, it } from 'vitest'
import {
  MIN_PASSWORD_LENGTH,
  passwordStrength,
  validateRegistration,
} from './registration'

const valid = {
  name: 'Kwame Mensah',
  email: 'kwame.mensah@amalitech.com',
  password: 'Sup3rSecret!',
  confirmPassword: 'Sup3rSecret!',
}

describe('validateRegistration', () => {
  it('accepts a complete, valid registration', () => {
    expect(validateRegistration(valid)).toEqual({})
  })

  describe('name', () => {
    it('requires a name', () => {
      expect(validateRegistration({ ...valid, name: '' }).name).toBe(
        'Please enter your full name',
      )
    })

    it('rejects a name that is only whitespace', () => {
      expect(validateRegistration({ ...valid, name: '   ' })).toHaveProperty(
        'name',
      )
    })
  })

  describe('work email', () => {
    it('requires an email', () => {
      expect(validateRegistration({ ...valid, email: '' }).email).toBe(
        'Please enter your work email',
      )
    })

    it('rejects a non-work domain', () => {
      expect(
        validateRegistration({ ...valid, email: 'kwame@gmail.com' }).email,
      ).toBe('Please use your @amalitech.com work email')
    })

    it('rejects text that is not an email at all', () => {
      expect(validateRegistration({ ...valid, email: 'asdf' })).toHaveProperty(
        'email',
      )
    })

    it('rejects a bare domain with no local part', () => {
      expect(
        validateRegistration({ ...valid, email: '@amalitech.com' }),
      ).toHaveProperty('email')
    })

    it('accepts the work domain regardless of case', () => {
      expect(
        validateRegistration({ ...valid, email: 'Kwame@AmaliTech.com' }),
      ).toEqual({})
    })

    it('ignores surrounding whitespace', () => {
      expect(
        validateRegistration({ ...valid, email: '  kwame@amalitech.com  ' }),
      ).toEqual({})
    })
  })

  describe('password', () => {
    it('requires a password', () => {
      expect(
        validateRegistration({ ...valid, password: '', confirmPassword: '' })
          .password,
      ).toBe('Please enter a password')
    })

    it(`rejects a password shorter than ${MIN_PASSWORD_LENGTH} characters`, () => {
      const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1)
      expect(
        validateRegistration({
          ...valid,
          password: short,
          confirmPassword: short,
        }).password,
      ).toBe(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    })

    it(`accepts a password of exactly ${MIN_PASSWORD_LENGTH} characters`, () => {
      const exact = 'a'.repeat(MIN_PASSWORD_LENGTH)
      expect(
        validateRegistration({
          ...valid,
          password: exact,
          confirmPassword: exact,
        }),
      ).toEqual({})
    })

    it('does not trim the password', () => {
      const padded = `  ${'a'.repeat(MIN_PASSWORD_LENGTH)}  `
      expect(
        validateRegistration({
          ...valid,
          password: padded,
          confirmPassword: padded,
        }),
      ).toEqual({})
    })
  })

  describe('confirm password', () => {
    it('requires confirmation', () => {
      expect(
        validateRegistration({ ...valid, confirmPassword: '' }).confirmPassword,
      ).toBe('Please confirm your password')
    })

    it('rejects a mismatch', () => {
      expect(
        validateRegistration({ ...valid, confirmPassword: 'somethingElse1!' })
          .confirmPassword,
      ).toBe("Passwords don't match")
    })
  })

  it('reports every invalid field at once', () => {
    const errors = validateRegistration({
      name: '',
      email: 'kwame@gmail.com',
      password: '1234',
      confirmPassword: '12345',
    })

    expect(Object.keys(errors).sort()).toEqual([
      'confirmPassword',
      'email',
      'name',
      'password',
    ])
  })

  it('tolerates being called with no fields', () => {
    expect(Object.keys(validateRegistration({}))).toHaveLength(4)
  })
})

describe('passwordStrength', () => {
  it('scores an empty password as zero with no label', () => {
    expect(passwordStrength('')).toEqual({ score: 0, percent: 0, label: '' })
  })

  it('scores a short numeric password as the weakest non-zero step', () => {
    // Matches the "1234" state in the design: a single quarter of the bar.
    expect(passwordStrength('1234')).toMatchObject({ score: 1, percent: 25 })
  })

  it('scores a long mixed password as full strength', () => {
    expect(passwordStrength('Sup3rSecret!')).toMatchObject({
      score: 4,
      percent: 100,
      label: 'Strong enough',
    })
  })

  it('increases monotonically as character classes are added', () => {
    const scores = [
      passwordStrength('aaaaaaaa').score,
      passwordStrength('aaaaaaaA').score,
      passwordStrength('aaaaaaA1').score,
      passwordStrength('aaaaaA1!').score,
    ]

    expect(scores).toEqual([1, 2, 3, 4])
  })

  it('never exceeds the top score', () => {
    expect(passwordStrength('Sup3rSecret!!!!@@@@####').score).toBe(4)
  })
})
