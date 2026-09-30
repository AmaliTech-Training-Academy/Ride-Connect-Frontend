import { describe, expect, it } from '@jest/globals'
import { matchesOffice, officeLabel, officeName } from './offices'

describe('matchesOffice', () => {
  it.each([
    'Kumasi',
    'kumasi office',
    'AmaliTech Kumasi',
    'AMALITECH KUMASI OFFICE',
    '  The Kumasi office! ',
  ])('treats "%s" as the Kumasi office', (text) => {
    expect(matchesOffice(text, 'KUMASI')).toBe(true)
  })

  it.each(['Kumasi Mall', 'Adum', 'Accra', ''])(
    'does not treat "%s" as the Kumasi office',
    (text) => {
      expect(matchesOffice(text, 'KUMASI')).toBe(false)
    },
  )

  it('never matches before an office is chosen', () => {
    expect(matchesOffice('Kumasi', '')).toBe(false)
  })

  it('does not match filler words alone', () => {
    expect(matchesOffice('AmaliTech office', 'KUMASI')).toBe(false)
  })
})

describe('office names', () => {
  it('gives the label and short name for a code, and nothing for an unknown one', () => {
    expect(officeLabel('TAKORADI')).toBe('AmaliTech Takoradi')
    expect(officeName('TAKORADI')).toBe('Takoradi')
    expect(officeLabel('LAGOS')).toBe('')
    expect(officeName(undefined)).toBe('')
  })
})
