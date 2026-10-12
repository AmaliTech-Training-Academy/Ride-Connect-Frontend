import { render, screen } from '@testing-library/react'
import { describe, expect, it } from '@jest/globals'
import RidePreviewCard from './RidePreviewCard'

const ride = {
  origin: 'Kasoa',
  destination: 'AmaliTech Office',
  description: '',
  date: '2026-09-30',
  time: '08:00',
  seats: 2,
}

describe('RidePreviewCard driver avatar', () => {
  it("shows the driver's own picture when they have one", () => {
    const { container } = render(
      <RidePreviewCard
        ride={ride}
        isValid
        driverImage="https://res.cloudinary.com/x/me.png"
        driverInitials="AO"
      />,
    )

    expect(container.querySelector('img.avatar')).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/x/me.png',
    )
  })

  it("shows the driver's initials when they have no picture", () => {
    render(<RidePreviewCard ride={ride} isValid driverInitials="AO" />)

    expect(screen.getByText('AO')).toHaveClass('avatar')
  })

  it('falls back to "Y" for You when the initials are unknown', () => {
    render(<RidePreviewCard ride={ride} isValid />)

    expect(screen.getByText('Y')).toHaveClass('avatar')
  })
})
