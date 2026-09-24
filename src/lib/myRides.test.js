import { describe, expect, it } from '@jest/globals'
import {
  describeElapsed,
  initialsFrom,
  normaliseDriverRide,
  normaliseJoinedRide,
  normaliseMyJoinedRides,
  normaliseMyRides,
  toLocalDateAndTime,
} from './myRides'

describe('initialsFrom', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsFrom('Nana Yeboah')).toBe('NY')
    expect(initialsFrom('Grace Brewster Murray Hopper')).toBe('GB')
  })

  it('handles single names, extra whitespace, and empty input', () => {
    expect(initialsFrom('Prince')).toBe('P')
    expect(initialsFrom('  esi   ofori  ')).toBe('EO')
    expect(initialsFrom('')).toBe('')
    expect(initialsFrom()).toBe('')
  })
})

describe('toLocalDateAndTime', () => {
  it('splits an ISO instant into local date and time', () => {
    const iso = new Date(2026, 8, 23, 8, 15).toISOString()
    expect(toLocalDateAndTime(iso)).toEqual({
      date: '2026-09-23',
      time: '08:15',
    })
  })

  it('zero-pads single-digit months, days, hours, and minutes', () => {
    const iso = new Date(2026, 0, 5, 7, 5).toISOString()
    expect(toLocalDateAndTime(iso)).toEqual({
      date: '2026-01-05',
      time: '07:05',
    })
  })

  it('returns empty strings for an unusable timestamp', () => {
    expect(toLocalDateAndTime('not-a-date')).toEqual({ date: '', time: '' })
    expect(toLocalDateAndTime(null)).toEqual({ date: '', time: '' })
  })
})

describe('describeElapsed', () => {
  const now = new Date('2026-09-22T12:00:00.000Z')
  const ago = (ms) => new Date(now.getTime() - ms).toISOString()

  it('reports minutes under an hour', () => {
    expect(describeElapsed(ago(8 * 60000), now)).toBe('8 min')
    expect(describeElapsed(ago(59 * 60000), now)).toBe('59 min')
  })

  it('reports whole hours under a day', () => {
    expect(describeElapsed(ago(60 * 60000), now)).toBe('1 h')
    expect(describeElapsed(ago(90 * 60000), now)).toBe('1 h')
    expect(describeElapsed(ago(23 * 3600000), now)).toBe('23 h')
  })

  it('reports whole days beyond that', () => {
    expect(describeElapsed(ago(24 * 3600000), now)).toBe('1 d')
    expect(describeElapsed(ago(50 * 3600000), now)).toBe('2 d')
  })

  it('clamps a future timestamp to zero rather than going negative', () => {
    expect(describeElapsed(ago(-5 * 60000), now)).toBe('0 min')
  })

  it('returns an empty string for an unusable or missing timestamp', () => {
    expect(describeElapsed('nonsense', now)).toBe('')
    expect(describeElapsed(null, now)).toBe('')
    expect(describeElapsed(undefined, now)).toBe('')
  })
})

describe('normaliseDriverRide', () => {
  const now = new Date('2026-09-22T12:00:00.000Z')

  const apiRide = {
    id: 'b3f1c2a0-1e2d-4a3b-9c5e-6f7a8b9c0d1e',
    driverId: 'a1b2c3d4-1111-2222-3333-444455556666',
    driverName: 'Grace Hopper',
    origin: 'East Legon',
    destination: 'AmaliTech Office',
    routeDescription: 'Meet at the Shell station, silver Corolla',
    departureAt: new Date(2026, 8, 23, 8, 15).toISOString(),
    totalSeats: 4,
    availableSeats: 2,
    status: 'OPEN',
    pendingRequests: [
      {
        id: 'c4d5e6f7-2222-3333-4444-555566667777',
        passengerId: 'd5e6f7a8-3333-4444-5555-666677778888',
        passengerName: 'Nana Yeboah',
        createdAt: new Date(now.getTime() - 8 * 60000).toISOString(),
      },
    ],
    confirmedPassengers: [
      {
        id: 'e6f7a8b9-4444-5555-6666-777788889999',
        passengerId: 'f7a8b9c0-5555-6666-7777-888899990000',
        passengerName: 'Yaw Boateng',
      },
    ],
  }

  it('maps the API field names onto the screen shape', () => {
    const ride = normaliseDriverRide(apiRide, { now })

    expect(ride).toMatchObject({
      id: apiRide.id,
      origin: 'East Legon',
      destination: 'AmaliTech Office',
      description: 'Meet at the Shell station, silver Corolla',
      date: '2026-09-23',
      time: '08:15',
      seatsTotal: 4,
      seatsAvailable: 2,
      isPast: false,
    })
  })

  it('lowercases the status so it matches the screen vocabulary', () => {
    expect(
      normaliseDriverRide({ ...apiRide, status: 'CANCELLED' }, { now }).status,
    ).toBe('cancelled')
    expect(
      normaliseDriverRide({ ...apiRide, status: undefined }, { now }).status,
    ).toBe('')
  })

  it('derives passenger names, initials, and request age', () => {
    const ride = normaliseDriverRide(apiRide, { now })

    expect(ride.pendingRequests[0]).toMatchObject({
      id: 'c4d5e6f7-2222-3333-4444-555566667777',
      name: 'Nana Yeboah',
      initials: 'NY',
      requestedLabel: '8 min',
    })
    expect(ride.confirmedPassengers[0]).toMatchObject({
      name: 'Yaw Boateng',
      initials: 'YB',
    })
  })

  it('turns a null routeDescription into an empty string', () => {
    expect(
      normaliseDriverRide({ ...apiRide, routeDescription: null }, { now })
        .description,
    ).toBe('')
  })

  it('tolerates missing request and passenger arrays', () => {
    const ride = normaliseDriverRide(
      {
        ...apiRide,
        pendingRequests: undefined,
        confirmedPassengers: undefined,
      },
      { now },
    )
    expect(ride.pendingRequests).toEqual([])
    expect(ride.confirmedPassengers).toEqual([])
  })
})

