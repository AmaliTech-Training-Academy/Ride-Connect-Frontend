import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import MyRidesDashboard from './MyRidesDashboard'

describe('MyRidesDashboard', () => {
  it('accepts requests until a ride is full and blocks remaining requests', async () => {
    const user = userEvent.setup()
    render(<MyRidesDashboard onFindRide={jest.fn()} onOfferRide={jest.fn()} />)

    expect(screen.getByText('3 new requests')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])

    expect(
      await screen.findByText('Nana Yeboah has been added to your ride.'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 of 4 seats left')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Accept' })[0])

    expect(screen.getByText('0 of 4 seats left')).toBeInTheDocument()
    expect(screen.getByText('full')).toBeInTheDocument()
    expect(screen.getByText(/This ride is now full/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled()
  })

  it('declines a request, cancels a ride, and renders the joined placeholder', async () => {
    const user = userEvent.setup()
    render(<MyRidesDashboard onFindRide={jest.fn()} onOfferRide={jest.fn()} />)

    await user.click(screen.getAllByRole('button', { name: 'Decline' })[0])
    expect(screen.queryByText('Nana Yeboah')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Options for Adenta/ }))
    await user.click(screen.getByRole('button', { name: 'Cancel ride' }))
    expect(
      screen.getByRole('heading', { name: 'Cancel this ride?' }),
    ).toBeInTheDocument()
    await user.click(
      screen.getAllByRole('button', { name: 'Cancel ride' }).at(-1),
    )
    expect(screen.getByText('Past & cancelled (3)')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Rides I.ve joined/ }))
    expect(
      screen.getByRole('heading', { name: 'Coming soon' }),
    ).toBeInTheDocument()
  })
})
