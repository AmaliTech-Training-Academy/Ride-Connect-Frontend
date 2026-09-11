import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostRideForm from './PostRideForm'

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function todayISODate() {
  return toISODate(new Date())
}

function futureISODate(daysAhead) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return toISODate(date)
}

describe('PostRideForm', () => {
  it('renders the empty form correctly', () => {
    render(<PostRideForm />)

    expect(screen.getByRole('heading', { name: 'Offer a ride' })).toBeInTheDocument()
    expect(screen.getByLabelText('Origin')).toHaveValue('')
    expect(screen.getByLabelText('Destination')).toHaveValue('AmaliTech Office')
    expect(screen.getByText('Select a date')).toBeInTheDocument()
    expect(screen.getByText('Select a time')).toBeInTheDocument()
    expect(
      screen.getByText('Fill in the details to preview your ride card.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Post Ride' })).toBeInTheDocument()
  })

  it('shows validation errors when required fields are submitted empty', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.click(screen.getByRole('button', { name: 'Post Ride' }))

    expect(screen.getByText('Please enter an origin')).toBeInTheDocument()
    expect(screen.getByText('Please enter a departure date')).toBeInTheDocument()
    expect(screen.getByText('Please enter a departure time')).toBeInTheDocument()
    expect(
      screen.getByText('Fix the errors to preview your ride card.')
    ).toBeInTheDocument()
  })

  it("shows the departure time can't be in the past error for today + a past time", async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.type(screen.getByLabelText('Origin'), 'Kumasi')
    fireEvent.change(screen.getByLabelText('Departure date'), {
      target: { value: todayISODate() },
    })
    fireEvent.change(screen.getByLabelText('Departure time'), {
      target: { value: '00:01' },
    })

    await user.click(screen.getByRole('button', { name: 'Post Ride' }))

    expect(screen.getByText("Departure time can't be in the past")).toBeInTheDocument()
    expect(screen.queryByText('Please enter a departure date')).not.toBeInTheDocument()
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

    expect(await screen.findByText('Posting…')).toBeInTheDocument()

    expect(
      await screen.findByText('Your ride is live!', {}, { timeout: 2500 })
    ).toBeInTheDocument()
    expect(screen.getByText('NEW')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request to Join' })).toBeDisabled()
  })

  it('swaps origin and destination when the swap button is clicked', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.type(screen.getByLabelText('Origin'), 'Kumasi')
    await user.click(screen.getByRole('button', { name: 'Swap origin and destination' }))

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

    await user.type(screen.getByLabelText(/Route description/), 'Via the market road')

    expect(screen.getByText('19 / 200')).toBeInTheDocument()
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
