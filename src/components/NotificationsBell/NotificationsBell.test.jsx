import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import NotificationsBell from './NotificationsBell'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notifications'

jest.mock('../../services/notifications', () => ({
  fetchNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}))

const minutesAgo = (minutes) =>
  new Date(Date.now() - minutes * 60000).toISOString()

function payload(items, unreadCount) {
  return {
    success: true,
    message: 'ok',
    data: {
      unreadCount: unreadCount ?? items.filter((item) => !item.readAt).length,
      items,
    },
  }
}

const ROUTE = { rideOrigin: 'East Legon', rideDestination: 'AmaliTech Office' }

/** Shaped exactly as GET /api/notifications returns it: no rendered message. */
const SAMPLE = [
  {
    id: 'n1',
    type: 'REQUEST_ACCEPTED',
    actorName: 'Kwame',
    ...ROUTE,
    readAt: null,
    createdAt: minutesAgo(12),
    rideId: 'ride-1',
    requestId: 'req-1',
  },
  {
    id: 'n2',
    type: 'RIDE_REQUEST_RECEIVED',
    actorName: 'Yaw',
    ...ROUTE,
    readAt: null,
    createdAt: minutesAgo(40),
    rideId: 'ride-2',
    requestId: 'req-2',
  },
  {
    id: 'n3',
    type: 'REQUEST_DECLINED',
    actorName: 'Efua',
    ...ROUTE,
    readAt: minutesAgo(60),
    createdAt: minutesAgo(60 * 30),
    rideId: 'ride-3',
    requestId: 'req-3',
  },
]

// The wording is composed on the frontend, so tests assert the sentences.
const ACCEPTED_TEXT =
  'Kwame accepted your request for East Legon to AmaliTech Office.'
const RECEIVED_TEXT = 'Yaw requested to join your ride to AmaliTech Office.'
const DECLINED_TEXT =
  'Efua declined your request for East Legon to AmaliTech Office.'

async function openPanel(user) {
  await user.click(await screen.findByRole('button', { name: /Notifications/ }))
}