describe('normaliseJoinedRide - decline reason', () => {
  const base = {
    id: 'ride-1',
    driverName: 'Ama Owusu',
    departureAt: new Date(2026, 8, 23, 7, 30).toISOString(),
    requestId: 'req-1',
    requestStatus: 'DECLINED',
  }

  it('carries the reason the driver gave', () => {
    const ride = normaliseJoinedRide({
      ...base,
      rejectionReason: 'Car is already full.',
      rerequestCount: 0,
    })

    expect(ride.rejectionReason).toBe('Car is already full.')
    expect(ride.rerequestCount).toBe(0)
  })

  it('falls back to empty when the backend sends no reason', () => {
    const ride = normaliseJoinedRide(base)
    expect(ride.rejectionReason).toBe('')
    expect(ride.rerequestCount).toBe(0)
  })

  it('reads a re-request that has already been used', () => {
    const ride = normaliseJoinedRide({ ...base, rerequestCount: 1 })
    expect(ride.rerequestCount).toBe(1)
  })
})

describe('normaliseMyRides', () => {
  const now = new Date('2026-09-22T12:00:00.000Z')

  const payload = {
    success: true,
    data: {
      driving: [
        {
          id: 'upcoming-1',
          origin: 'East Legon',
          destination: 'AmaliTech Office',
          departureAt: new Date(2026, 8, 23, 8, 15).toISOString(),
          totalSeats: 4,
          availableSeats: 2,
          status: 'OPEN',
          pendingRequests: [],
          confirmedPassengers: [],
        },
      ],
      pastAndCancelled: [
        {
          id: 'past-1',
          origin: 'Osu',
          destination: 'AmaliTech Office',
          departureAt: new Date(2026, 8, 21, 8, 0).toISOString(),
          totalSeats: 2,
          availableSeats: 2,
          status: 'CANCELLED',
          pendingRequests: [],
          confirmedPassengers: [],
        },
      ],
      joined: [{ id: 'joined-1', status: 'OPEN' }],
      joinedPastAndCancelled: [{ id: 'joined-past-1' }],
    },
  }

  it('flattens both driver buckets and tags which one each ride came from', () => {
    const rides = normaliseMyRides(payload, now)

    expect(rides.map((ride) => ride.id)).toEqual(['upcoming-1', 'past-1'])
    expect(rides[0].isPast).toBe(false)
    expect(rides[1].isPast).toBe(true)
  })

  it('ignores the passenger-side buckets', () => {
    const ids = normaliseMyRides(payload, now).map((ride) => ride.id)
    expect(ids).not.toContain('joined-1')
    expect(ids).not.toContain('joined-past-1')
  })

  it('returns an empty list for a missing or empty payload', () => {
    expect(normaliseMyRides(null)).toEqual([])
    expect(normaliseMyRides({})).toEqual([])
    expect(normaliseMyRides({ data: {} })).toEqual([])
  })
})

describe('normaliseJoinedRide', () => {
  const ride = {
    id: 'ride-1',
    driverId: 'driver-1',
    driverName: 'Ama Owusu',
    origin: 'Madina',
    destination: 'AmaliTech Office',
    routeDescription: 'Via the main road.',
    departureAt: new Date(2026, 8, 23, 8, 15).toISOString(),
    totalSeats: 4,
    availableSeats: 3,
    status: 'OPEN',
    requestId: 'request-1',
    requestStatus: 'PENDING',
    requestedAt: '2026-09-22T08:00:00.000Z',
  }

  it('maps the request fields alongside the ride details', () => {
    expect(normaliseJoinedRide(ride)).toEqual({
      id: 'ride-1',
      driverId: 'driver-1',
      driverName: 'Ama Owusu',
      origin: 'Madina',
      destination: 'AmaliTech Office',
      description: 'Via the main road.',
      date: '2026-09-23',
      time: '08:15',
      status: 'open',
      seatsTotal: 4,
      seatsAvailable: 3,
      requestId: 'request-1',
      requestStatus: 'PENDING',
      rejectionReason: '',
      rerequestCount: 0,
      requestedAt: '2026-09-22T08:00:00.000Z',
      isPast: false,
    })
  })

  it('tags past rides via the isPast option', () => {
    expect(normaliseJoinedRide(ride, { isPast: true }).isPast).toBe(true)
  })
})

describe('normaliseMyJoinedRides', () => {
  const payload = {
    success: true,
    data: {
      driving: [{ id: 'driving-1' }],
      joined: [{ id: 'joined-1', requestStatus: 'PENDING', departureAt: null }],
      joinedPastAndCancelled: [
        { id: 'joined-past-1', requestStatus: 'DECLINED', departureAt: null },
      ],
    },
  }

  it('flattens both passenger buckets and tags which one each ride came from', () => {
    const rides = normaliseMyJoinedRides(payload)

    expect(rides.map((ride) => ride.id)).toEqual(['joined-1', 'joined-past-1'])
    expect(rides[0].isPast).toBe(false)
    expect(rides[1].isPast).toBe(true)
  })

  it('ignores the driver-side buckets', () => {
    const ids = normaliseMyJoinedRides(payload).map((ride) => ride.id)
    expect(ids).not.toContain('driving-1')
  })

  it('returns an empty list for a missing or empty payload', () => {
    expect(normaliseMyJoinedRides(null)).toEqual([])
    expect(normaliseMyJoinedRides({})).toEqual([])
    expect(normaliseMyJoinedRides({ data: {} })).toEqual([])
  })
})
