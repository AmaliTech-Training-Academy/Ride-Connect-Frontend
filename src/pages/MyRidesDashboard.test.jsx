import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import { apiFetch } from '../lib/api'
import MyRidesDashboard from './MyRidesDashboard'

jest.mock('../lib/api', () => ({
  apiFetch: jest.fn(),
}))

describe('MyRidesDashboard', () => {
  const ridesResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      data: [
        {
          id: 'ride-1',
          driverId: 'user-1',
          origin: 'East Legon',
          destination: 'AmaliTech Office',
          departureAt: '2099-09-19T08:15:00.000Z',
          totalSeats: 4,
          availableSeats: 2,
          status: 'OPEN',
        },
        {
          id: 'other-ride',
          driverId: 'other-user',
          origin: 'Osu',
          destination: 'AmaliTech Office',
          departureAt: '2099-09-20T08:15:00.000Z',
          totalSeats: 4,
          availableSeats: 4,
          status: 'OPEN',
        },
        {
          id: 'ride-2',
          driverId: 'user-1',
          origin: 'Adenta',
          destination: 'AmaliTech Office',
          departureAt: '2099-09-20T07:45:00.000Z',
          totalSeats: 3,
          availableSeats: 3,
          status: 'OPEN',
        },
        {
          id: 'ride-past',
          driverId: 'user-1',
          origin: 'Osu',
          destination: 'AmaliTech Office',
          departureAt: '2020-09-20T08:00:00.000Z',
          totalSeats: 3,
          availableSeats: 1,
          status: 'CANCELLED',
        },
      ],
    }),
  }

  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockImplementation((path) =>
      path === '/api/rides'
        ? Promise.resolve(ridesResponse)
        : path === '/api/rides/ride-1/requests'
          ? Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({
                data: [
                  {
                    id: 'request-1',
                    passengerName: 'Nana Yeboah',
                    status: 'PENDING',
                    createdAt: '2099-09-19T08:07:00.000Z',
                  },
                  {
                    id: 'request-2',
                    passengerName: 'Kojo Mensah',
                    status: 'PENDING',
                    createdAt: '2099-09-19T07:51:00.000Z',
                  },
                  {
                    id: 'request-3',
                    passengerName: 'Adwoa Frimpong',
                    status: 'PENDING',
                    createdAt: '2099-09-19T07:44:00.000Z',
                  },
                ],
              }),
            })
        : Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: [] }),
          }),
    )
  })

  it('loads pending requests for the managed ride', async () => {
    apiFetch.mockImplementation((path) =>
      path === '/api/rides/ride-1/requests'
        ? Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              message: 'Requests fetched successfully',
              data: [
                {
                  id: 'request-1',
                  passengerId: 'passenger-1',
                  passengerName: 'Ada Lovelace',
                  status: 'PENDING',
                  createdAt: '2026-09-18T09:30:00.000Z',
                },
              ],
            }),
          })
        : Promise.resolve(ridesResponse),
    )

    render(
      <MyRidesDashboard
        managedRideId="ride-1"
        currentUserId="user-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
      />,
    )

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith('/api/rides/ride-1/requests', {
      signal: expect.anything(),
    })
  })

  it('shows when the managed ride has no pending requests', async () => {
    apiFetch.mockImplementation((path) =>
      path === '/api/rides/ride-2/requests'
        ? Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              message: 'No pending requests for this ride.',
              data: [],
            }),
          })
        : Promise.resolve({ ...ridesResponse, json: async () => ({ data: [] }) }),
    )

    render(
      <MyRidesDashboard
        managedRideId="ride-2"
        currentUserId="user-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
      />,
    )

    expect(
      await screen.findByText('No pending requests for this ride.'),
    ).toBeInTheDocument()
  })

  it('renders only the signed-in user\'s rides from the API', async () => {
    render(
      <MyRidesDashboard
        currentUserId="user-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
      />,
    )

    expect(
      (await screen.findAllByRole('button', {
        name: /East Legon.*AmaliTech Office/,
      })).length,
    ).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: /Osu.*AmaliTech Office/ }),
    ).not.toBeInTheDocument()
  })

  it('shows an API error when rides cannot be loaded', async () => {
    apiFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Rides service unavailable.' }),
    })

    render(
      <MyRidesDashboard
        currentUserId="user-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
      />,
    )

    expect(
      await screen.findByRole('heading', { name: "Couldn't load your rides" }),
    ).toBeInTheDocument()
    expect(screen.getByText('Rides service unavailable.')).toBeInTheDocument()
  })

  it('redirects to login when the rides request is unauthorized', async () => {
    const onUnauthorized = jest.fn()
    apiFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Authentication required.' }),
    })

    render(
      <MyRidesDashboard
        currentUserId="user-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
        onUnauthorized={onUnauthorized}
      />,
    )

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled())
  })

  it('redirects to login when a per-ride requests fetch is unauthorized', async () => {
    const onUnauthorized = jest.fn()
    apiFetch.mockImplementation((path) =>
      path === '/api/rides'
        ? Promise.resolve(ridesResponse)
        : Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ message: 'Authentication required.' }),
          }),
    )

    render(
      <MyRidesDashboard
        currentUserId="user-1"
        managedRideId="ride-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
        onUnauthorized={onUnauthorized}
      />,
    )

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled())
  })

  it('accepts requests until the ride is full', async () => {
    const user = userEvent.setup()
    render(
      <MyRidesDashboard
        currentUserId="user-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
      />,
    )

    expect(await screen.findByText('3 new requests')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])
    expect(await screen.findByText(/Nana Yeboah has been added/)).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])
    expect(screen.getByText('0 of 4 seats left')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled()
  })

  it('declines a request, cancels a ride, and shows the joined placeholder', async () => {
    const user = userEvent.setup()
    render(
      <MyRidesDashboard
        currentUserId="user-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
      />,
    )

    await screen.findByText('3 new requests')
    await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])
    expect(screen.queryByText('Nana Yeboah')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Options for Adenta/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel ride' }))
    expect(screen.getByRole('heading', { name: 'Cancel this ride?' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Cancel ride' }).at(-1))
    await user.click(screen.getByRole('tab', { name: /Rides I.ve joined/ }))
    expect(
      await screen.findByRole('heading', {
        name: "You haven't requested any rides yet.",
      }),
    ).toBeInTheDocument()
  })

  it('splits joined rides into pending and approved sections', async () => {
    const user = userEvent.setup()
    apiFetch.mockImplementation((path) =>
      path === '/api/rides/mine'
        ? Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              data: {
                driving: [],
                joined: [
                  {
                    id: 'ride-10',
                    requestId: 'request-10',
                    requestStatus: 'PENDING',
                    driverId: 'driver-1',
                    driverName: 'Ama Owusu',
                    origin: 'Madina',
                    destination: 'AmaliTech Office',
                    departureAt: '2099-09-19T08:15:00.000Z',
                    totalSeats: 4,
                    availableSeats: 2,
                    status: 'OPEN',
                  },
                  {
                    id: 'ride-11',
                    requestId: 'request-11',
                    requestStatus: 'ACCEPTED',
                    driverId: 'driver-2',
                    driverName: 'Kojo Mensah',
                    origin: 'Osu',
                    destination: 'AmaliTech Office',
                    departureAt: '2099-09-20T08:15:00.000Z',
                    totalSeats: 4,
                    availableSeats: 3,
                    status: 'OPEN',
                  },
                ],
                pastAndCancelled: [],
                joinedPastAndCancelled: [],
              },
            }),
          })
        : Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [] }) }),
    )

    render(
      <MyRidesDashboard
        currentUserId="user-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: /Rides I.ve joined/ }))

    expect(await screen.findByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Driver: Ama Owusu')).toBeInTheDocument()
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.getByText('Driver: Kojo Mensah')).toBeInTheDocument()
  })

  it('shows a not-yet-available message when withdrawing a joined request', async () => {
    const user = userEvent.setup()
    apiFetch.mockImplementation((path) =>
      path === '/api/rides/mine'
        ? Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              data: {
                driving: [],
                joined: [
                  {
                    id: 'ride-10',
                    requestId: 'request-10',
                    requestStatus: 'PENDING',
                    driverId: 'driver-1',
                    driverName: 'Ama Owusu',
                    origin: 'Madina',
                    destination: 'AmaliTech Office',
                    departureAt: '2099-09-19T08:15:00.000Z',
                    totalSeats: 4,
                    availableSeats: 2,
                    status: 'OPEN',
                  },
                ],
                pastAndCancelled: [],
                joinedPastAndCancelled: [],
              },
            }),
          })
        : Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [] }) }),
    )

    render(
      <MyRidesDashboard
        currentUserId="user-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: /Rides I.ve joined/ }))
    await user.click(
      await screen.findByRole('button', { name: 'Withdraw request' }),
    )

    expect(
      await screen.findByText("Withdrawing a request isn't available yet."),
    ).toBeInTheDocument()
  })

  it('shows an error when the joined rides request fails', async () => {
    const user = userEvent.setup()
    apiFetch.mockImplementation((path) =>
      path === '/api/rides/mine'
        ? Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ message: 'Joined rides unavailable.' }),
          })
        : Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [] }) }),
    )

    render(
      <MyRidesDashboard
        currentUserId="user-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: /Rides I.ve joined/ }))

    expect(
      await screen.findByRole('heading', {
        name: "Couldn't load your joined rides",
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Joined rides unavailable.')).toBeInTheDocument()
  })

  it('redirects to login when the joined rides request is unauthorized', async () => {
    const onUnauthorized = jest.fn()
    apiFetch.mockImplementation((path) =>
      path === '/api/rides/mine'
        ? Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ message: 'Authentication required.' }),
          })
        : Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [] }) }),
    )

    render(
      <MyRidesDashboard
        currentUserId="user-1"
        onFindRide={jest.fn()}
        onOfferRide={jest.fn()}
        onUnauthorized={onUnauthorized}
      />,
    )

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled())
  })
})
