import { describe, expect, it } from '@jest/globals'
import {
  audienceFor,
  composeMessage,
  describeNotificationAge,
  exactTimestamp,
  normaliseNotification,
  normaliseNotifications,
  presentationFor,
} from './notifications'

describe('presentationFor', () => {
  it('maps every type the API can send', () => {
    expect(presentationFor('RIDE_REQUEST_RECEIVED').icon).toBe('fa-user-plus')
    expect(presentationFor('RIDE_REQUEST_REREQUESTED').icon).toBe(
      'fa-rotate-right',
    )
    expect(presentationFor('REQUEST_ACCEPTED')).toEqual({
      icon: 'fa-circle-check',
      tone: 'success',
    })
    expect(presentationFor('REQUEST_DECLINED')).toEqual({
      icon: 'fa-xmark',
      tone: 'danger',
    })
    expect(presentationFor('PASSENGER_WITHDREW')).toEqual({
      icon: 'fa-user-minus',
      tone: 'danger',
    })
    expect(presentationFor('RIDE_CANCELLED').icon).toBe('fa-ban')
    expect(presentationFor('RIDE_UPDATED').icon).toBe('fa-pen-to-square')
  })

  it('falls back to a bell for a type it does not know', () => {
    // A type added server-side must still render rather than vanish.
    expect(presentationFor('SOMETHING_NEW')).toEqual({
      icon: 'fa-bell',
      tone: 'info',
    })
    expect(presentationFor(undefined).icon).toBe('fa-bell')
  })
})

describe('composeMessage', () => {
  const ride = { rideOrigin: 'East Legon', rideDestination: 'AmaliTech Office' }

  it('writes a sentence per event', () => {
    expect(
      composeMessage({
        type: 'RIDE_REQUEST_RECEIVED',
        actorName: 'Yaw',
        ...ride,
      }),
    ).toBe('Yaw requested to join your ride to AmaliTech Office.')

    expect(
      composeMessage({
        type: 'RIDE_REQUEST_REREQUESTED',
        actorName: 'Yaw',
        ...ride,
      }),
    ).toBe('Yaw asked again to join your ride to AmaliTech Office.')

    expect(
      composeMessage({ type: 'REQUEST_ACCEPTED', actorName: 'Kwame', ...ride }),
    ).toBe('Kwame accepted your request for East Legon to AmaliTech Office.')

    expect(
      composeMessage({ type: 'REQUEST_DECLINED', actorName: 'Efua', ...ride }),
    ).toBe('Efua declined your request for East Legon to AmaliTech Office.')

    expect(
      composeMessage({ type: 'PASSENGER_WITHDREW', actorName: 'Ama', ...ride }),
    ).toBe('Ama withdrew on your ride to AmaliTech Office.')

    expect(composeMessage({ type: 'RIDE_CANCELLED', ...ride })).toBe(
      'Your ride from East Legon to AmaliTech Office was cancelled.',
    )

    expect(
      composeMessage({ type: 'RIDE_UPDATED', actorName: 'Kwame', ...ride }),
    ).toBe(
      'Kwame changed the details of the ride from East Legon to AmaliTech Office.',
    )
  })

  it('says "Someone" when the actor is missing', () => {
    // Every field is nullable in the API contract.
    expect(
      composeMessage({ type: 'REQUEST_ACCEPTED', actorName: null, ...ride }),
    ).toBe('Someone accepted your request for East Legon to AmaliTech Office.')
    expect(
      composeMessage({ type: 'REQUEST_ACCEPTED', actorName: '   ', ...ride }),
    ).toBe('Someone accepted your request for East Legon to AmaliTech Office.')
  })

  it('leaves the route out rather than rendering undefined', () => {
    expect(
      composeMessage({ type: 'REQUEST_ACCEPTED', actorName: 'Kwame' }),
    ).toBe('Kwame accepted your request.')
    expect(composeMessage({ type: 'RIDE_CANCELLED' })).toBe(
      'Your ride was cancelled.',
    )
    expect(
      composeMessage({
        type: 'RIDE_REQUEST_RECEIVED',
        actorName: 'Yaw',
        rideOrigin: 'East Legon',
        rideDestination: null,
      }),
    ).toBe('Yaw requested to join your ride.')
  })

  it('still says something for an unknown type', () => {
    expect(composeMessage({ type: 'BRAND_NEW', ...ride })).toBe(
      'There is an update on your ride from East Legon to AmaliTech Office.',
    )
    expect(composeMessage({})).toBe('You have a new notification.')
    expect(composeMessage()).toBe('You have a new notification.')
  })
})