describe('NotificationsBell', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fetchNotifications.mockResolvedValue(payload(SAMPLE))
    markNotificationRead.mockResolvedValue({
      id: 'n1',
      readAt: '2026-09-25T10:00:00.000Z',
    })
    markAllNotificationsRead.mockResolvedValue({ markedCount: 2 })
  })

  describe('unread badge', () => {
    it('shows the unread count on the bell', async () => {
      render(<NotificationsBell />)

      expect(await screen.findByText('2')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Notifications, 2 unread' }),
      ).toBeInTheDocument()
    })

    it('shows no badge when nothing is unread', async () => {
      fetchNotifications.mockResolvedValue(payload([{ ...SAMPLE[2] }]))
      render(<NotificationsBell />)

      const bell = await screen.findByRole('button', {
        name: 'Notifications, none unread',
      })
      expect(bell.querySelector('.notifications-count')).toBeNull()
    })

    it("uses the server's count even when the page holds fewer", async () => {
      fetchNotifications.mockResolvedValue(payload(SAMPLE, 14))
      render(<NotificationsBell />)

      expect(await screen.findByText('14')).toBeInTheDocument()
    })

    it('caps a very large count', async () => {
      fetchNotifications.mockResolvedValue(payload(SAMPLE, 250))
      render(<NotificationsBell />)

      expect(await screen.findByText('99+')).toBeInTheDocument()
    })
  })

  describe('the panel', () => {
    it('stays closed until the bell is clicked', async () => {
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await screen.findByText('2')

      expect(screen.queryByText('Notifications')).not.toBeInTheDocument()

      await openPanel(user)
      expect(
        screen.getByRole('heading', { name: 'Notifications' }),
      ).toBeInTheDocument()
    })

    it('lists each notification with its message and age', async () => {
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await openPanel(user)

      expect(screen.getByText(ACCEPTED_TEXT)).toBeInTheDocument()
      expect(screen.getByText('12 min ago')).toBeInTheDocument()
      expect(screen.getByText('40 min ago')).toBeInTheDocument()
    })

    it('carries the exact timestamp behind the relative text', async () => {
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await openPanel(user)

      const age = screen.getByText('12 min ago')
      expect(age.tagName).toBe('TIME')
      expect(age).toHaveAttribute('dateTime', SAMPLE[0].createdAt)
      expect(age.getAttribute('title')).toBeTruthy()
    })

    it('distinguishes unread rows from read ones', async () => {
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await openPanel(user)

      const unread = screen.getByText(RECEIVED_TEXT).closest('button')
      const read = screen.getByText(DECLINED_TEXT).closest('button')

      expect(unread).toHaveClass('notifications-item-unread')
      expect(read).not.toHaveClass('notifications-item-unread')
    })

    it('gives each event type its own icon', async () => {
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await openPanel(user)

      const iconFor = (text) =>
        screen
          .getByText(text)
          .closest('button')
          .querySelector('.notifications-icon i')

      expect(iconFor(ACCEPTED_TEXT)).toHaveClass('fa-circle-check')
      expect(iconFor(RECEIVED_TEXT)).toHaveClass('fa-user-plus')
      expect(iconFor(DECLINED_TEXT)).toHaveClass('fa-xmark')
    })

    it('shows the caught-up state when there is nothing', async () => {
      fetchNotifications.mockResolvedValue(payload([]))
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await openPanel(user)

      expect(
        await screen.findByText("You're all caught up."),
      ).toBeInTheDocument()
      // The design omits the action when there is nothing to act on.
      expect(
        screen.queryByRole('button', { name: 'Mark all as read' }),
      ).not.toBeInTheDocument()
    })

    it('reports a load failure and retries', async () => {
      fetchNotifications.mockRejectedValueOnce(new Error('Service unavailable'))
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await openPanel(user)

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Service unavailable',
      )

      fetchNotifications.mockResolvedValueOnce(payload(SAMPLE))
      await user.click(screen.getByRole('button', { name: 'Try again' }))

      expect(await screen.findByText('12 min ago')).toBeInTheDocument()
      expect(fetchNotifications).toHaveBeenCalledTimes(2)
    })
  })

  describe('marking as read', () => {
    it('marks a single notification read when it is selected', async () => {
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await openPanel(user)

      await user.click(screen.getByText(ACCEPTED_TEXT))

      await waitFor(() =>
        expect(markNotificationRead).toHaveBeenCalledWith('n1'),
      )
      // One of the two unread ones is now read.
      expect(await screen.findByText('1')).toBeInTheDocument()
    })

    it('does not re-mark a notification that is already read', async () => {
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await openPanel(user)

      await user.click(screen.getByText(DECLINED_TEXT))

      expect(markNotificationRead).not.toHaveBeenCalled()
    })

    it('marks everything read at once', async () => {
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await openPanel(user)

      await user.click(screen.getByRole('button', { name: 'Mark all as read' }))

      await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled())
      expect(
        screen.getByRole('button', { name: 'Notifications, none unread' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Mark all as read' }),
      ).not.toBeInTheDocument()
    })

    it('puts the unread state back when mark-all fails', async () => {
      markAllNotificationsRead.mockRejectedValueOnce(new Error('nope'))
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await openPanel(user)

      await user.click(screen.getByRole('button', { name: 'Mark all as read' }))

      // The optimistic update is rolled back rather than lying about the state.
      expect(
        await screen.findByRole('button', { name: 'Notifications, 2 unread' }),
      ).toBeInTheDocument()
    })
  })

  describe('selecting a notification', () => {
    it('opens the ride it refers to and closes the panel', async () => {
      const onOpenRide = jest.fn()
      const user = userEvent.setup()
      render(<NotificationsBell onOpenRide={onOpenRide} />)
      await openPanel(user)

      await user.click(screen.getByText(RECEIVED_TEXT))

      expect(onOpenRide).toHaveBeenCalledWith('ride-2', 'driving')
      expect(
        screen.queryByRole('heading', { name: 'Notifications' }),
      ).not.toBeInTheDocument()
    })

    it('does not navigate when the notification has no ride', async () => {
      fetchNotifications.mockResolvedValue(
        payload([{ ...SAMPLE[0], rideId: null }]),
      )
      const onOpenRide = jest.fn()
      const user = userEvent.setup()
      render(<NotificationsBell onOpenRide={onOpenRide} />)
      await openPanel(user)

      await user.click(screen.getByText(ACCEPTED_TEXT))

      expect(onOpenRide).not.toHaveBeenCalled()
    })

    it('still navigates when marking read fails', async () => {
      markNotificationRead.mockRejectedValueOnce(new Error('nope'))
      const onOpenRide = jest.fn()
      const user = userEvent.setup()
      render(<NotificationsBell onOpenRide={onOpenRide} />)
      await openPanel(user)

      await user.click(screen.getByText(ACCEPTED_TEXT))

      await waitFor(() =>
        expect(onOpenRide).toHaveBeenCalledWith('ride-1', 'joined'),
      )
    })
  })

  describe('dismissing', () => {
    it('closes on Escape', async () => {
      const user = userEvent.setup()
      render(<NotificationsBell />)
      await openPanel(user)

      await user.keyboard('{Escape}')

      expect(
        screen.queryByRole('heading', { name: 'Notifications' }),
      ).not.toBeInTheDocument()
    })

    it('closes when clicking outside', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <button type="button">Elsewhere</button>
          <NotificationsBell />
        </div>,
      )
      await openPanel(user)

      await user.click(screen.getByRole('button', { name: 'Elsewhere' }))

      expect(
        screen.queryByRole('heading', { name: 'Notifications' }),
      ).not.toBeInTheDocument()
    })
  })
})
