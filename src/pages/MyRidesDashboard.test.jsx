import { render, screen } from '@testing-library/react'
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
/**
 * Decline opens a confirm step, then a reason step. The backend requires the
 * reason, so one is always typed.
 */
async function declineThroughDialog(
  user,
  { index = 0, reason = 'Car is already full.' } = {},
) {
  await user.click(screen.getAllByRole('button', { name: 'Decline' })[index])
  await user.click(screen.getByRole('button', { name: 'Yes, decline' }))
  await user.type(screen.getByLabelText(/Reason/), reason)
  await user.click(screen.getByRole('button', { name: /Decline request/ }))
}

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

    await declineThroughDialog(user)
    expect(declinePassengerRequest).toHaveBeenCalledWith(
      'driving-1',
      'request-1',
      'Car is already full.',
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

  describe('rides I have joined', () => {
    function joinedRide(overrides = {}) {
      return {
        id: 'ride-10',
        driverId: 'driver-1',
        driverName: 'Ama Owusu',
        origin: 'Madina',
        destination: 'AmaliTech Office',
        routeDescription: null,
        departureAt: '2099-09-19T08:15:00.000Z',
        totalSeats: 4,
        availableSeats: 2,
        status: 'OPEN',
        requestId: 'request-10',
        requestStatus: 'PENDING',
        requestedAt: '2099-09-18T08:00:00.000Z',
        ...overrides,
      }
    }

    it('splits joined rides into pending and approved sections', async () => {
      const user = userEvent.setup()
      const payload = buildMyRidesResponse()
      payload.data.joined = [
        joinedRide({ requestStatus: 'PENDING' }),
        joinedRide({
          id: 'ride-11',
          requestId: 'request-11',
          driverName: 'Kojo Mensah',
          requestStatus: 'ACCEPTED',
        }),
      ]
      fetchMyRides.mockResolvedValue(payload)
      await renderDashboard()

      await user.click(screen.getByRole('tab', { name: /Rides I.ve joined/ }))

      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Driver: Ama Owusu')).toBeInTheDocument()
      expect(screen.getByText('Approved')).toBeInTheDocument()
      expect(screen.getByText('Driver: Kojo Mensah')).toBeInTheDocument()
    })

    it('shows the empty state when nothing has been requested', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(screen.getByRole('tab', { name: /Rides I.ve joined/ }))

      expect(
        await screen.findByRole('heading', {
          name: "You haven't requested any rides yet.",
        }),
      ).toBeInTheDocument()
    })

    it('shows a not-yet-available message when withdrawing a request', async () => {
      const user = userEvent.setup()
      const payload = buildMyRidesResponse()
      payload.data.joined = [joinedRide()]
      fetchMyRides.mockResolvedValue(payload)
      await renderDashboard()

      await user.click(screen.getByRole('tab', { name: /Rides I.ve joined/ }))
      await user.click(screen.getByRole('button', { name: 'Withdraw request' }))

      expect(
        await screen.findByText("Withdrawing a request isn't available yet."),
      ).toBeInTheDocument()
    })

    it('shows the error state when the load fails', async () => {
      const error = new Error('Session expired')
      error.status = 401
      fetchMyRides.mockRejectedValue(error)
      const user = userEvent.setup()

      render(
        <MyRidesDashboard onFindRide={jest.fn()} onOfferRide={jest.fn()} />,
      )

      await user.click(
        await screen.findByRole('tab', { name: /Rides I.ve joined/ }),
      )

      expect(
        await screen.findByRole('heading', {
          name: "Couldn't load your joined rides",
        }),
      ).toBeInTheDocument()
    })
  })

  describe('managed ride deep link', () => {
    it('expands the ride passed in managedRideId instead of the first upcoming one', async () => {
      await renderDashboard({ managedRideId: 'driving-2' })

      // driving-2 has no requests, so its empty-panel note proves it (not
      // driving-1, the default) is the one expanded.
      expect(screen.getByText(/No join requests yet/)).toBeInTheDocument()
    })

    it('falls back to the first upcoming ride when the id does not match', async () => {
      await renderDashboard({ managedRideId: 'does-not-exist' })

      expect(
        screen.getByRole('heading', { name: 'Join requests' }),
      ).toBeInTheDocument()
    })
  })

  describe('account menu', () => {
    it('logs out from the account menu popover', async () => {
      const user = userEvent.setup()
      const onLogout = jest.fn()
      await renderDashboard({ onLogout })

      await user.click(screen.getByRole('button', { name: 'Account menu' }))
      await user.click(screen.getByRole('menuitem', { name: /logout/i }))

      expect(onLogout).toHaveBeenCalled()
    })
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

      // The guard now sits on the dialog's confirm button, since the row's
      // Decline only opens the dialog.
      await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])
      await user.click(screen.getByRole('button', { name: 'Yes, decline' }))
      await user.type(screen.getByLabelText(/Reason/), 'Car is full')
      const confirm = screen.getByRole('button', { name: /Decline request/ })
      await user.click(confirm)
      await user.click(confirm)

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
      acceptPassengerRequest.mockRejectedValueOnce(error)
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])

      const toast = await screen.findByRole('alert')
      expect(toast).toHaveTextContent('Request not found')
      expect(toast).toHaveClass('my-rides-toast-error')
      expect(toast.querySelector('.fa-circle-check')).toBeNull()
    })

    it('keeps the success check on a successful action', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await declineThroughDialog(user)

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

    it('reports a 401 inline and leaves the redirect to the API layer', async () => {
      const user = userEvent.setup()
      const error = new Error('Session expired')
      error.status = 401
      updateRideStatus.mockRejectedValueOnce(error)
      await renderDashboard()

      await openCancelModal(user)
      await user.click(screen.getByRole('button', { name: 'Cancel ride' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Session expired',
      )
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

    it('shows the error state when the load returns a 401', async () => {
      const error = new Error('Session expired')
      error.status = 401
      fetchMyRides.mockRejectedValue(error)

      render(
        <MyRidesDashboard onFindRide={jest.fn()} onOfferRide={jest.fn()} />,
      )

      // Redirecting is the API layer's job; the screen only reports.
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Session expired',
      )
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

  describe('serialising mutations per ride', () => {
    it('blocks a second request on the same ride while one is in flight', async () => {
      const user = userEvent.setup()
      let release
      acceptPassengerRequest.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = resolve
          }),
      )
      await renderDashboard()

      const accepts = screen.getAllByRole('button', { name: 'Accept' })
      expect(accepts).toHaveLength(3)

      await user.click(accepts[0])

      // Every action on that ride is locked, not just the one clicked.
      screen
        .getAllByRole('button', { name: 'Accept' })
        .forEach((button) => expect(button).toBeDisabled())
      screen
        .getAllByRole('button', { name: 'Decline' })
        .forEach((button) => expect(button).toBeDisabled())

      await user.click(accepts[1])
      expect(acceptPassengerRequest).toHaveBeenCalledTimes(1)

      release({})
      await screen.findByText('Nana Yeboah has been added to your ride.')
      expect(screen.getAllByRole('button', { name: 'Accept' })[0]).toBeEnabled()
    })

    it('blocks a status change while a request is being accepted', async () => {
      const user = userEvent.setup()
      let release
      acceptPassengerRequest.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = resolve
          }),
      )
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])

      await user.click(
        screen.getByRole('button', { name: /Options for East Legon/ }),
      )
      expect(
        screen.getByRole('button', { name: 'Mark as Full' }),
      ).toBeDisabled()
      expect(updateRideStatus).not.toHaveBeenCalled()

      release({})
      await screen.findByText('Nana Yeboah has been added to your ride.')
    })

    it('leaves other rides usable while one is locked', async () => {
      const user = userEvent.setup()
      let release
      acceptPassengerRequest.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = resolve
          }),
      )
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])

      // driving-2 is a different ride and should not be affected.
      await user.click(
        screen.getByRole('button', { name: /Options for Adenta/ }),
      )
      expect(screen.getByRole('button', { name: 'Mark as Full' })).toBeEnabled()

      release({})
      await screen.findByText('Nana Yeboah has been added to your ride.')
    })

    it('serialises a decline against an accept on the same ride', async () => {
      const user = userEvent.setup()
      let release
      declinePassengerRequest.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = resolve
          }),
      )
      await renderDashboard()

      await declineThroughDialog(user)
      await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])

      expect(acceptPassengerRequest).not.toHaveBeenCalled()
      expect(declinePassengerRequest).toHaveBeenCalledTimes(1)

      release({})
      await screen.findByText('Declined request from Nana Yeboah.')
    })
  })

  describe('declining with a reason', () => {
    it('asks for confirmation instead of declining straight away', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])

      expect(
        screen.getByRole('heading', { name: "Decline Nana Yeboah's request?" }),
      ).toBeInTheDocument()
      expect(declinePassengerRequest).not.toHaveBeenCalled()
    })

    it('keeps the request when the driver backs out', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])
      await user.click(screen.getByRole('button', { name: 'Keep request' }))

      expect(
        screen.queryByRole('heading', { name: /Decline .* request\?/ }),
      ).not.toBeInTheDocument()
      expect(declinePassengerRequest).not.toHaveBeenCalled()
      expect(screen.getByText('Requested 8 min ago')).toBeInTheDocument()
    })

    it('asks for a reason only after the driver confirms', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])
      expect(screen.queryByLabelText('Reason')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Yes, decline' }))

      expect(screen.getByLabelText(/Reason/)).toBeInTheDocument()
      expect(declinePassengerRequest).not.toHaveBeenCalled()
    })

    it('sends the reason the driver typed', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await declineThroughDialog(user, { reason: '  The car is full  ' })

      expect(declinePassengerRequest).toHaveBeenCalledWith(
        'driving-1',
        'request-1',
        '  The car is full  ',
      )
      expect(
        await screen.findByText('Declined request from Nana Yeboah.'),
      ).toBeInTheDocument()
    })

    it('blocks the decline until a reason is given', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])
      await user.click(screen.getByRole('button', { name: 'Yes, decline' }))

      const confirm = screen.getByRole('button', { name: /Decline request/ })
      expect(confirm).toBeDisabled()

      // Whitespace alone is not a reason; the backend trims before validating.
      await user.type(screen.getByLabelText(/Reason/), '   ')
      expect(confirm).toBeDisabled()

      await user.type(screen.getByLabelText(/Reason/), 'No space left')
      expect(confirm).toBeEnabled()
    })

    it('shows the backend field error when the reason is rejected', async () => {
      const user = userEvent.setup()
      const error = new Error('A reason is required.')
      error.status = 400
      declinePassengerRequest.mockRejectedValueOnce(error)
      await renderDashboard()

      await declineThroughDialog(user, { reason: 'x' })

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A reason is required.',
      )
    })

    it('can step back to the confirmation without losing the dialog', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])
      await user.click(screen.getByRole('button', { name: 'Yes, decline' }))
      await user.click(screen.getByRole('button', { name: 'Back' }))

      expect(
        screen.getByRole('heading', { name: "Decline Nana Yeboah's request?" }),
      ).toBeInTheDocument()
      expect(declinePassengerRequest).not.toHaveBeenCalled()
    })

    it('counts the characters typed', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])
      await user.click(screen.getByRole('button', { name: 'Yes, decline' }))
      await user.type(screen.getByLabelText(/Reason/), 'Full')

      expect(screen.getByText('4/500')).toBeInTheDocument()
    })

    it('keeps the dialog open with the reason intact when the call fails', async () => {
      const user = userEvent.setup()
      const error = new Error('Request not found')
      error.status = 404
      declinePassengerRequest.mockRejectedValueOnce(error)
      await renderDashboard()

      await declineThroughDialog(user, { reason: 'No space' })

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Request not found',
      )
      // The typed reason survives so a retry does not start from scratch.
      expect(screen.getByLabelText(/Reason/)).toHaveValue('No space')

      declinePassengerRequest.mockResolvedValueOnce({})
      await user.click(screen.getByRole('button', { name: 'Try again' }))

      expect(
        await screen.findByText('Declined request from Nana Yeboah.'),
      ).toBeInTheDocument()
    })

    it('closes on Escape without declining', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])
      await user.keyboard('{Escape}')

      expect(
        screen.queryByRole('heading', { name: /Decline .* request\?/ }),
      ).not.toBeInTheDocument()
      expect(declinePassengerRequest).not.toHaveBeenCalled()
    })

    it('returns focus to the Decline button it came from', async () => {
      const user = userEvent.setup()
      await renderDashboard()

      const decline = screen.getAllByRole('button', { name: 'Decline' })[0]
      await user.click(decline)
      expect(screen.getByRole('button', { name: 'Keep request' })).toHaveFocus()

      await user.click(screen.getByRole('button', { name: 'Keep request' }))
      expect(decline).toHaveFocus()
    })
  })

  describe('a passenger whose request was declined', () => {
    const withDeclined = (overrides = {}) => {
      const p = buildMyRidesResponse()
      p.data.joined = [
        {
          id: 'joined-1',
          driverId: 'driver-9',
          driverName: 'Ama Owusu',
          origin: 'Tema',
          destination: 'AmaliTech Office',
          departureAt: new Date(Date.now() + 86400000).toISOString(),
          totalSeats: 3,
          availableSeats: 1,
          status: 'OPEN',
          requestId: 'req-9',
          requestStatus: 'DECLINED',
          rejectionReason: 'Car is already full.',
          rerequestCount: 0,
          ...overrides,
        },
      ]
      return p
    }

    const openJoinedTab = async (user) => {
      await user.click(screen.getByRole('tab', { name: /Rides I.ve joined/ }))
    }

    it('shows the declined request instead of dropping it silently', async () => {
      fetchMyRides.mockResolvedValue(withDeclined())
      const user = userEvent.setup()
      await renderDashboard()
      await openJoinedTab(user)

      expect(
        await screen.findByRole('heading', { name: 'Declined' }),
      ).toBeInTheDocument()
      expect(screen.getByText('declined')).toBeInTheDocument()
    })

    it('shows the reason the driver gave', async () => {
      fetchMyRides.mockResolvedValue(withDeclined())
      const user = userEvent.setup()
      await renderDashboard()
      await openJoinedTab(user)

      expect(
        await screen.findByText(/Car is already full\./),
      ).toBeInTheDocument()
      expect(screen.getByText('Ama Owusu said:')).toBeInTheDocument()
    })

    it('says so plainly when no reason came back', async () => {
      fetchMyRides.mockResolvedValue(withDeclined({ rejectionReason: '' }))
      const user = userEvent.setup()
      await renderDashboard()
      await openJoinedTab(user)

      expect(
        await screen.findByText('The driver did not give a reason.'),
      ).toBeInTheDocument()
    })

    it('does not offer to withdraw a request already refused', async () => {
      fetchMyRides.mockResolvedValue(withDeclined())
      const user = userEvent.setup()
      await renderDashboard()
      await openJoinedTab(user)

      await screen.findByRole('heading', { name: 'Declined' })
      expect(
        screen.queryByRole('button', { name: 'Withdraw request' }),
      ).not.toBeInTheDocument()
    })

    it('still offers to withdraw a pending request', async () => {
      fetchMyRides.mockResolvedValue(
        withDeclined({ requestStatus: 'PENDING', rejectionReason: '' }),
      )
      const user = userEvent.setup()
      await renderDashboard()
      await openJoinedTab(user)

      expect(
        await screen.findByRole('button', { name: 'Withdraw request' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByText(/did not give a reason/),
      ).not.toBeInTheDocument()
    })
  })
})
