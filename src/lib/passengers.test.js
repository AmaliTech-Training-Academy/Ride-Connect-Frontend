import { describe, expect, it } from '@jest/globals'
import { describePassengers, normalisePassengers } from './passengers'

describe('normalisePassengers', () => {
  it('reads acceptedPassengers into what the card shows', () => {
    expect(
      normalisePassengers({
        acceptedPassengers: [
          {
            id: 'u1',
            name: 'Ama Owusu',
            image: 'https://img/ama.png',
            office: 'ACCRA',
          },
        ],
      }),
    ).toEqual([
      {
        id: 'u1',
        name: 'Ama Owusu',
        image: 'https://img/ama.png',
        initials: 'AO',
        office: 'ACCRA',
        role: null,
      },
    ])
  })

  it('also accepts the other names the backend might use', () => {
    expect(
      normalisePassengers({ confirmedPassengers: [{ id: 'a', name: 'Kofi' }] }),
    ).toHaveLength(1)
    expect(
      normalisePassengers({ passengers: [{ id: 'b', name: 'Esi' }] }),
    ).toHaveLength(1)
  })

  it('reads a passenger nested under user, or with passenger* fields', () => {
    const [nested, prefixed] = normalisePassengers({
      acceptedPassengers: [
        {
          user: { id: 'u2', name: 'Kofi Boateng', image: null, jobTitle: 'QA' },
        },
        {
          passengerId: 'u3',
          passengerName: 'Esi Mensah',
          passengerImage: 'https://img/esi.png',
        },
      ],
    })

    expect(nested).toMatchObject({ id: 'u2', initials: 'KB', role: 'QA' })
    expect(prefixed).toMatchObject({
      id: 'u3',
      name: 'Esi Mensah',
      image: 'https://img/esi.png',
    })
  })

  it('drops unnamed entries and lists each person once', () => {
    expect(
      normalisePassengers({
        acceptedPassengers: [
          { id: 'u1', name: 'Ama' },
          { id: 'u1', name: 'Ama' },
          { id: 'u4', name: '   ' },
          null,
        ],
      }).map((passenger) => passenger.id),
    ).toEqual(['u1'])
  })

  it('treats an empty picture as none', () => {
    expect(
      normalisePassengers({
        acceptedPassengers: [{ id: 'x', name: 'Yaw', image: '' }],
      })[0].image,
    ).toBeNull()
  })

  it('returns nothing when the ride has no passenger list', () => {
    expect(normalisePassengers({})).toEqual([])
    expect(normalisePassengers(undefined)).toEqual([])
  })
})

describe('describePassengers', () => {
  const people = (...names) => names.map((name) => ({ name }))

  it.each([
    [[], ''],
    [people('Ama Owusu'), 'Ama is riding'],
    [people('Ama Owusu', 'Kofi Boateng'), 'Ama and Kofi are riding'],
    [people('Ama', 'Kofi', 'Esi'), 'Ama and 2 others are riding'],
  ])('describes %j', (passengers, text) => {
    expect(describePassengers(passengers)).toBe(text)
  })
})