describe('describeNotificationAge', () => {
  const now = new Date('2026-09-25T14:00:00')
  const ago = (ms) => new Date(now.getTime() - ms).toISOString()

  it('reads "Just now" under a minute', () => {
    expect(describeNotificationAge(ago(20 * 1000), now)).toBe('Just now')
  })

  it('counts minutes, then hours, then days', () => {
    expect(describeNotificationAge(ago(12 * 60000), now)).toBe('12 min ago')
    expect(describeNotificationAge(ago(3 * 3600000), now)).toBe('3 h ago')
    expect(
      describeNotificationAge(
        new Date('2026-09-23T10:00:00').toISOString(),
        now,
      ),
    ).toBe('2 days ago')
  })

  it('says Yesterday by calendar day, not by 24 hours', () => {
    const lastNight = new Date('2026-09-24T23:00:00').toISOString()
    expect(describeNotificationAge(lastNight, now)).toBe('Yesterday')
  })

  it('returns an empty string for a missing or unusable timestamp', () => {
    expect(describeNotificationAge(null, now)).toBe('')
    expect(describeNotificationAge('nonsense', now)).toBe('')
  })
})

describe('exactTimestamp', () => {
  it('renders a readable date and time', () => {
    const value = exactTimestamp(new Date(2026, 8, 25, 7, 15).toISOString())
    expect(value).toContain('Sep')
    expect(value).toContain('7:15')
  })

  it('returns an empty string for a missing or unusable timestamp', () => {
    expect(exactTimestamp(null)).toBe('')
    expect(exactTimestamp('nonsense')).toBe('')
  })
})

describe('normaliseNotification', () => {
  const raw = {
    id: 'n1',
    type: 'REQUEST_ACCEPTED',
    rideId: 'ride-1',
    requestId: 'req-1',
    rideOrigin: 'East Legon',
    rideDestination: 'AmaliTech Office',
    actorId: 'user-1',
    actorName: 'Kwame',
    readAt: null,
    createdAt: '2026-09-25T09:12:00.000Z',
  }

  it('composes the message and keeps what the panel needs', () => {
    expect(normaliseNotification(raw)).toEqual({
      id: 'n1',
      type: 'REQUEST_ACCEPTED',
      message:
        'Kwame accepted your request for East Legon to AmaliTech Office.',
      read: false,
      readAt: null,
      createdAt: '2026-09-25T09:12:00.000Z',
      rideId: 'ride-1',
      requestId: 'req-1',
      actorName: 'Kwame',
      audience: 'joined',
    })
  })

  it('treats a readAt timestamp as read', () => {
    // The API records when it was read, not whether.
    expect(
      normaliseNotification({ ...raw, readAt: '2026-09-25T10:00:00.000Z' })
        .read,
    ).toBe(true)
    expect(normaliseNotification({ ...raw, readAt: null }).read).toBe(false)
  })

  it('uppercases a lowercase type so presentation still matches', () => {
    expect(
      normaliseNotification({ ...raw, type: 'request_accepted' }).type,
    ).toBe('REQUEST_ACCEPTED')
  })
})

describe('audienceFor', () => {
  it('sends driver-side events to the driving tab', () => {
    expect(audienceFor('RIDE_REQUEST_RECEIVED')).toBe('driving')
    expect(audienceFor('RIDE_REQUEST_REREQUESTED')).toBe('driving')
    expect(audienceFor('PASSENGER_WITHDREW')).toBe('driving')
  })

  it('sends passenger-side events to the joined tab', () => {
    expect(audienceFor('REQUEST_ACCEPTED')).toBe('joined')
    expect(audienceFor('REQUEST_DECLINED')).toBe('joined')
    expect(audienceFor('RIDE_CANCELLED')).toBe('joined')
    expect(audienceFor('RIDE_UPDATED')).toBe('joined')
  })

  it('defaults an unknown type to the driving tab', () => {
    expect(audienceFor('SOMETHING_NEW')).toBe('driving')
    expect(audienceFor(undefined)).toBe('driving')
  })
})

describe('normaliseNotifications', () => {
  const payload = {
    success: true,
    data: {
      unreadCount: 2,
      items: [
        { id: 'n1', type: 'RIDE_REQUEST_RECEIVED', readAt: null },
        { id: 'n2', type: 'REQUEST_ACCEPTED', readAt: '2026-09-25T10:00:00Z' },
      ],
    },
  }

  it('reads the items array the API returns', () => {
    const result = normaliseNotifications(payload)
    expect(result.notifications.map((n) => n.id)).toEqual(['n1', 'n2'])
    expect(result.unreadCount).toBe(2)
  })

  it("prefers the server's count, which covers more than this page", () => {
    const result = normaliseNotifications({
      data: { unreadCount: 9, items: [{ id: 'n1', readAt: null }] },
    })
    expect(result.unreadCount).toBe(9)
  })

  it('derives the count when the server omits it', () => {
    const result = normaliseNotifications({
      data: {
        items: [
          { id: 'n1', readAt: null },
          { id: 'n2', readAt: '2026-09-25T10:00:00Z' },
          { id: 'n3', readAt: null },
        ],
      },
    })
    expect(result.unreadCount).toBe(2)
  })

  it('returns an empty result for a missing payload', () => {
    expect(normaliseNotifications(null)).toEqual({
      notifications: [],
      unreadCount: 0,
    })
    expect(normaliseNotifications({})).toEqual({
      notifications: [],
      unreadCount: 0,
    })
  })
})
