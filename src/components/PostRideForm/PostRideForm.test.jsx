import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import { apiFetch } from '../../lib/api'
import PostRideForm from './PostRideForm'
import {
  futureISODate,
  pickDate,
  pickOffice,
  pickTime,
} from '../../test/pickers'
import { fetchMyRides, updateRide } from '../../services/rides'

jest.mock('../../lib/api', () => ({
  apiFetch: jest.fn(),
}))

async function fillWhen(user) {
  await pickDate(user, futureISODate(3))
  await pickTime(user, '08:30')
}

// The service is mocked directly: jest.mock on '../../lib/api' does not reach
// a service module's own import of it under this ESM setup.
jest.mock('../../services/rides', () => ({
  fetchMyRides: jest.fn(),
  updateRide: jest.fn(),
}))

/** Fills a valid "to the office" ride: Kasoa -> the Accra office. */
async function fillValidRide(user) {
  await user.type(screen.getByLabelText('Origin'), 'Kasoa')
  await pickOffice(user, 'Destination', 'Accra')
  await fillWhen(user)
}

const postRide = (user) =>
  user.click(screen.getByRole('button', { name: 'Post Ride' }))

const sentBody = () => JSON.parse(apiFetch.mock.calls[0][1].body)

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
    expect(screen.getByRole('radio', { name: 'To the office' })).toBeChecked()
    expect(screen.getByLabelText('Origin')).toHaveValue('')
    // No office is picked for the driver: they must choose one.
    expect(screen.getByLabelText('Destination')).toHaveTextContent(
      'Select an office',
    )
    expect(screen.getByText('Select a date')).toBeInTheDocument()
    expect(screen.getByText('Select a time')).toBeInTheDocument()
    expect(
      screen.getByText('Fill in the details to preview your ride card.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Post Ride' }),
    ).toBeInTheDocument()
  })

  it('offers exactly the three offices in our own list', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.click(screen.getByLabelText('Destination'))
    const list = screen.getByRole('listbox', { name: 'Choose an office' })
    const names = within(list)
      .getAllByRole('option')
      .map((option) => option.querySelector('.picker-select-label').textContent)

    expect(names).toEqual(['Accra office', 'Kumasi office', 'Takoradi office'])
  })

  it('shows validation errors when required fields are submitted empty', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await postRide(user)

    expect(screen.getByText('Please enter an origin')).toBeInTheDocument()
    expect(screen.getByText('Please choose an office')).toBeInTheDocument()
    expect(
      screen.getByText('Please enter a departure date'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Please enter a departure time'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Fix the errors to preview your ride card.'),
    ).toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it.each([
    'amalitech ACCRA',
    'Accra',
    'accra office',
    'AmaliTech Accra Office.',
  ])(
    'rejects "%s" as the start when heading to the Accra office',
    async (typed) => {
      const user = userEvent.setup()
      render(<PostRideForm />)

      await user.type(screen.getByLabelText('Origin'), typed)
      await pickOffice(user, 'Destination', 'Accra')
      await fillWhen(user)
      await postRide(user)

      expect(
        screen.getByText('Origin and destination must be different'),
      ).toBeInTheDocument()
      expect(apiFetch).not.toHaveBeenCalled()
    },
  )

  it('still allows a real place in the same city as the office', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.type(screen.getByLabelText('Origin'), 'Accra Mall')
    await pickOffice(user, 'Destination', 'Accra')
    await fillWhen(user)
    await postRide(user)

    expect(await screen.findByText('Your ride is live!')).toBeInTheDocument()
    expect(
      screen.queryByText('Origin and destination must be different'),
    ).not.toBeInTheDocument()
  })

  it('posts a ride to an office and shows the success state', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await fillValidRide(user)
    await postRide(user)

    expect(await screen.findByText('Your ride is live!')).toBeInTheDocument()
    expect(screen.getByText('NEW')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Request to Join' }),
    ).toBeDisabled()
    expect(sentBody()).toMatchObject({
      origin: 'Kasoa',
      destination: 'AmaliTech Accra',
      departureTime: '08:30',
      office: 'ACCRA',
    })
  })

  it('posts a ride leaving an office, with the office as the origin', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.click(screen.getByRole('radio', { name: 'From the office' }))
    // The office dropdown has moved to the origin side.
    await pickOffice(user, 'Origin', 'Takoradi')
    await user.type(screen.getByLabelText('Destination'), 'Anaji')
    await fillWhen(user)
    await postRide(user)

    await screen.findByText('Your ride is live!')
    expect(sentBody()).toMatchObject({
      origin: 'AmaliTech Takoradi',
      destination: 'Anaji',
      office: 'TAKORADI',
    })
  })

  it('asks for a destination when leaving the office without one', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.click(screen.getByRole('radio', { name: 'From the office' }))
    await postRide(user)

    expect(screen.getByText('Please enter a destination')).toBeInTheDocument()
    expect(screen.getByText('Please choose an office')).toBeInTheDocument()
  })

  it('shows the office on the preview card', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await fillValidRide(user)

    const preview = document.querySelector('.preview-card')
    expect(preview).toHaveTextContent('Kasoa')
    expect(preview).toHaveTextContent('AmaliTech Accra')
  })

  it('omits routeDescription entirely when the optional field is blank', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await fillValidRide(user)
    await postRide(user)
    await screen.findByText('Your ride is live!')

    // Sending null here is what the backend schema rejects.
    expect(sentBody()).not.toHaveProperty('routeDescription')
  })

  it('sends routeDescription when the optional field is filled in', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await fillValidRide(user)
    await user.type(
      screen.getByLabelText(/Route description/),
      '  Via the N1  ',
    )
    await postRide(user)
    await screen.findByText('Your ride is live!')

    expect(sentBody().routeDescription).toBe('Via the N1')
  })

  it('swaps the trip direction, keeping the office and the place', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.type(screen.getByLabelText('Origin'), 'Kasoa')
    await pickOffice(user, 'Destination', 'Kumasi')
    await user.click(
      screen.getByRole('button', { name: 'Swap origin and destination' }),
    )

    expect(screen.getByRole('radio', { name: 'From the office' })).toBeChecked()
    expect(screen.getByLabelText('Origin')).toHaveTextContent('Kumasi office')
    expect(screen.getByLabelText('Destination')).toHaveValue('Kasoa')
  })

  it("shows the backend's office error under the office dropdown", async () => {
    apiFetch.mockResolvedValueOnce({
      status: 400,
      ok: false,
      json: async () => ({
        success: false,
        message: 'The request is invalid',
        data: {
          fields: {
            office: ['Office must be one of KUMASI, ACCRA, or TAKORADI.'],
          },
        },
      }),
    })
    const user = userEvent.setup()
    render(<PostRideForm />)

    await fillValidRide(user)
    await postRide(user)

    const officeField = screen
      .getByLabelText('Destination')
      .closest('.form-field')
    expect(
      await within(officeField).findByText(
        'Office must be one of KUMASI, ACCRA, or TAKORADI.',
      ),
    ).toBeInTheDocument()
  })

  it('shows a backend error for the typed place on its own side', async () => {
    apiFetch.mockResolvedValueOnce({
      status: 400,
      ok: false,
      json: async () => ({
        data: { fields: { origin: ['Origin is required.'] } },
      }),
    })
    const user = userEvent.setup()
    render(<PostRideForm />)

    await fillValidRide(user)
    await postRide(user)

    const placeField = screen.getByLabelText('Origin').closest('.form-field')
    expect(
      await within(placeField).findByText('Origin is required.'),
    ).toBeInTheDocument()
  })

  it('increments and decrements seats within the 1-8 bounds', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    const decreaseBtn = screen.getByRole('button', { name: 'Decrease seats' })
    const increaseBtn = screen.getByRole('button', { name: 'Increase seats' })
    // Scoped to the stepper: a bare getByText('8') also matches a day in the
    // date picker, which makes the query ambiguous depending on what is open.
    const seatCount = () =>
      document.querySelector('.seat-count').textContent.trim()

    expect(decreaseBtn).toBeDisabled()

    for (let i = 0; i < 7; i += 1) {
      await user.click(increaseBtn)
    }
    expect(seatCount()).toBe('8')
    expect(increaseBtn).toBeDisabled()

    await user.click(decreaseBtn)
    expect(seatCount()).toBe('7')
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

    await user.click(screen.getByRole('radio', { name: 'From the office' }))
    await pickOffice(user, 'Origin', 'Accra')
    await user.type(screen.getByLabelText('Destination'), 'Kasoa')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('radio', { name: 'To the office' })).toBeChecked()
    expect(screen.getByLabelText('Origin')).toHaveValue('')
    expect(screen.getByLabelText('Destination')).toHaveTextContent(
      'Select an office',
    )
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
          destination: 'AmaliTech Accra',
          office: 'ACCRA',
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
    expect(screen.getByRole('radio', { name: 'To the office' })).toBeChecked()
    expect(screen.getByLabelText('Destination')).toHaveTextContent(
      'Accra office',
    )
    expect(screen.getByLabelText(/Route description/)).toHaveValue('Via the N1')
  })

  it('puts the office on the origin side for a ride leaving the office', async () => {
    fetchMyRides.mockResolvedValue(
      myRidesPayload({
        origin: 'AmaliTech Kumasi',
        destination: 'Adum',
        office: 'KUMASI',
      }),
    )
    render(<PostRideForm editRideId="ride-1" />)

    expect(await screen.findByLabelText('Origin')).toHaveTextContent(
      'Kumasi office',
    )
    expect(screen.getByRole('radio', { name: 'From the office' })).toBeChecked()
    expect(screen.getByLabelText('Destination')).toHaveValue('Adum')
  })

  it("locks the office, which the edit endpoint can't change", async () => {
    render(<PostRideForm editRideId="ride-1" />)

    const office = await screen.findByLabelText('Destination')
    expect(office).toBeDisabled()
    expect(office).toHaveAttribute(
      'title',
      "A posted ride's office can't be changed",
    )
    expect(screen.getByLabelText('Origin')).toBeEnabled()
  })

  it('works out the office of a ride posted before offices existed', async () => {
    fetchMyRides.mockResolvedValue(
      myRidesPayload({
        origin: 'Takoradi office',
        destination: 'Anaji',
        office: undefined,
      }),
    )
    render(<PostRideForm editRideId="ride-1" />)

    expect(await screen.findByLabelText('Origin')).toHaveTextContent(
      'Takoradi office',
    )
    expect(screen.getByLabelText('Destination')).toHaveValue('Anaji')
  })

  it('lets the driver choose an office when an old ride names none', async () => {
    fetchMyRides.mockResolvedValue(
      myRidesPayload({ destination: 'AmaliTech Office', office: undefined }),
    )
    render(<PostRideForm editRideId="ride-1" />)

    const office = await screen.findByLabelText('Destination')
    expect(office).toHaveTextContent('Select an office')
    expect(office).toBeEnabled()
    expect(screen.getByLabelText('Origin')).toHaveValue('East Legon')
  })

  it('goes back to My Rides on Cancel instead of blanking the ride', async () => {
    const user = userEvent.setup()
    const onMyRides = jest.fn()
    render(<PostRideForm editRideId="ride-1" onMyRides={onMyRides} />)
    await screen.findByLabelText('Origin')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onMyRides).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Origin')).toHaveValue('East Legon')
    expect(updateRide).not.toHaveBeenCalled()
  })

  it('shows a seat error from the edit endpoint under the seats', async () => {
    const user = userEvent.setup()
    const error = new Error('Validation failed')
    error.status = 400
    error.fields = { totalSeats: ['Must be at least 2'] }
    updateRide.mockRejectedValueOnce(error)

    render(<PostRideForm editRideId="ride-1" />)
    await screen.findByLabelText('Origin')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Must be at least 2')).toBeInTheDocument()
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
      destination: 'AmaliTech Accra',
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
    expect(
      screen.getByRole('heading', { name: "We couldn't open that ride" }),
    ).toBeInTheDocument()
  })

  it('offers a way out of the error rather than stranding the driver', async () => {
    const user = userEvent.setup()
    const onMyRides = jest.fn()
    const onFindRide = jest.fn()
    fetchMyRides.mockResolvedValue({ data: { driving: [] } })

    render(
      <PostRideForm
        editRideId="missing"
        onMyRides={onMyRides}
        onFindRide={onFindRide}
      />,
    )
    await screen.findByRole('heading', { name: "We couldn't open that ride" })

    await user.click(screen.getByRole('button', { name: 'Back to My Rides' }))
    expect(onMyRides).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Find a ride' }))
    expect(onFindRide).toHaveBeenCalledTimes(1)
  })

  it('survives a load failure with no navigation handlers', async () => {
    const user = userEvent.setup()
    fetchMyRides.mockRejectedValue(new Error('Network down'))

    render(<PostRideForm editRideId="ride-1" />)
    await screen.findByRole('heading', { name: "We couldn't open that ride" })

    // The buttons are optional callbacks; clicking must not throw.
    await user.click(screen.getByRole('button', { name: 'Back to My Rides' }))
    expect(screen.getByText('Network down')).toBeInTheDocument()
  })

  it('leaves the create flow untouched', async () => {
    render(<PostRideForm />)

    expect(
      screen.getByRole('heading', { name: 'Offer a ride' }),
    ).toBeInTheDocument()
    expect(fetchMyRides).not.toHaveBeenCalled()
  })
})
