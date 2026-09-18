import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { apiFetch } from '../lib/api'
import FindARide from './FindARide'

jest.mock('../lib/api', () => ({
  apiFetch: jest.fn(),
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

  it('sends POST /api/rides/:rideId/requests and shows success toast', async () => {
    const user = userEvent.setup()
    apiFetch.mockResolvedValueOnce(response([ride()])).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        message: 'Request submitted successfully',
        data: { id: 'req-123', status: 'PENDING' },
      }),
    })

    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.click(screen.getByRole('button', { name: 'Request to Join' }))

    expect(apiFetch).toHaveBeenCalledWith('/api/rides/ride-1/requests', {
      method: 'POST',
    })
    expect(
      await screen.findByText(
        'Request sent to Ama Owusu. The driver will be notified.',
      ),
    ).toBeInTheDocument()
  })

  it('shows error toast when POST /api/rides/:rideId/requests returns an error', async () => {
    const user = userEvent.setup()
    apiFetch.mockResolvedValueOnce(response([ride()])).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        message: 'You have already requested to join this ride.',
      }),
    })

    render(<FindARide onOfferRide={jest.fn()} />)
    await screen.findByText('Ama Owusu')

    await user.click(screen.getByRole('button', { name: 'Request to Join' }))

    expect(
      await screen.findByText('You have already requested to join this ride.'),
    ).toBeInTheDocument()
  })

  it('redirects to login on a 401 response from request to join', async () => {
    const user = userEvent.setup()
    const onUnauthorized = jest.fn()
    apiFetch.mockResolvedValueOnce(response([ride()])).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: 'Unauthorized' }),
    })

    render(
      <FindARide onUnauthorized={onUnauthorized} onOfferRide={jest.fn()} />,
    )
    await screen.findByText('Ama Owusu')

    await user.click(screen.getByRole('button', { name: 'Request to Join' }))

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('redirects to login on a 401 response', async () => {
    const onUnauthorized = jest.fn()
    apiFetch.mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({}),
    })
    render(
      <FindARide onUnauthorized={onUnauthorized} onOfferRide={jest.fn()} />,
    )

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1))
  })
})
