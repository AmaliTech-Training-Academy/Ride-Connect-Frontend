import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import RideListScreen from './RideListScreen'

describe('RideListScreen', () => {
  it('renders the user banner and triggers logout', async () => {
    const user = userEvent.setup()
    const onLogout = jest.fn()

    render(
      <RideListScreen
        user={{ email: 'kwame.mensah@amalitech.com' }}
        onLogout={onLogout}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /find a ride/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/signed in as kwame\.mensah@amalitech\.com/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /log out/i }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
