import { render, screen, fireEvent } from '@testing-library/react'
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

describe('PostRideForm', () => {
  beforeEach(() => {
    apiFetch.mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({ data: { id: 'ride-1' } }),
    })
  })

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

  it('rejects an origin and destination that differ only by case', async () => {
    const user = userEvent.setup()
    render(<PostRideForm />)

    await user.clear(screen.getByLabelText('Destination'))
    await user.type(screen.getByLabelText('Origin'), 'AmaliTech office')
    await user.type(screen.getByLabelText('Destination'), 'amalitech OFFICE')

    await user.click(screen.getByRole('button', { name: 'Post Ride' }))

    expect(screen.getByText('Origin and destination must be different')).toBeInTheDocument()
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

    expect(
      await screen.findByText('Your ride is live!')
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
