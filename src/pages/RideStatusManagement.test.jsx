import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { apiFetch } from '../lib/api'
import RideStatusManagement from './RideStatusManagement'

jest.mock('../lib/api', () => ({
  apiFetch: jest.fn(),
}))

describe('RideStatusManagement', () => {
  // Before every test, make apiFetch return a successful 200 response by default.
  // Individual tests can override this with apiFetch.mockResolvedValueOnce(...).
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
  })

  it('renders the dashboard shell with heading, subtitle, and tabs', () => {
    render(
      <RideStatusManagement user={{ email: 'kwame.mensah@amalitech.com' }} />,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: /my rides/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/manage rides you're driving and rides you've joined/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /rides i'm driving/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /rides i've joined/i }),
    ).toBeInTheDocument()
  })

  it('routes to find ride and offer ride from the header navigation', async () => {
    const user = userEvent.setup()
    const onFindRide = jest.fn()
    const onOfferRide = jest.fn()

    render(
      <RideStatusManagement
        user={{ email: 'kwame.mensah@amalitech.com' }}
        onFindRide={onFindRide}
        onOfferRide={onOfferRide}
      />,
    )

    await user.click(screen.getByRole('button', { name: /find a ride/i }))
    await user.click(screen.getByRole('button', { name: /offer a ride/i }))

    expect(onFindRide).toHaveBeenCalledTimes(1)
    expect(onOfferRide).toHaveBeenCalledTimes(1)
  })

  it('toggles expansion of ride cards', async () => {
    const user = userEvent.setup()

    render(
      <RideStatusManagement user={{ email: 'kwame.mensah@amalitech.com' }} />,
    )

    // Spintex card is collapsed initially
    expect(screen.queryByText(/Ama Konadu/i)).not.toBeInTheDocument()

    // Click Spintex card to expand
    await user.click(screen.getByText(/Spintex/i))
    expect(screen.getByText(/Ama Konadu/i)).toBeInTheDocument()

    // Click again to collapse
    await user.click(screen.getByText(/Spintex/i))
    expect(screen.queryByText(/Ama Konadu/i)).not.toBeInTheDocument()
  })

  it('accepts a request: decrements seat count, moves to confirmed, and displays toast', async () => {
    const user = userEvent.setup()

    render(
      <RideStatusManagement user={{ email: 'kwame.mensah@amalitech.com' }} />,
    )

    expect(screen.getByText(/2 of 4 seats left/i)).toBeInTheDocument()
    expect(screen.getByText(/Abena Owusu/i)).toBeInTheDocument()

    // Click Accept for Abena Owusu
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
    await user.click(acceptButtons[0])

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/rides/1/requests/req-1/accept',
      {
        method: 'PATCH',
      },
    )

    // Seat count decrements
    expect(screen.getByText(/1 of 4 seats left/i)).toBeInTheDocument()

    // Toast notification appears
    expect(
      screen.getByText(/Abena has been added to your ride/i),
    ).toBeInTheDocument()

    // Abena now in confirmed passengers
    expect(screen.getByText(/Abena Owusu/i)).toBeInTheDocument()
  })

  it('declines a request and removes it from the list', async () => {
    const user = userEvent.setup()

    render(
      <RideStatusManagement user={{ email: 'kwame.mensah@amalitech.com' }} />,
    )

    expect(screen.getByText(/Yaw Darko/i)).toBeInTheDocument()

    // Click Decline on second request (Yaw Darko)
    const declineButtons = screen.getAllByRole('button', { name: /decline/i })
    await user.click(declineButtons[1])

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/rides/1/requests/req-2/decline',
      {
        method: 'PATCH',
      },
    )

    expect(screen.queryByText(/Yaw Darko/i)).not.toBeInTheDocument()
  })

  it('transitions to Full state when all seats are accepted', async () => {
    const user = userEvent.setup()

    render(
      <RideStatusManagement user={{ email: 'kwame.mensah@amalitech.com' }} />,
    )

    // Accept first request (2 -> 1 seat left)
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
    await user.click(acceptButtons[0])

    // Accept second request (1 -> 0 seats left)
    const nextAcceptButton = screen.getByRole('button', { name: /accept/i })
    await user.click(nextAcceptButton)

    // Status becomes Full
    expect(screen.getByText(/0 of 4 seats left/i)).toBeInTheDocument()
    expect(screen.getByText(/Full/i)).toBeInTheDocument()
  })

  it('requires the current user to be the ride owner before status actions are available', async () => {
    const user = userEvent.setup()
    const rides = [
      {
        id: 1,
        driverId: 'driver-1',
        origin: 'East Legon',
        destination: 'AmaliTech Office',
        date: 'Mon, 14 Sep',
        time: '7:15 AM',
        totalSeats: 4,
        seatsAvailable: 2,
        status: 'Open',
        expanded: true,
        requests: [],
        passengers: [],
      },
      {
        id: 2,
        driverId: 'driver-2',
        origin: 'Spintex',
        destination: 'AmaliTech Office',
        date: 'Tue, 15 Sep',
        time: '7:00 AM',
        totalSeats: 3,
        seatsAvailable: 1,
        status: 'Open',
        expanded: false,
        requests: [],
        passengers: [],
      },
    ]

    render(
      <RideStatusManagement
        user={{ id: 'driver-1', email: 'kwame.mensah@amalitech.com' }}
        currentUserId="driver-1"
        initialRides={rides}
        initialPastRides={[]}
      />,
    )

    await user.click(
      screen.getAllByRole('button', { name: /options for ride/i })[0],
    )
    expect(
      screen.getByRole('menuitem', { name: /cancel ride/i }),
    ).toBeInTheDocument()
    // Mark as full now always shows for the driver's own open ride (no longer gated on pending requests)
    expect(
      screen.getByRole('menuitem', { name: /mark as full/i }),
    ).toBeInTheDocument()

    await user.click(
      screen.getAllByRole('button', { name: /options for ride/i })[1],
    )
    expect(
      screen.queryByRole('menuitem', { name: /cancel ride/i }),
    ).not.toBeInTheDocument()
  })

  it('lets the driver mark a ride as full from the dashboard', async () => {
    const user = userEvent.setup()

    render(
      <RideStatusManagement
        user={{ id: 'driver-1', email: 'kwame.mensah@amalitech.com' }}
        currentUserId="driver-1"
      />,
    )

    const menuButtons = screen.getAllByRole('button', {
      name: /options for ride/i,
    })
    await user.click(menuButtons[0])
    await user.click(screen.getByRole('menuitem', { name: /mark as full/i }))

    // Wait for the async API call to resolve and state to update
    await waitFor(() => expect(screen.getByText(/Full/i)).toBeInTheDocument())
    expect(screen.getByText(/0 of 4 seats left/i)).toBeInTheDocument()

    // Confirm apiFetch was called with the correct arguments
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/status'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'FULL' }),
      }),
    )
  })

  it('shows an error toast when marking as full fails on the server', async () => {
    // Override the default — this specific call returns a server error
    apiFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const user = userEvent.setup()

    render(
      <RideStatusManagement
        user={{ id: 'driver-1', email: 'kwame.mensah@amalitech.com' }}
        currentUserId="driver-1"
      />,
    )

    const menuButtons = screen.getAllByRole('button', {
      name: /options for ride/i,
    })
    await user.click(menuButtons[0])
    await user.click(screen.getByRole('menuitem', { name: /mark as full/i }))

    // Error toast appears
    await waitFor(() =>
      expect(
        screen.getByText(/failed to update ride status/i),
      ).toBeInTheDocument(),
    )
    // Status pill should NOT show Full (the Open pill is still there)
    expect(screen.queryByText(/^Full$/i)).not.toBeInTheDocument()
  })

  it('calls onUnauthorized when marking as full returns 401', async () => {
    const user = userEvent.setup()
    const onUnauthorized = jest.fn()

    // Use a single ride owned by driver-1 with a pending request so
    // "Mark as full" appears in the dropdown.
    const rides = [
      {
        id: 'r1',
        driverId: 'driver-1',
        origin: 'Legon',
        destination: 'AmaliTech Office',
        date: 'Mon, 14 Sep',
        time: '7:00 AM',
        totalSeats: 4,
        seatsAvailable: 2,
        status: 'Open',
        expanded: false,
        requests: [
          { id: 'req-1', name: 'Kofi Adu', initials: 'KA', meta: '5 min ago' },
        ],
        passengers: [],
      },
    ]

    // The 401 response fires when the PATCH is made
    apiFetch.mockResolvedValueOnce({ ok: false, status: 401 })

    render(
      <RideStatusManagement
        user={{ id: 'driver-1', email: 'kwame.mensah@amalitech.com' }}
        currentUserId="driver-1"
        initialRides={rides}
        initialPastRides={[]}
        onUnauthorized={onUnauthorized}
      />,
    )

    await user.click(screen.getByRole('button', { name: /options for ride/i }))
    await user.click(screen.getByRole('menuitem', { name: /mark as full/i }))

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1))
  })

  it('opens cancel modal, can dismiss or confirm cancellation', async () => {
    const user = userEvent.setup()

    render(
      <RideStatusManagement
        user={{ id: 'driver-1', email: 'kwame.mensah@amalitech.com' }}
        currentUserId="driver-1"
      />,
    )

    // Click three-dot menu for first ride
    const menuButtons = screen.getAllByRole('button', {
      name: /options for ride/i,
    })
    await user.click(menuButtons[0])

    // Click Cancel ride option in dropdown
    await user.click(screen.getByRole('menuitem', { name: /cancel ride/i }))

    // Modal appears
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Cancel this ride\?/i)).toBeInTheDocument()

    // Click Keep ride — modal closes, no API call made
    await user.click(screen.getByRole('button', { name: /keep ride/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Open modal again and confirm cancellation
    await user.click(menuButtons[0])
    await user.click(screen.getByRole('menuitem', { name: /cancel ride/i }))
    await user.click(screen.getByRole('button', { name: /^cancel ride$/i }))

    // Wait for async API call then check UI updates
    await waitFor(() =>
      expect(screen.getByText(/Ride has been cancelled/i)).toBeInTheDocument(),
    )
    expect(screen.queryByText(/East Legon/i)).not.toBeInTheDocument()

    // Confirm the right API call was made
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/status'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      }),
    )
  })

  it('shows an error toast when cancellation fails on the server', async () => {
    apiFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const user = userEvent.setup()

    render(
      <RideStatusManagement
        user={{ id: 'driver-1', email: 'kwame.mensah@amalitech.com' }}
        currentUserId="driver-1"
      />,
    )

    const menuButtons = screen.getAllByRole('button', {
      name: /options for ride/i,
    })
    await user.click(menuButtons[0])
    await user.click(screen.getByRole('menuitem', { name: /cancel ride/i }))
    await user.click(screen.getByRole('button', { name: /^cancel ride$/i }))

    // Error toast appears, ride is still in the list
    await waitFor(() =>
      expect(screen.getByText(/failed to cancel ride/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/East Legon/i)).toBeInTheDocument()
  })

  it('calls onUnauthorized when cancellation returns 401', async () => {
    const user = userEvent.setup()
    const onUnauthorized = jest.fn()

    // Use a single ride owned by driver-1
    const rides = [
      {
        id: 'r2',
        driverId: 'driver-1',
        origin: 'Tema',
        destination: 'AmaliTech Office',
        date: 'Tue, 15 Sep',
        time: '7:30 AM',
        totalSeats: 3,
        seatsAvailable: 2,
        status: 'Open',
        expanded: false,
        requests: [],
        passengers: [],
      },
    ]

    // The 401 response fires when the PATCH is made
    apiFetch.mockResolvedValueOnce({ ok: false, status: 401 })

    render(
      <RideStatusManagement
        user={{ id: 'driver-1', email: 'kwame.mensah@amalitech.com' }}
        currentUserId="driver-1"
        initialRides={rides}
        initialPastRides={[]}
        onUnauthorized={onUnauthorized}
      />,
    )

    await user.click(screen.getByRole('button', { name: /options for ride/i }))
    await user.click(screen.getByRole('menuitem', { name: /cancel ride/i }))
    await user.click(screen.getByRole('button', { name: /^cancel ride$/i }))

    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1))
  })

  it('toggles past & cancelled section', async () => {
    const user = userEvent.setup()

    render(
      <RideStatusManagement user={{ email: 'kwame.mensah@amalitech.com' }} />,
    )

    expect(screen.queryByText(/Achimota/i)).not.toBeInTheDocument()

    // Click past & cancelled toggle
    await user.click(screen.getByRole('button', { name: /past & cancelled/i }))

    expect(screen.getByText(/Achimota/i)).toBeInTheDocument()
    expect(
      screen.getByText(/No actions available on past or cancelled rides/i),
    ).toBeInTheDocument()
  })

  it('displays empty state when switching to Rides I have joined tab', async () => {
    const user = userEvent.setup()

    render(
      <RideStatusManagement user={{ email: 'kwame.mensah@amalitech.com' }} />,
    )

    await user.click(screen.getByRole('tab', { name: /rides i've joined/i }))

    expect(
      screen.getByText(/you haven't joined any rides yet/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /find a ride/i }),
    ).toBeInTheDocument()
  })

  it('fetches pending requests via GET /api/rides/:rideId/requests when expanding an owned ride', async () => {
    const user = userEvent.setup()
    apiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Requests fetched successfully',
        data: [
          {
            id: 'req-dyn-1',
            passengerId: 'user-99',
            passengerName: 'Ada Lovelace',
            status: 'PENDING',
            createdAt: '2026-09-18T09:30:00.000Z',
          },
        ],
      }),
    })

    render(
      <RideStatusManagement
        user={{ id: 'driver-1', email: 'kwame.mensah@amalitech.com' }}
        currentUserId="driver-1"
        initialRides={[
          {
            id: 'ride-test-1',
            driverId: 'driver-1',
            origin: 'Madina',
            destination: 'AmaliTech Office',
            date: 'Mon, 14 Sep',
            time: '7:00 AM',
            totalSeats: 4,
            seatsAvailable: 3,
            status: 'Open',
            expanded: false,
            requests: [],
            passengers: [],
          },
        ]}
      />,
    )

    // Expand the ride
    await user.click(screen.getByText(/Madina/i))

    expect(apiFetch).toHaveBeenCalledWith('/api/rides/ride-test-1/requests')
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('AL')).toBeInTheDocument()
  })

  it('handles 401 response when accepting a request', async () => {
    const user = userEvent.setup()
    const onUnauthorized = jest.fn()
    apiFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    })

    render(
      <RideStatusManagement
        user={{ email: 'kwame.mensah@amalitech.com' }}
        onUnauthorized={onUnauthorized}
      />,
    )

    const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
    await user.click(acceptButtons[0])

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('handles error response when declining a request', async () => {
    const user = userEvent.setup()
    apiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    render(
      <RideStatusManagement user={{ email: 'kwame.mensah@amalitech.com' }} />,
    )

    const declineButtons = screen.getAllByRole('button', { name: /decline/i })
    await user.click(declineButtons[0])

    expect(screen.getByText('Failed to decline request.')).toBeInTheDocument()
  })
})
