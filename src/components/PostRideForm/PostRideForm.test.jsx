import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import { apiFetch } from '../../lib/api'
import PostRideForm from './PostRideForm'
import { fetchMyRides, updateRide } from '../../services/rides'

jest.mock('../../lib/api', () => ({
  apiFetch: jest.fn(),
}))

// The service is mocked directly: jest.mock on '../../lib/api' does not reach
// a service module's own import of it under this ESM setup.
jest.mock('../../services/rides', () => ({
  fetchMyRides: jest.fn(),
  updateRide: jest.fn(),
}))

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function futureISODate(daysAhead) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return toISODate(date)
}

describe('PostRideForm', () => {
  beforeEach(() => {
    // Calls accumulated across tests, so assertions on mock.calls[0] read
    // whatever an earlier test happened to send.
    apiFetch.mockClear()
    apiFetch.mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({ data: { id: 'ride-1' } }),
    })
  })

  it('renders the empty form correctly', () => {
    render(<PostRideForm />)

    expect(
      screen.getByRole('heading', { name: 'Offer a ride' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Origin')).toHaveValue('')
    expect(screen.getByLabelText('Destination')).toHaveValue('AmaliTech Office')
    expect(screen.getByText('Select a date')).toBeInTheDocument()
    expect(screen.getByText('Select a time')).toBeInTheDocument()
    expect(
      screen.getByText('Fill in the details to preview your ride card.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Post Ride' }),
    ).toBeInTheDocument()
  })

  it('shows validation errors when required fields are submitted empty', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.click(screen.getByRole('button', { name: 'Post Ride' }))

    expect(screen.getByText('Please enter an origin')).toBeInTheDocument()
    expect(
      screen.getByText('Please enter a departure date'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Please enter a departure time'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Fix the errors to preview your ride card.'),
    ).toBeInTheDocument()
  })

  it('rejects an origin and destination that differ only by case', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.clear(screen.getByLabelText('Destination'))
    await user.type(screen.getByLabelText('Origin'), 'AmaliTech office')
    await user.type(screen.getByLabelText('Destination'), 'amalitech OFFICE')

    await user.click(screen.getByRole('button', { name: 'Post Ride' }))

    expect(
      screen.getByText('Origin and destination must be different'),
    ).toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('allows submission with valid data and shows the success state', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.type(screen.getByLabelText('Origin'), 'Kumasi')
    fireEvent.change(screen.getByLabelText('Departure date'), {
      target: { value: futureISODate(3) },
    })
    fireEvent.change(screen.getByLabelText('Departure time'), {
      target: { value: '08:30' },
    })

    await user.click(screen.getByRole('button', { name: 'Post Ride' }))

    expect(await screen.findByText('Your ride is live!')).toBeInTheDocument()
    expect(screen.getByText('NEW')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Request to Join' }),
    ).toBeDisabled()
  })

  it('omits routeDescription entirely when the optional field is blank', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.type(screen.getByLabelText('Origin'), 'Kumasi')
    fireEvent.change(screen.getByLabelText('Departure date'), {
      target: { value: futureISODate(3) },
    })
    fireEvent.change(screen.getByLabelText('Departure time'), {
      target: { value: '08:30' },
    })

    await user.click(screen.getByRole('button', { name: 'Post Ride' }))
    await screen.findByText('Your ride is live!')

    const body = JSON.parse(apiFetch.mock.calls[0][1].body)
    // Sending null here is what the backend schema rejects.
    expect(body).not.toHaveProperty('routeDescription')
    expect(body).toMatchObject({
      origin: 'Kumasi',
      destination: 'AmaliTech Office',
      departureTime: '08:30',
    })
  })

  it('sends routeDescription when the optional field is filled in', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.type(screen.getByLabelText('Origin'), 'Kumasi')
    await user.type(
      screen.getByLabelText(/Route description/),
      '  Via the N1  ',
    )
    fireEvent.change(screen.getByLabelText('Departure date'), {
      target: { value: futureISODate(3) },
    })
    fireEvent.change(screen.getByLabelText('Departure time'), {
      target: { value: '08:30' },
    })

    await user.click(screen.getByRole('button', { name: 'Post Ride' }))
    await screen.findByText('Your ride is live!')

    const body = JSON.parse(apiFetch.mock.calls[0][1].body)
    expect(body.routeDescription).toBe('Via the N1')
  })

  it('swaps origin and destination when the swap button is clicked', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.type(screen.getByLabelText('Origin'), 'Kumasi')
    await user.click(
      screen.getByRole('button', { name: 'Swap origin and destination' }),
    )

    expect(screen.getByLabelText('Origin')).toHaveValue('AmaliTech Office')
    expect(screen.getByLabelText('Destination')).toHaveValue('Kumasi')
  })

  it('increments and decrements seats within the 1-8 bounds', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    const decreaseBtn = screen.getByRole('button', { name: 'Decrease seats' })
    const increaseBtn = screen.getByRole('button', { name: 'Increase seats' })

    expect(decreaseBtn).toBeDisabled()

    for (let i = 0; i < 7; i += 1) {
      await user.click(increaseBtn)
    }
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(increaseBtn).toBeDisabled()

    await user.click(decreaseBtn)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(increaseBtn).not.toBeDisabled()
  })

  it('shows a live character counter for the route description', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.type(
      screen.getByLabelText(/Route description/),
      'Via the market road',
    )

    expect(screen.getByText('19 / 500')).toBeInTheDocument()
  })

  it('resets the form when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.type(screen.getByLabelText('Origin'), 'Kumasi')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByLabelText('Origin')).toHaveValue('')
    expect(screen.getByLabelText('Destination')).toHaveValue('AmaliTech Office')
  })
})

