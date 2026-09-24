import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { apiFetch } from '../lib/api'
import FindARide from './FindARide'
import {
  fetchMyRides,
  requestToJoinRide,
  withdrawRideRequest,
} from '../services/rides'

jest.mock('../lib/api', () => ({
  apiFetch: jest.fn(),
}))

// `jest.mock` on '../lib/api' does not reach the service's own import of it
// under this ESM setup, so the service is mocked directly.
jest.mock('../services/rides', () => ({
  fetchMyRides: jest.fn(),
  requestToJoinRide: jest.fn(),
  withdrawRideRequest: jest.fn(),
}))

function response(data, message = '') {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data, message }),
  }
}

function ride(overrides = {}) {
  return {
    id: 'ride-1',
    driverId: 'driver-1',
    driverName: 'Ama Owusu',
    origin: 'Madina',
    destination: 'AmaliTech Office',
    routeDescription: 'Via the main road.',
    departureAt: '2026-09-20T07:30:00.000Z',
    totalSeats: 4,
    availableSeats: 3,
    status: 'open',
    ...overrides,
  }
}

describe('FindARide', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue(response([ride()]))
    fetchMyRides.mockReset()
    fetchMyRides.mockResolvedValue({ data: { joined: [] } })
    requestToJoinRide.mockReset()
    requestToJoinRide.mockResolvedValue({ id: 'req-1', status: 'PENDING' })
    withdrawRideRequest.mockReset()
    withdrawRideRequest.mockResolvedValue({ status: 'WITHDRAWN' })
  })

  it('renders rides from a successful API response', async () => {
    render(<FindARide onOfferRide={jest.fn()} />)

    expect(await screen.findByText('Ama Owusu')).toBeInTheDocument()
    expect(screen.getByText('Madina')).toBeInTheDocument()
    expect(screen.getByText('3 of 4 seats left')).toBeInTheDocument()
  })

  it('renders loading cards while the request is pending', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    render(<FindARide onOfferRide={jest.fn()} />)

    expect(
      screen.getAllByText('', { selector: '.find-ride-skeleton' }),
    ).toHaveLength(6)
  })

  it('renders the filtered empty state using the response message', async () => {
    apiFetch.mockResolvedValue(response([], 'No rides found for this route.'))
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('No rides found for this route')

    const search = screen.getByRole('searchbox')
    await userEvent.setup().type(search, 'Kumasi')

    expect(
      await screen.findByRole('heading', {
        name: 'No rides found for this route',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Try a different date or route, or offer a ride yourself.',
      ),
    ).toBeInTheDocument()
  })

  it('renders the no-rides state when no filters are active', async () => {
    apiFetch.mockResolvedValue(response([], 'No rides found.'))
    render(<FindARide onOfferRide={jest.fn()} />)

    expect(
      await screen.findByRole('heading', { name: 'No rides found' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Be the first colleague to offer a ride to the office.'),
    ).toBeInTheDocument()
  })

  it('renders the error state for a failed response and retries', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({}),
    })
    apiFetch.mockResolvedValue(response([ride()]))
    render(<FindARide onOfferRide={jest.fn()} />)

    expect(
      await screen.findByRole('heading', { name: "Couldn't load rides" }),
    ).toBeInTheDocument()
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Ama Owusu')).toBeInTheDocument()
  })

  it('sends search and date filter query parameters', async () => {
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.type(screen.getByRole('searchbox'), 'Madina')
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/rides?search=Madina',
        expect.anything(),
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Tomorrow' }))
    const tomorrow = new Date()
    tomorrow.setHours(12, 0, 0, 0)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowISO = tomorrow.toISOString().slice(0, 10)
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        `/api/rides?date=${tomorrowISO}&search=Madina`,
        expect.anything(),
      ),
    )
  })

  it('renders own-ride and low-seat variants', async () => {
    apiFetch.mockResolvedValue(
      response([
        ride({ id: 'own', driverId: 'user-1' }),
        ride({
          id: 'low',
          driverId: 'driver-2',
          driverName: 'Kwame Mensah',
          availableSeats: 1,
        }),
      ]),
    )
    render(<FindARide currentUserId="user-1" onOfferRide={jest.fn()} />)

    expect(await screen.findByText('Your ride')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage' })).toBeInTheDocument()
    expect(screen.getByText('1 seat left')).toBeInTheDocument()
    expect(screen.getByText('Kwame Mensah').closest('article')).toHaveClass(
      'find-ride-card-low-seat',
    )
  })

  it('opens the managed ride action with the selected ride', async () => {
    const onManageRide = jest.fn()
    apiFetch.mockResolvedValue(
      response([ride({ id: 'own', driverId: 'user-1' })]),
    )
    render(
      <FindARide
        currentUserId="user-1"
        onManageRide={onManageRide}
        onOfferRide={jest.fn()}
      />,
    )

    await screen.findByText('Your ride')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Manage' }))

    expect(onManageRide).toHaveBeenCalledWith(expect.objectContaining({ id: 'own' }))
  })

  it('normalizes user and driver ID formatting when identifying own rides', async () => {
    apiFetch.mockResolvedValue(
      response([
        ride({ id: 'own', driverId: ' user-1 ' }),
        ride({
          id: 'other',
          driverId: 'driver-2',
          driverName: 'Daniel Bernoulli',
        }),
      ]),
    )
    render(<FindARide currentUserId="user-1" onOfferRide={jest.fn()} />)

    expect(await screen.findByText('Your ride')).toBeInTheDocument()
    expect(
      screen.getByText('Daniel Bernoulli').closest('article'),
    ).not.toHaveClass('find-ride-card-own')
    expect(screen.getByRole('button', { name: 'Manage' })).toBeInTheDocument()
  })

  it('shows the request success toast', async () => {
    const user = userEvent.setup()
    apiFetch.mockImplementation((path) => {
      if (path === '/api/rides/ride-1/requests') {
        return Promise.resolve({
          status: 201,
          ok: true,
          json: async () => ({
            success: true,
            message: 'Request submitted successfully',
            data: { id: 'request-1' },
          }),
        })
      }

      return Promise.resolve(response([ride()]))
    })
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.click(screen.getByRole('button', { name: 'Request to Join' }))

    expect(
      await screen.findByText(
        'Request sent to Ama Owusu. The driver will be notified.',
      ),
    ).toBeInTheDocument()
  })

  it('sends the join request for the ride that was clicked', async () => {
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.click(screen.getByRole('button', { name: 'Request to Join' }))

    await waitFor(() =>
      expect(requestToJoinRide).toHaveBeenCalledWith('ride-1'),
    )
  })

  it('marks the ride as requested and turns the button into a withdraw action', async () => {
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.click(screen.getByRole('button', { name: 'Request to Join' }))

    const withdraw = await screen.findByRole('button', {
      name: 'Withdraw request',
    })
    expect(withdraw).toBeEnabled()
    expect(requestToJoinRide).toHaveBeenCalledTimes(1)

    await user.click(withdraw)

    expect(
      await screen.findByText('Your request has been withdrawn.'),
    ).toBeInTheDocument()
    expect(withdrawRideRequest).toHaveBeenCalledWith('ride-1', 'req-1')
    expect(
      await screen.findByRole('button', { name: 'Request to Join' }),
    ).toBeInTheDocument()
  })

  it('re-marks the ride as requested when withdrawing fails', async () => {
    withdrawRideRequest.mockRejectedValueOnce(
      new Error('Could not withdraw your request.'),
    )
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.click(screen.getByRole('button', { name: 'Request to Join' }))
    await user.click(
      await screen.findByRole('button', { name: 'Withdraw request' }),
    )

    expect(
      await screen.findByText('Could not withdraw your request.'),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Withdraw request' }),
    ).toBeInTheDocument()
  })

  it('withdraws an already-requested ride using the request id from load', async () => {
    fetchMyRides.mockResolvedValue({
      data: {
        joined: [
          { id: 'ride-1', requestId: 'req-loaded', requestStatus: 'PENDING' },
        ],
      },
    })
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)

    await user.click(
      await screen.findByRole('button', { name: 'Withdraw request' }),
    )

    expect(withdrawRideRequest).toHaveBeenCalledWith('ride-1', 'req-loaded')
    expect(
      await screen.findByText('Your request has been withdrawn.'),
    ).toBeInTheDocument()
  })

  it('sends only one request when the button is double-clicked', async () => {
    const user = userEvent.setup({ delay: null })
    let release
    requestToJoinRide.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ id: 'req-1', status: 'PENDING' })
        }),
    )

    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    const button = screen.getByRole('button', { name: 'Request to Join' })
    await user.click(button)
    await user.click(button)

    expect(requestToJoinRide).toHaveBeenCalledTimes(1)
    release()
  })

  it('shows an already-requested ride as requested on load', async () => {
    fetchMyRides.mockResolvedValue({
      data: { joined: [{ id: 'ride-1', requestStatus: 'PENDING' }] },
    })

    render(<FindARide onOfferRide={jest.fn()} />)

    expect(
      await screen.findByRole('button', { name: 'Withdraw request' }),
    ).toBeInTheDocument()
  })

  it('reports a duplicate request and turns it into a working withdraw', async () => {
    const error = new Error('You have already requested this ride.')
    error.status = 409
    requestToJoinRide.mockRejectedValueOnce(error)
    // First lookup (page load) misses the request; the 409 lookup finds it.
    fetchMyRides
      .mockResolvedValueOnce({ data: { joined: [] } })
      .mockResolvedValue({
        data: {
          joined: [
            { id: 'ride-1', requestId: 'req-existing', requestStatus: 'PENDING' },
          ],
        },
      })

    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)

    await user.click(
      await screen.findByRole('button', { name: 'Request to Join' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You have already requested this ride.',
    )
    await user.click(
      await screen.findByRole('button', { name: 'Withdraw request' }),
    )
    expect(withdrawRideRequest).toHaveBeenCalledWith('ride-1', 'req-existing')
  })

  it('treats a 409 with no open request as a closed ride', async () => {
    const error = new Error('This ride is full.')
    error.status = 409
    requestToJoinRide.mockRejectedValueOnce(error)

    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)

    await user.click(
      await screen.findByRole('button', { name: 'Request to Join' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This ride is full.',
    )
    expect(
      screen.getByRole('button', { name: 'Request to Join' }),
    ).toBeInTheDocument()
  })

  it('never shows "Request to Join" before the request status has loaded', async () => {
    let resolveMine
    fetchMyRides.mockReturnValue(
      new Promise((resolve) => {
        resolveMine = resolve
      }),
    )

    render(<FindARide onOfferRide={jest.fn()} />)

    // The ride list has loaded, but the viewer's own requests have not.
    await waitFor(() => expect(apiFetch).toHaveBeenCalled())
    expect(
      screen.queryByRole('button', { name: 'Request to Join' }),
    ).not.toBeInTheDocument()

    resolveMine({
      data: {
        joined: [
          { id: 'ride-1', requestId: 'req-1', requestStatus: 'PENDING' },
        ],
      },
    })

    expect(
      await screen.findByRole('button', { name: 'Withdraw request' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Request to Join' }),
    ).not.toBeInTheDocument()
  })

  it('keeps an accepted request as withdrawable after a reload', async () => {
    fetchMyRides.mockResolvedValue({
      data: {
        joined: [
          { id: 'ride-1', requestId: 'req-1', requestStatus: 'ACCEPTED' },
        ],
      },
    })

    render(<FindARide onOfferRide={jest.fn()} />)

    expect(
      await screen.findByRole('button', { name: 'Withdraw request' }),
    ).toBeInTheDocument()
  })

  it('offers "Request to Join" again for a withdrawn or declined request', async () => {
    fetchMyRides.mockResolvedValue({
      data: {
        joined: [],
        joinedPastAndCancelled: [
          { id: 'ride-1', requestId: 'req-old', requestStatus: 'WITHDRAWN' },
        ],
      },
    })

    render(<FindARide onOfferRide={jest.fn()} />)

    expect(
      await screen.findByRole('button', { name: 'Request to Join' }),
    ).toBeInTheDocument()
  })

  it('re-enables the button when the request fails for another reason', async () => {
    const error = new Error('Something went wrong')
    error.status = 500
    requestToJoinRide.mockRejectedValueOnce(error)

    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.click(screen.getByRole('button', { name: 'Request to Join' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong',
    )
    expect(
      screen.getByRole('button', { name: 'Request to Join' }),
    ).toBeEnabled()
  })

  it('stays usable when the already-requested lookup fails', async () => {
    const error = new Error('Service unavailable')
    error.status = 503
    fetchMyRides.mockRejectedValueOnce(error)

    render(<FindARide onOfferRide={jest.fn()} />)

    expect(await screen.findByText('Ama Owusu')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Request to Join' }),
    ).toBeEnabled()
  })

  it('leaves a 401 on the join request to the central handler', async () => {
    const error = new Error('Authentication required.')
    error.status = 401
    requestToJoinRide.mockRejectedValueOnce(error)

    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.click(screen.getByRole('button', { name: 'Request to Join' }))

    // The screen just reports it; the API layer announces the expiry.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Authentication required.',
    )
  })
  it('shows the backend error when rides require authentication', async () => {
    apiFetch.mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({
        message: 'Authentication required. Please log in.',
      }),
    })
    render(<FindARide onOfferRide={jest.fn()} />)

    expect(await screen.findByText("Couldn't load rides")).toBeInTheDocument()
    expect(
      screen.getByText('Authentication required. Please log in.'),
    ).toBeInTheDocument()
  })
})
