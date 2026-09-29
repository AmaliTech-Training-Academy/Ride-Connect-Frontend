import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import { apiFetch } from '../../lib/api'
import PostRideForm from './PostRideForm'

jest.mock('../../lib/api', () => ({
  apiFetch: jest.fn(),
}))

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function futureISODate(daysAhead) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return toISODate(date)
}

function fillWhen() {
  fireEvent.change(screen.getByLabelText('Departure date'), {
    target: { value: futureISODate(3) },
  })
  fireEvent.change(screen.getByLabelText('Departure time'), {
    target: { value: '08:30' },
  })
}

/** Fills a valid "to the office" ride: Kasoa -> the Accra office. */
async function fillValidRide(user) {
  await user.type(screen.getByLabelText('Origin'), 'Kasoa')
  await user.selectOptions(screen.getByLabelText('Destination'), 'ACCRA')
  fillWhen()
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
    expect(screen.getByLabelText('Destination')).toHaveValue('')
    expect(screen.getByText('Select a date')).toBeInTheDocument()
    expect(screen.getByText('Select a time')).toBeInTheDocument()
    expect(
      screen.getByText('Fill in the details to preview your ride card.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Post Ride' }),
    ).toBeInTheDocument()
  })

  it('offers exactly the three offices', () => {
    render(<PostRideForm />)

    const options = within(screen.getByLabelText('Destination'))
      .getAllByRole('option')
      .filter((option) => !option.disabled)
      .map((option) => option.textContent)

    expect(options).toEqual([
      'Accra office',
      'Kumasi office',
      'Takoradi office',
    ])
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
      await user.selectOptions(screen.getByLabelText('Destination'), 'ACCRA')
      fillWhen()
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
    await user.selectOptions(screen.getByLabelText('Destination'), 'ACCRA')
    fillWhen()
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
    await user.selectOptions(screen.getByLabelText('Origin'), 'TAKORADI')
    await user.type(screen.getByLabelText('Destination'), 'Anaji')
    fillWhen()
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
    await user.selectOptions(screen.getByLabelText('Destination'), 'KUMASI')
    await user.click(
      screen.getByRole('button', { name: 'Swap origin and destination' }),
    )

    expect(screen.getByRole('radio', { name: 'From the office' })).toBeChecked()
    expect(screen.getByLabelText('Origin')).toHaveValue('KUMASI')
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

    await user.click(screen.getByRole('radio', { name: 'From the office' }))
    await user.selectOptions(screen.getByLabelText('Origin'), 'ACCRA')
    await user.type(screen.getByLabelText('Destination'), 'Kasoa')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('radio', { name: 'To the office' })).toBeChecked()
    expect(screen.getByLabelText('Origin')).toHaveValue('')
    expect(screen.getByLabelText('Destination')).toHaveValue('')
  })
})
