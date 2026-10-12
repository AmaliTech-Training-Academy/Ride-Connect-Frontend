import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { apiFetch } from '../lib/api'
import FindARide from './FindARide'
import {
  fetchMyRides,
  requestToJoinRide,
  rerequestRide,
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
  rerequestRide: jest.fn(),
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

/** Withdrawing now asks first; this answers the dialog with "Yes, withdraw". */
async function confirmWithdraw(user) {
  const dialog = await screen.findByRole('alertdialog', {
    name: 'Withdraw your request?',
  })
  await user.click(
    within(dialog).getByRole('button', { name: 'Yes, withdraw' }),
  )
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
    rerequestRide.mockReset()
    rerequestRide.mockResolvedValue({ status: 'PENDING' })
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

  it('words the filtered empty state from the active filters, not the API copy', async () => {
    // Deliberately unrelated wording: the heading must not depend on it.
    apiFetch.mockResolvedValue(response([], 'Nothing matched your query.'))
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByRole('heading', { name: 'No rides found' })

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

  it('puts date before search before office, like the API', async () => {
    apiFetch.mockResolvedValue(response([]))
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByRole('heading', { name: 'No rides found' })

    await user.selectOptions(screen.getByLabelText('Filter by office'), 'ACCRA')
    expect(
      await screen.findByRole('heading', {
        name: 'No rides found for this office',
      }),
    ).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox'), 'Adum')
    expect(
      await screen.findByRole('heading', {
        name: 'No rides found for this route',
      }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tomorrow' }))
    expect(
      await screen.findByRole('heading', {
        name: 'No rides found for this date',
      }),
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
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Manage' }))

    expect(onManageRide).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'own' }),
    )
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
    await confirmWithdraw(user)

    expect(
      await screen.findByText('Your request has been withdrawn.'),
    ).toBeInTheDocument()
    expect(withdrawRideRequest).toHaveBeenCalledWith('ride-1', 'req-1')
    expect(
      await screen.findByRole('button', { name: 'Request to Join' }),
    ).toBeInTheDocument()
  })

  it('shows who the driver has already accepted, with a profile card on tap', async () => {
    apiFetch.mockResolvedValue(
      response([
        ride({
          acceptedPassengers: [
            {
              id: 'p1',
              name: 'Kofi Boateng',
              image: 'https://img/kofi.png',
              office: 'KUMASI',
            },
            { id: 'p2', name: 'Esi Mensah', image: null },
          ],
        }),
      ]),
    )
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    expect(
      screen.getByRole('list', {
        name: 'Already on this ride: Kofi and Esi are riding',
      }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Kofi Boateng' }))
    const card = screen.getByRole('tooltip')
    expect(card).toHaveTextContent('Kofi Boateng')
    expect(card).toHaveTextContent('Kumasi office')
  })

  it('leaves the passenger row out until someone is accepted', async () => {
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    expect(
      screen.queryByRole('list', { name: /Already on this ride/ }),
    ).not.toBeInTheDocument()
  })

  it('shows a pending badge once requested, and asks before withdrawing', async () => {
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')
    expect(screen.getByText('Open')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Request to Join' }))
    expect(await screen.findByText('Pending')).toHaveClass(
      'find-ride-status-pending',
    )
    expect(screen.queryByText('Open')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Withdraw request' }))
    const dialog = screen.getByRole('alertdialog', {
      name: 'Withdraw your request?',
    })
    expect(dialog).toHaveTextContent('Ama Owusu')

    // Backing out keeps the request exactly as it was.
    await user.click(
      within(dialog).getByRole('button', { name: 'Keep request' }),
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(withdrawRideRequest).not.toHaveBeenCalled()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Withdraw request' }),
    ).toHaveFocus()
  })

  it('goes back to an open badge after a withdrawal', async () => {
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.click(screen.getByRole('button', { name: 'Request to Join' }))
    await user.click(
      await screen.findByRole('button', { name: 'Withdraw request' }),
    )
    await confirmWithdraw(user)

    expect(await screen.findByText('Open')).toBeInTheDocument()
    expect(screen.queryByText('Pending')).not.toBeInTheDocument()
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
    await confirmWithdraw(user)

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
    await confirmWithdraw(user)

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
            {
              id: 'ride-1',
              requestId: 'req-existing',
              requestStatus: 'PENDING',
            },
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
    await confirmWithdraw(user)
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

  it("shows drivers' pictures, and the viewer's own on their own rides", async () => {
    apiFetch.mockResolvedValue(
      response([
        ride({ id: 'own', driverId: 'user-1', driverName: 'Me Myself' }),
        ride({
          id: 'pictured',
          driverId: 'driver-2',
          driverName: 'Kwame Mensah',
          driverImage: 'https://res.cloudinary.com/x/kwame.png',
        }),
        ride({ id: 'plain', driverId: 'driver-3', driverName: 'Esi Ofori' }),
      ]),
    )
    render(
      <FindARide
        currentUserId="user-1"
        userImage="https://res.cloudinary.com/x/me.png"
        onOfferRide={jest.fn()}
      />,
    )

    const card = async (name) =>
      (await screen.findByText(name)).closest('article')
    expect((await card('Me Myself')).querySelector('img')).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/x/me.png',
    )
    expect((await card('Kwame Mensah')).querySelector('img')).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/x/kwame.png',
    )
    const plain = await card('Esi Ofori')
    expect(plain.querySelector('img')).toBeNull()
    expect(plain).toHaveTextContent('EO')
  })

  it('filters by office and combines it with the other filters', async () => {
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.selectOptions(
      screen.getByLabelText('Filter by office'),
      'KUMASI',
    )
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/rides?office=KUMASI',
        expect.anything(),
      ),
    )

    await user.type(screen.getByRole('searchbox'), 'Adum')
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/rides?search=Adum&office=KUMASI',
        expect.anything(),
      ),
    )
    expect(
      screen.getByRole('button', { name: /Kumasi office/ }),
    ).toBeInTheDocument()
  })

  it('removes the office filter from its chip', async () => {
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.selectOptions(screen.getByLabelText('Filter by office'), 'ACCRA')
    await user.click(
      await screen.findByRole('button', { name: /Accra office/ }),
    )

    expect(screen.getByLabelText('Filter by office')).toHaveValue('')
    await waitFor(() =>
      expect(apiFetch).toHaveBeenLastCalledWith(
        '/api/rides?',
        expect.anything(),
      ),
    )
  })

  it("shows the backend's office empty state", async () => {
    apiFetch
      .mockResolvedValueOnce(response([], 'No rides found.'))
      .mockResolvedValue(response([], 'No rides found for this office.'))
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByRole('heading', { name: 'No rides found' })

    await user.selectOptions(
      screen.getByLabelText('Filter by office'),
      'TAKORADI',
    )

    expect(
      await screen.findByRole('heading', {
        name: 'No rides found for this office',
      }),
    ).toBeInTheDocument()
  })

  it('tags each ride with its office', async () => {
    apiFetch.mockResolvedValue(
      response([
        ride({ office: 'TAKORADI' }),
        ride({ id: 'ride-2', driverName: 'Kofi Boateng' }),
      ]),
    )
    render(<FindARide onOfferRide={jest.fn()} />)

    const tagged = (await screen.findByText('Ama Owusu')).closest('article')
    expect(tagged).toHaveTextContent('Takoradi office')
    const untagged = screen.getByText('Kofi Boateng').closest('article')
    expect(untagged.querySelector('.find-ride-office-tag')).toBeNull()
  })
})

describe('FindARide - asking again after a decline', () => {
  // The viewer's own request for ride-1, as /rides/mine reports it.
  const declinedRequest = (overrides = {}) => ({
    data: {
      joined: [
        {
          id: 'ride-1',
          requestId: 'req-declined',
          requestStatus: 'DECLINED',
          rerequestCount: 0,
          rejectionReason: 'The car is full of luggage that day.',
          ...overrides,
        },
      ],
    },
  })

  const rejoinDialog = () =>
    screen.findByRole('dialog', { name: 'Request to join again?' })

  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue(response([ride()]))
    fetchMyRides.mockReset()
    fetchMyRides.mockResolvedValue(declinedRequest())
    requestToJoinRide.mockReset()
    rerequestRide.mockReset()
    rerequestRide.mockResolvedValue({ status: 'PENDING' })
  })

  it("shows the decline and the driver's reason instead of Request to Join", async () => {
    render(<FindARide onOfferRide={jest.fn()} />)

    expect(await screen.findByText('Declined')).toHaveClass(
      'find-ride-status-declined',
    )
    expect(
      screen.getByText('The car is full of luggage that day.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request again' })).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'Request to Join' }),
    ).not.toBeInTheDocument()
  })

  it('re-requests once, with a reason, through the re-request endpoint', async () => {
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)

    await user.click(
      await screen.findByRole('button', { name: 'Request again' }),
    )
    const dialog = await rejoinDialog()
    const send = within(dialog).getByRole('button', { name: 'Send request' })
    // A reason is required before it can be sent.
    expect(send).toBeDisabled()

    await user.type(
      within(dialog).getByLabelText('Reason for rejoining'),
      'I can leave my bags at home.',
    )
    await user.click(send)

    expect(rerequestRide).toHaveBeenCalledWith(
      'ride-1',
      'req-declined',
      'I can leave my bags at home.',
    )
    // Never a fresh join: the old request is reopened instead.
    expect(requestToJoinRide).not.toHaveBeenCalled()
    expect(
      await screen.findByText(/Request sent to Ama Owusu again/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Withdraw request' }),
    ).toBeInTheDocument()
  })

  it('withdraws a re-request using the same request', async () => {
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)

    await user.click(
      await screen.findByRole('button', { name: 'Request again' }),
    )
    await user.type(
      within(await rejoinDialog()).getByLabelText('Reason for rejoining'),
      'Please?',
    )
    await user.click(screen.getByRole('button', { name: 'Send request' }))
    await user.click(
      await screen.findByRole('button', { name: 'Withdraw request' }),
    )
    await confirmWithdraw(user)

    expect(withdrawRideRequest).toHaveBeenCalledWith('ride-1', 'req-declined')
  })

  it('leaves everything as it was when the dialog is cancelled', async () => {
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)
    const again = await screen.findByRole('button', { name: 'Request again' })

    await user.click(again)
    await user.click(
      within(await rejoinDialog()).getByRole('button', { name: 'Cancel' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(rerequestRide).not.toHaveBeenCalled()
    expect(screen.getByText('Declined')).toBeInTheDocument()
    expect(again).toHaveFocus()
  })

  it('allows only one re-request: after that the ride stays declined', async () => {
    fetchMyRides.mockResolvedValue(declinedRequest({ rerequestCount: 1 }))
    render(<FindARide onOfferRide={jest.fn()} />)

    expect(
      await screen.findByRole('button', { name: 'Request declined' }),
    ).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Request again' }),
    ).not.toBeInTheDocument()
  })

  it("keeps quoting the driver's first message, exactly, after a final decline", async () => {
    fetchMyRides.mockResolvedValue(
      declinedRequest({ rerequestCount: 1, rejectionReason: '  testing  ' }),
    )
    render(<FindARide onOfferRide={jest.fn()} />)

    const quote = await screen.findByText('testing')
    expect(quote.tagName).toBe('Q')
    // Only the driver's words: nothing of the app's wording is added.
    expect(quote.closest('.find-ride-decline-note')).toHaveTextContent(
      /^Ama Owusu said: testing$/,
    )
  })

  it('says so when the driver gave no reason', async () => {
    fetchMyRides.mockResolvedValue(declinedRequest({ rejectionReason: null }))
    render(<FindARide onOfferRide={jest.fn()} />)

    expect(
      await screen.findByText(
        'The driver declined your request without a reason.',
      ),
    ).toBeInTheDocument()
  })

  it('closes the dialog and locks the card when the backend refuses with 409', async () => {
    const error = new Error('You have already re-requested this ride.')
    error.status = 409
    rerequestRide.mockRejectedValueOnce(error)
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)

    await user.click(
      await screen.findByRole('button', { name: 'Request again' }),
    )
    await user.type(
      within(await rejoinDialog()).getByLabelText('Reason for rejoining'),
      'One more try',
    )
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    expect(
      await screen.findByText('You have already re-requested this ride.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Request declined' }),
    ).toBeDisabled()
  })

  it('keeps the dialog open to retry after another failure', async () => {
    rerequestRide.mockRejectedValueOnce(new Error('Network down'))
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)

    await user.click(
      await screen.findByRole('button', { name: 'Request again' }),
    )
    const dialog = await rejoinDialog()
    await user.type(
      within(dialog).getByLabelText('Reason for rejoining'),
      'Please',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Send request' }),
    )

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Network down',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Try again' }))
    expect(rerequestRide).toHaveBeenCalledTimes(2)
  })

  it('offers the re-request when a plain join reveals an earlier decline', async () => {
    // Status failed to load, so the card started as "Request to Join".
    fetchMyRides
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(declinedRequest())
    const error = new Error('You have already requested this ride.')
    error.status = 409
    requestToJoinRide.mockRejectedValueOnce(error)
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)

    await user.click(
      await screen.findByRole('button', { name: 'Request to Join' }),
    )

    // Not the misleading "already requested" toast: the reason dialog.
    expect(await rejoinDialog()).toBeInTheDocument()
    expect(
      screen.queryByText('You have already requested this ride.'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Declined')).toBeInTheDocument()
  })

  it('explains, rather than offers, when that earlier decline was already re-requested', async () => {
    fetchMyRides
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(declinedRequest({ rerequestCount: 1 }))
    const error = new Error('You have already requested this ride.')
    error.status = 409
    requestToJoinRide.mockRejectedValueOnce(error)
    const user = userEvent.setup()
    render(<FindARide onOfferRide={jest.fn()} />)

    await user.click(
      await screen.findByRole('button', { name: 'Request to Join' }),
    )

    expect(
      await screen.findByText(
        'Your request for this ride was declined, and you have already asked again once.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Request declined' }),
    ).toBeDisabled()
  })

  it('treats a withdrawn request as no request at all', async () => {
    fetchMyRides.mockResolvedValue(
      declinedRequest({ requestStatus: 'WITHDRAWN' }),
    )
    render(<FindARide onOfferRide={jest.fn()} />)

    expect(
      await screen.findByRole('button', { name: 'Request to Join' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Declined')).not.toBeInTheDocument()
  })
})