describe('PostRideForm - editing an existing ride', () => {
  const futureDeparture = () => {
    const date = new Date()
    date.setDate(date.getDate() + 3)
    date.setHours(7, 15, 0, 0)
    return date.toISOString()
  }

  const myRidesPayload = (overrides = {}) => ({
    data: {
      driving: [
        {
          id: 'ride-1',
          origin: 'East Legon',
          destination: 'AmaliTech Office',
          routeDescription: 'Via the N1',
          departureAt: futureDeparture(),
          totalSeats: 4,
          availableSeats: 2,
          status: 'OPEN',
          pendingRequests: [],
          confirmedPassengers: [],
          ...overrides,
        },
      ],
      joined: [],
      pastAndCancelled: [],
      joinedPastAndCancelled: [],
    },
  })

  beforeEach(() => {
    jest.clearAllMocks()
    fetchMyRides.mockResolvedValue(myRidesPayload())
    updateRide.mockResolvedValue({ id: 'ride-1' })
  })

  it('fills the form with the ride being edited', async () => {
    render(<PostRideForm editRideId="ride-1" />)

    expect(await screen.findByLabelText('Origin')).toHaveValue('East Legon')
    expect(screen.getByLabelText('Destination')).toHaveValue('AmaliTech Office')
    expect(screen.getByLabelText(/Route description/)).toHaveValue('Via the N1')
  })

  it('reads as editing rather than offering', async () => {
    render(<PostRideForm editRideId="ride-1" />)

    expect(
      await screen.findByRole('heading', { name: 'Edit your ride' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Post Ride' }),
    ).not.toBeInTheDocument()
  })

  it('saves the changes to the ride being edited', async () => {
    const user = userEvent.setup()
    const onFindRide = jest.fn()
    render(<PostRideForm editRideId="ride-1" onFindRide={onFindRide} />)
    await screen.findByLabelText('Origin')

    await user.clear(screen.getByLabelText('Origin'))
    await user.type(screen.getByLabelText('Origin'), 'Adenta')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    // The edit endpoint takes totalSeats and ignores availableSeats.
    expect(updateRide).toHaveBeenCalledWith('ride-1', {
      origin: 'Adenta',
      destination: 'AmaliTech Office',
      departureDate: expect.any(String),
      departureTime: expect.any(String),
      totalSeats: 4,
      routeDescription: 'Via the N1',
    })
    expect(updateRide.mock.calls[0][1]).not.toHaveProperty('availableSeats')
    expect(
      await screen.findByText('Your ride has been updated.'),
    ).toBeInTheDocument()
    expect(onFindRide).toHaveBeenCalledWith('ride-1')
    // Editing must never create a second ride.
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('will not drop seats below the number already taken', async () => {
    const user = userEvent.setup()
    // 4 total, 2 available means 2 are already accepted.
    render(<PostRideForm editRideId="ride-1" />)
    await screen.findByLabelText('Origin')

    const decrease = screen.getByRole('button', { name: 'Decrease seats' })
    await user.click(decrease)
    expect(screen.getByText('3')).toBeInTheDocument()

    await user.click(decrease)
    expect(screen.getByText('2')).toBeInTheDocument()

    // Two passengers are on board; the floor stops here.
    expect(decrease).toBeDisabled()
  })

  it('shows the backend field error beside the input', async () => {
    const user = userEvent.setup()
    const error = new Error('Validation failed')
    error.status = 400
    error.fields = { availableSeats: ['Cannot be fewer than accepted seats'] }
    updateRide.mockRejectedValueOnce(error)

    render(<PostRideForm editRideId="ride-1" />)
    await screen.findByLabelText('Origin')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('Cannot be fewer than accepted seats'),
    ).toBeInTheDocument()
  })

  it('sends an empty description so a cleared note is actually cleared', async () => {
    const user = userEvent.setup()
    render(<PostRideForm editRideId="ride-1" />)
    await screen.findByLabelText('Origin')

    await user.clear(screen.getByLabelText(/Route description/))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    // This is a partial update: omitting the key would leave the old note in
    // place rather than removing it.
    expect(updateRide).toHaveBeenCalledWith(
      'ride-1',
      expect.objectContaining({ routeDescription: '' }),
    )
  })

  it('shows a conflict message from the backend', async () => {
    const user = userEvent.setup()
    const error = new Error(
      'Total seats cannot be less than the 2 passenger(s) already accepted.',
    )
    error.status = 409
    updateRide.mockRejectedValueOnce(error)

    render(<PostRideForm editRideId="ride-1" />)
    await screen.findByLabelText('Origin')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText(
        'Total seats cannot be less than the 2 passenger(s) already accepted.',
      ),
    ).toBeInTheDocument()
  })

  it('reports a ride it cannot find', async () => {
    fetchMyRides.mockResolvedValue({ data: { driving: [] } })
    render(<PostRideForm editRideId="missing" />)

    expect(
      await screen.findByText('That ride could not be found.'),
    ).toBeInTheDocument()
  })

  it('leaves the create flow untouched', async () => {
    render(<PostRideForm />)

    expect(
      screen.getByRole('heading', { name: 'Offer a ride' }),
    ).toBeInTheDocument()
    expect(fetchMyRides).not.toHaveBeenCalled()
  })
})
