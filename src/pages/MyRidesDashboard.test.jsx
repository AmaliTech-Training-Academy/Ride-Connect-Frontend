import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import MyRidesDashboard from './MyRidesDashboard'
import {
  acceptPassengerRequest,
  declinePassengerRequest,
  fetchMyRides,
  updateRideStatus,
} from '../services/rides'
import { buildMyRidesResponse } from './myRidesMockData'

jest.mock('../services/rides', () => ({
  fetchMyRides: jest.fn(),
  updateRideStatus: jest.fn(),
  acceptPassengerRequest: jest.fn(),
  declinePassengerRequest: jest.fn(),
  RideStatusError: class RideStatusError extends Error {
    constructor(message, status) {
      super(message)
      this.name = 'RideStatusError'
      this.status = status
    }
  },
}))

/**
 * Renders the screen and waits for the initial fetch to settle, so tests can
 * act on the list straight away.
 */
async function renderDashboard(props = {}) {
  const result = render(
    <MyRidesDashboard
      onFindRide={jest.fn()}
      onOfferRide={jest.fn()}
      {...props}
    />,
  )
  await screen.findByText('Upcoming')
  return result
}

describe('MyRidesDashboard - Ride Status Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fetchMyRides.mockResolvedValue(buildMyRidesResponse())
    acceptPassengerRequest.mockResolvedValue({ success: true })
    declinePassengerRequest.mockResolvedValue({ success: true })
  })

  it('accepts requests until a ride is full and blocks remaining requests', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    expect(screen.getByText('3 new requests')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])

    expect(acceptPassengerRequest).toHaveBeenCalledWith(
      'driving-1',
      'request-1',
    )
    expect(
      await screen.findByText('Nana Yeboah has been added to your ride.'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 of 4 seats left')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])

    expect(acceptPassengerRequest).toHaveBeenCalledWith(
      'driving-1',
      'request-2',
    )
    expect(screen.getByText('0 of 4 seats left')).toBeInTheDocument()
    expect(screen.getByText('full')).toBeInTheDocument()
    expect(screen.getByText(/This ride is now full/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled()
  })

  it('declines a request, displays a toast, and updates the pending list', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])
    expect(declinePassengerRequest).toHaveBeenCalledWith(
      'driving-1',
      'request-1',
    )
    expect(
      await screen.findByText('Declined request from Nana Yeboah.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Requested 8 min ago')).not.toBeInTheDocument()
  })

  it('handles error when accepting request fails', async () => {
    acceptPassengerRequest.mockRejectedValueOnce(
      new Error('Failed to accept passenger request.'),
    )

    const user = userEvent.setup()
    await renderDashboard()

    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])
    expect(
      await screen.findByText('Failed to accept passenger request.'),
    ).toBeInTheDocument()
  })

  it('cancels a ride via API, closes modal, and renders in Past & cancelled', async () => {
    updateRideStatus.mockResolvedValueOnce({
      id: 'driving-2',
      status: 'CANCELLED',
      availableSeats: 0,
    })

    const user = userEvent.setup()
    await renderDashboard()

    await user.click(screen.getByRole('button', { name: /Options for Adenta/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel ride' }))
    expect(
      screen.getByRole('heading', { name: 'Cancel this ride?' }),
    ).toBeInTheDocument()

    // Confirm cancel
    await user.click(
      screen.getAllByRole('button', { name: 'Cancel ride' }).at(-1),
    )

    expect(updateRideStatus).toHaveBeenCalledWith('driving-2', 'CANCELLED')
    expect(
      await screen.findByText('Ride has been cancelled.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Past & cancelled (3)')).toBeInTheDocument()

    // Toggle Past & cancelled section
    await user.click(screen.getByText(/Past & cancelled/))
    expect(
      screen.getByText('No actions available on past or cancelled rides.'),
    ).toBeInTheDocument()
  })

  it('manually marks a ride as Full and then reopens it', async () => {
    updateRideStatus.mockResolvedValueOnce({
      id: 'driving-2',
      status: 'FULL',
      availableSeats: 3,
    })

    const user = userEvent.setup()
    await renderDashboard()

    // Mark as Full
    await user.click(screen.getByRole('button', { name: /Options for Adenta/ }))
    await user.click(screen.getByRole('button', { name: 'Mark as Full' }))

    expect(updateRideStatus).toHaveBeenCalledWith('driving-2', 'FULL')
    expect(await screen.findByText('Ride marked as full.')).toBeInTheDocument()

    // Reopen ride
    updateRideStatus.mockResolvedValueOnce({
      id: 'driving-2',
      status: 'OPEN',
      availableSeats: 3,
    })

    await user.click(screen.getByRole('button', { name: /Options for Adenta/ }))
    await user.click(screen.getByRole('button', { name: 'Reopen ride' }))

    expect(updateRideStatus).toHaveBeenCalledWith('driving-2', 'OPEN')
    expect(
      await screen.findByText('Ride reopened for bookings.'),
    ).toBeInTheDocument()
  })

  it('handles API error when updating ride status', async () => {
    const error = new Error('This ride is already FULL.')
    error.status = 409
    updateRideStatus.mockRejectedValueOnce(error)

    const user = userEvent.setup()
    await renderDashboard()

    await user.click(screen.getByRole('button', { name: /Options for Adenta/ }))
    await user.click(screen.getByRole('button', { name: 'Mark as Full' }))

    expect(
      await screen.findByText('This ride is already FULL.'),
    ).toBeInTheDocument()
  })

  it('allows user to dismiss cancel modal without cancelling ride', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    await user.click(screen.getByRole('button', { name: /Options for Adenta/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel ride' }))
    expect(
      screen.getByRole('heading', { name: 'Cancel this ride?' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Keep ride' }))
    expect(
      screen.queryByRole('heading', { name: 'Cancel this ride?' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Past & cancelled (2)')).toBeInTheDocument()
    expect(updateRideStatus).not.toHaveBeenCalled()
  })

  it('switches to joined rides tab and renders placeholder', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    await user.click(screen.getByRole('tab', { name: /Rides I.ve joined/ }))
    expect(
      screen.getByRole('heading', { name: 'Coming soon' }),
    ).toBeInTheDocument()
  })

  describe('regressions', () => {
    it('switches the menu to another ride instead of closing it', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(
        screen.getByRole('button', { name: /Options for East Legon/ }),
      )
      expect(
        screen.getByRole('button', { name: /Options for East Legon/ }),
      ).toHaveAttribute('aria-expanded', 'true')

      // Clicking a second ride's kebab used to bubble to the page-level
      // dismiss handler and close the menu outright.
      await user.click(
        screen.getByRole('button', { name: /Options for Adenta/ }),
      )

      expect(
        screen.getByRole('button', { name: /Options for Adenta/ }),
      ).toHaveAttribute('aria-expanded', 'true')
      expect(
        screen.getByRole('button', { name: /Options for East Legon/ }),
      ).toHaveAttribute('aria-expanded', 'false')
      expect(
        screen.getByRole('button', { name: 'Cancel ride' }),
      ).toBeInTheDocument()
    })

    it('renders the menu inside the card it belongs to', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      const kebab = screen.getByRole('button', { name: /Options for Adenta/ })
      await user.click(kebab)

      const menu = screen
        .getByRole('button', { name: 'Cancel ride' })
        .closest('.my-rides-context-menu')
      expect(kebab.closest('.my-rides-card')).toContainElement(menu)
    })

    it('closes the menu when clicking elsewhere on the page', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(
        screen.getByRole('button', { name: /Options for Adenta/ }),
      )
      expect(
        screen.getByRole('button', { name: 'Cancel ride' }),
      ).toBeInTheDocument()

      await user.click(screen.getByRole('heading', { name: 'My rides' }))
      expect(
        screen.queryByRole('button', { name: 'Cancel ride' }),
      ).not.toBeInTheDocument()
    })

    it('sends only one accept call when the button is double-clicked', async () => {
      const user = userEvent.setup()
      let releaseAccept
      acceptPassengerRequest.mockImplementation(
        () =>
          new Promise((resolve) => {
            releaseAccept = resolve
          }),
      )
      await renderDashboard()

      const accept = screen.getAllByRole('button', { name: 'Accept' })[0]
      await user.click(accept)
      expect(accept).toBeDisabled()
      await user.click(accept)

      expect(acceptPassengerRequest).toHaveBeenCalledTimes(1)

      releaseAccept({})
      expect(
        await screen.findByText('Nana Yeboah has been added to your ride.'),
      ).toBeInTheDocument()
      expect(screen.getByText('1 of 4 seats left')).toBeInTheDocument()
    })

    it('sends only one decline call when the button is double-clicked', async () => {
      const user = userEvent.setup()
      let releaseDecline
      declinePassengerRequest.mockImplementation(
        () =>
          new Promise((resolve) => {
            releaseDecline = resolve
          }),
      )
      await renderDashboard()

      const decline = screen.getAllByRole('button', { name: 'Decline' })[0]
      await user.click(decline)
      await user.click(decline)

      expect(declinePassengerRequest).toHaveBeenCalledTimes(1)
      releaseDecline({})
      expect(
        await screen.findByText('Declined request from Nana Yeboah.'),
      ).toBeInTheDocument()
    })

    it('sends only one status call when a menu item is double-clicked', async () => {
      const user = userEvent.setup()
      let releaseStatus
      updateRideStatus.mockImplementation(
        () =>
          new Promise((resolve) => {
            releaseStatus = resolve
          }),
      )
      await renderDashboard()

      await user.click(
        screen.getByRole('button', { name: /Options for Adenta/ }),
      )
      await user.click(screen.getByRole('button', { name: 'Mark as Full' }))
      // The menu closes on click, so reopen and fire the same action again.
      await user.click(
        screen.getByRole('button', { name: /Options for Adenta/ }),
      )
      await user.click(screen.getByRole('button', { name: 'Mark as Full' }))

      expect(updateRideStatus).toHaveBeenCalledTimes(1)
      releaseStatus({ id: 'driving-2', status: 'FULL', availableSeats: 3 })
      expect(
        await screen.findByText('Ride marked as full.'),
      ).toBeInTheDocument()
    })

    it('marks a failed action with an error toast, not the success check', async () => {
      const user = userEvent.setup()
      const error = new Error('Request not found')
      error.status = 404
      declinePassengerRequest.mockRejectedValueOnce(error)
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])

      const toast = await screen.findByRole('alert')
      expect(toast).toHaveTextContent('Request not found')
      expect(toast).toHaveClass('my-rides-toast-error')
      expect(toast.querySelector('.fa-circle-check')).toBeNull()
    })

    it('keeps the success check on a successful action', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])

      const toast = await screen.findByRole('status')
      expect(toast).toHaveClass('my-rides-toast-success')
      expect(toast.querySelector('.fa-circle-check')).not.toBeNull()
    })
  })

  describe('accept seat reconciliation', () => {
    it("uses the server's availableSeats when the response carries it", async () => {
      const user = userEvent.setup()
      // Server says 0 left even though a local decrement would say 1.
      acceptPassengerRequest.mockResolvedValueOnce({ availableSeats: 0 })
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])

      expect(await screen.findByText('0 of 4 seats left')).toBeInTheDocument()
      expect(screen.getByText('full')).toBeInTheDocument()
    })

    it('falls back to a local decrement when the response omits seats', async () => {
      const user = userEvent.setup()
      acceptPassengerRequest.mockResolvedValueOnce({
        id: 'request-1',
        status: 'ACCEPTED',
      })
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])

      expect(await screen.findByText('1 of 4 seats left')).toBeInTheDocument()
    })
  })

  describe('cancel modal failure handling', () => {
    const openCancelModal = async (user) => {
      await user.click(
        screen.getByRole('button', { name: /Options for Adenta/ }),
      )
      await user.click(screen.getByRole('button', { name: 'Cancel ride' }))
    }

    it('keeps the modal open and shows the reason when cancelling fails', async () => {
      const user = userEvent.setup()
      const error = new Error(
        'Only the driver who owns this ride can change its status.',
      )
      error.status = 403
      updateRideStatus.mockRejectedValueOnce(error)
      await renderDashboard()

      await openCancelModal(user)
      await user.click(screen.getByRole('button', { name: 'Cancel ride' }))

      expect(
        screen.getByRole('heading', { name: 'Cancel this ride?' }),
      ).toBeInTheDocument()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Only the driver who owns this ride can change its status.',
      )
      // The ride is untouched, so it stays in Upcoming.
      expect(screen.getByText('Past & cancelled (2)')).toBeInTheDocument()
    })

    it('lets the user retry after a failure and closes on success', async () => {
      const user = userEvent.setup()
      const error = new Error('Something went wrong')
      error.status = 500
      updateRideStatus.mockRejectedValueOnce(error).mockResolvedValueOnce({
        id: 'driving-2',
        status: 'CANCELLED',
        availableSeats: 0,
      })
      await renderDashboard()

      await openCancelModal(user)
      await user.click(screen.getByRole('button', { name: 'Cancel ride' }))
      expect(await screen.findByRole('alert')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Try again' }))

      expect(
        screen.queryByRole('heading', { name: 'Cancel this ride?' }),
      ).not.toBeInTheDocument()
      expect(
        await screen.findByText('Ride has been cancelled.'),
      ).toBeInTheDocument()
      expect(screen.getByText('Past & cancelled (3)')).toBeInTheDocument()
      expect(updateRideStatus).toHaveBeenCalledTimes(2)
    })

    it('closes the modal and signs out on a 401', async () => {
      const user = userEvent.setup()
      const onUnauthorized = jest.fn()
      const error = new Error('Session expired')
      error.status = 401
      updateRideStatus.mockRejectedValueOnce(error)
      await renderDashboard({ onUnauthorized })

      await openCancelModal(user)
      await user.click(screen.getByRole('button', { name: 'Cancel ride' }))

      expect(onUnauthorized).toHaveBeenCalled()
      expect(
        screen.queryByRole('heading', { name: 'Cancel this ride?' }),
      ).not.toBeInTheDocument()
    })
  })

  describe('keyboard and focus', () => {
    it('moves focus into the dialog and back to the trigger on close', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      const kebab = screen.getByRole('button', { name: /Options for Adenta/ })
      await user.click(kebab)
      await user.click(screen.getByRole('button', { name: 'Cancel ride' }))

      expect(screen.getByRole('button', { name: 'Keep ride' })).toHaveFocus()

      await user.click(screen.getByRole('button', { name: 'Keep ride' }))
      expect(kebab).toHaveFocus()
    })

    it('keeps Tab inside the dialog', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(
        screen.getByRole('button', { name: /Options for Adenta/ }),
      )
      await user.click(screen.getByRole('button', { name: 'Cancel ride' }))

      const keep = screen.getByRole('button', { name: 'Keep ride' })
      const confirm = screen.getByRole('button', { name: 'Cancel ride' })

      expect(keep).toHaveFocus()
      await user.tab()
      expect(confirm).toHaveFocus()
      // Wraps rather than escaping to the ride list behind the dialog.
      await user.tab()
      expect(keep).toHaveFocus()
      await user.tab({ shift: true })
      expect(confirm).toHaveFocus()
    })

    it('closes the dialog on Escape without cancelling the ride', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(
        screen.getByRole('button', { name: /Options for Adenta/ }),
      )
      await user.click(screen.getByRole('button', { name: 'Cancel ride' }))

      await user.keyboard('{Escape}')

      expect(
        screen.queryByRole('heading', { name: 'Cancel this ride?' }),
      ).not.toBeInTheDocument()
      expect(updateRideStatus).not.toHaveBeenCalled()
    })

    it('closes the ride menu on Escape', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      const kebab = screen.getByRole('button', { name: /Options for Adenta/ })
      await user.click(kebab)
      expect(kebab).toHaveAttribute('aria-expanded', 'true')

      await user.keyboard('{Escape}')

      expect(kebab).toHaveAttribute('aria-expanded', 'false')
      expect(
        screen.queryByRole('button', { name: 'Mark as Full' }),
      ).not.toBeInTheDocument()
    })
  })

  describe('loading my rides', () => {
    it('fetches once on mount and renders the driving rides', async () => {
      await renderDashboard()

      expect(fetchMyRides).toHaveBeenCalledTimes(1)
      expect(
        screen.getByRole('button', { name: /Options for East Legon/ }),
      ).toBeInTheDocument()
      expect(screen.getByText('2 of 4 seats left')).toBeInTheDocument()
      expect(screen.getByText('Past & cancelled (2)')).toBeInTheDocument()
    })

    it('shows a loading state until the fetch settles', async () => {
      let release
      fetchMyRides.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = resolve
          }),
      )
      render(
        <MyRidesDashboard onFindRide={jest.fn()} onOfferRide={jest.fn()} />,
      )

      expect(screen.getByText('Loading your rides...')).toBeInTheDocument()
      expect(screen.queryByText('Upcoming')).not.toBeInTheDocument()

      release(buildMyRidesResponse())
      expect(await screen.findByText('Upcoming')).toBeInTheDocument()
      expect(
        screen.queryByText('Loading your rides...'),
      ).not.toBeInTheDocument()
    })

    it('derives initials and request age from the payload', async () => {
      await renderDashboard()

      // "Nana Yeboah" requested 8 minutes ago in the fixture.
      expect(screen.getByText('Requested 8 min ago')).toBeInTheDocument()
      expect(screen.getByText('NY')).toBeInTheDocument()
      expect(screen.getByText('Abena Owusu')).toBeInTheDocument()
      expect(screen.getByText('AO')).toBeInTheDocument()
    })

    it('expands the first upcoming ride so its requests are visible', async () => {
      await renderDashboard()

      expect(
        screen.getByRole('heading', { name: 'Join requests' }),
      ).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(3)
    })

    it('shows the empty state when the driver has no upcoming rides', async () => {
      const payload = buildMyRidesResponse()
      payload.data.driving = []
      fetchMyRides.mockResolvedValue(payload)

      render(
        <MyRidesDashboard onFindRide={jest.fn()} onOfferRide={jest.fn()} />,
      )

      expect(
        await screen.findByRole('heading', {
          name: "You haven't offered any rides yet.",
        }),
      ).toBeInTheDocument()
      // The past bucket still loaded, so it stays available.
      expect(screen.getByText('Past & cancelled (2)')).toBeInTheDocument()
    })

    it('honours the server bucket for a past ride that does not look past', async () => {
      const payload = buildMyRidesResponse()
      // Departs tomorrow and is OPEN, but the server filed it under past.
      payload.data.pastAndCancelled.push({
        ...payload.data.driving[0],
        id: 'server-says-past',
        origin: 'Weija',
        pendingRequests: [],
        confirmedPassengers: [],
      })
      fetchMyRides.mockResolvedValue(payload)

      await renderDashboard()

      expect(screen.getByText('Past & cancelled (3)')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /Options for Weija/ }),
      ).not.toBeInTheDocument()
    })

    it('signs the user out when the load returns a 401', async () => {
      const onUnauthorized = jest.fn()
      const error = new Error('Session expired')
      error.status = 401
      fetchMyRides.mockRejectedValue(error)

      render(
        <MyRidesDashboard
          onFindRide={jest.fn()}
          onOfferRide={jest.fn()}
          onUnauthorized={onUnauthorized}
        />,
      )

      await waitFor(() => expect(onUnauthorized).toHaveBeenCalled())
    })

    it('shows the failure reason and retries on request', async () => {
      const error = new Error('Failed to load your rides (503)')
      error.status = 503
      fetchMyRides.mockRejectedValueOnce(error)

      const user = userEvent.setup()
      render(
        <MyRidesDashboard onFindRide={jest.fn()} onOfferRide={jest.fn()} />,
      )

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Failed to load your rides (503)')

      fetchMyRides.mockResolvedValueOnce(buildMyRidesResponse())
      await user.click(screen.getByRole('button', { name: 'Try again' }))

      expect(await screen.findByText('Upcoming')).toBeInTheDocument()
      expect(fetchMyRides).toHaveBeenCalledTimes(2)
    })
  })

  describe('driving tab badge', () => {
    it('counts every pending request, not the rides holding them', async () => {
      await renderDashboard()

      // Fixture: driving-1 has 3 requests, driving-3 has 1, driving-2 has none.
      const drivingTab = screen.getByRole('tab', { name: /Rides I.m driving/ })
      expect(drivingTab).toHaveTextContent('4')
    })

    it('hides the badge when nothing is waiting', async () => {
      const payload = buildMyRidesResponse()
      payload.data.driving = payload.data.driving.map((ride) => ({
        ...ride,
        pendingRequests: [],
      }))
      fetchMyRides.mockResolvedValue(payload)

      await renderDashboard()

      const drivingTab = screen.getByRole('tab', { name: /Rides I.m driving/ })
      expect(drivingTab.querySelector('.my-rides-count-badge')).toBeNull()
    })

    it('drops the count as requests are accepted', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      const drivingTab = screen.getByRole('tab', { name: /Rides I.m driving/ })
      expect(drivingTab).toHaveTextContent('4')

      await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])
      await screen.findByText('Nana Yeboah has been added to your ride.')

      expect(drivingTab).toHaveTextContent('3')
    })

    it('ignores requests on past rides', async () => {
      const payload = buildMyRidesResponse()
      payload.data.pastAndCancelled[0].pendingRequests = [
        {
          id: 'stale-request',
          passengerId: 'p-stale',
          passengerName: 'Stale Request',
          createdAt: new Date().toISOString(),
        },
      ]
      fetchMyRides.mockResolvedValue(payload)

      await renderDashboard()

      const drivingTab = screen.getByRole('tab', { name: /Rides I.m driving/ })
      expect(drivingTab).toHaveTextContent('4')
    })
  })

  describe('expanded ride with nothing in it', () => {
    it('explains the empty panel instead of rendering a blank area', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      // driving-2 has no requests and no passengers. The route text is split
      // across nodes by the arrow icon, so reach the card via its kebab.
      const card = screen
        .getByRole('button', { name: /Options for Adenta/ })
        .closest('.my-rides-card')
      await user.click(card.querySelector('.my-rides-summary-button'))

      expect(screen.getByText(/No join requests yet/)).toBeInTheDocument()
    })

    it('does not show the note when the ride has passengers', async () => {
      await renderDashboard()

      // driving-1 is expanded by default and has both requests and passengers.
      expect(screen.queryByText(/No join requests yet/)).not.toBeInTheDocument()
    })
  })
})
