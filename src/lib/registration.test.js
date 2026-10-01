import { describe, expect, it } from '@jest/globals'
import {
  ALLOWED_EMAIL_DOMAINS,
  DEFAULT_ALLOWED_EMAIL_DOMAINS,
  EXAMPLE_EMAIL_DOMAIN,
  MIN_PASSWORD_LENGTH,
  emailDomainWarning,
  formatEmailDomains,
  isAllowedWorkEmail,
  parseEmailDomains,
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

    it("doesn't block an unknown domain: the backend decides", () => {
      expect(
        validateRegistration({ ...valid, email: 'kwame@gmail.com' }),
      ).toEqual({})
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

    it('accepts the training domain too', () => {
      expect(
        validateRegistration({
          ...valid,
          email: 'ama.owusu@AmaliTechTraining.org',
        }),
      ).toEqual({})
    })

    it.each([
      ['two @ signs', 'kwame@x@amalitech.com'],
      ['a space inside', 'kwa me@amalitech.com'],
      ['a domain with no dot', 'kwame@amalitech'],
    ])('blocks an address with %s', (_, email) => {
      expect(validateRegistration({ ...valid, email }).email).toBe(
        'Please enter a valid email address',
      )
    })
  })
})

describe('emailDomainWarning', () => {
  const warning =
    'Please use your @amalitech.com or @amalitechtraining.org work email'

  it.each([
    ['another provider', 'kwame@gmail.com'],
    ['a look-alike domain', 'kwame@amalitech.com.evil.io'],
    ['a subdomain', 'kwame@mail.amalitech.com'],
    ['a look-alike prefix', 'kwame@notamalitech.com'],
  ])('warns about %s', (_, email) => {
    expect(emailDomainWarning(email)).toBe(warning)
  })

  it.each([
    'kwame@amalitech.com',
    'Ama.Owusu@AmaliTechTraining.ORG',
    '  kwame@amalitech.com  ',
  ])('stays quiet for %s', (email) => {
    expect(emailDomainWarning(email)).toBeUndefined()
  })

  it('leaves blanks and malformed text to the main validation', () => {
    expect(emailDomainWarning('')).toBeUndefined()
    expect(emailDomainWarning('asdf')).toBeUndefined()
  })

  it('uses whatever list it is given', () => {
    expect(emailDomainWarning('a@x.com', ['b.org'])).toBe(
      'Please use your @b.org work email',
    )
  })

  it('names an example domain only for the placeholder', () => {
    expect(ALLOWED_EMAIL_DOMAINS).toContain(EXAMPLE_EMAIL_DOMAIN)
  })
})

describe('allowed email domains', () => {
  it('defaults to the company and training domains', () => {
    expect(ALLOWED_EMAIL_DOMAINS).toEqual([
      'amalitech.com',
      'amalitechtraining.org',
    ])
    expect(DEFAULT_ALLOWED_EMAIL_DOMAINS).toEqual(ALLOWED_EMAIL_DOMAINS)
  })

  it('reads a comma-separated list, tidying spaces, case and @ signs', () => {
    expect(
      parseEmailDomains(' Amalitech.com, @amalitechtraining.org ,,'),
    ).toEqual(['amalitech.com', 'amalitechtraining.org'])
    expect(parseEmailDomains('')).toEqual([])
    expect(parseEmailDomains(undefined)).toEqual([])
  })

  it('checks an address against any given list', () => {
    expect(isAllowedWorkEmail('a@b.org', ['b.org'])).toBe(true)
    expect(isAllowedWorkEmail('a@amalitech.com', ['b.org'])).toBe(false)
    expect(isAllowedWorkEmail(undefined)).toBe(false)
  })

  it('names the domains in plain English for messages', () => {
    expect(formatEmailDomains(['a.com'])).toBe('@a.com')
    expect(formatEmailDomains(['a.com', 'b.org'])).toBe('@a.com or @b.org')
    expect(formatEmailDomains(['a.com', 'b.org', 'c.net'])).toBe(
      '@a.com, @b.org or @c.net',
    )
    expect(formatEmailDomains([])).toBe('')
    expect(formatEmailDomains()).toBe(
      '@amalitech.com or @amalitechtraining.org',
    )
  })
})

describe('validateRegistration, continued', () => {
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
      email: 'kwame.mensah',
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
