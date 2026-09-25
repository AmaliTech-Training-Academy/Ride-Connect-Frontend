import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from '@jest/globals'
import UserAvatar from './UserAvatar'

const URL = 'https://res.cloudinary.com/x/me.png'

describe('UserAvatar', () => {
  it('shows the picture when there is one', () => {
    const { container } = render(
      <UserAvatar className="avatar" imageUrl={URL} initials="AO" />,
    )

    expect(container.querySelector('img.avatar')).toHaveAttribute('src', URL)
    expect(screen.queryByText('AO')).not.toBeInTheDocument()
  })

  it('shows the initials when there is no picture', () => {
    render(<UserAvatar className="avatar" initials="AO" />)

    expect(screen.getByText('AO')).toHaveClass('avatar')
  })

  it('falls back to the initials when the picture fails to load', () => {
    const { container } = render(
      <UserAvatar className="avatar" imageUrl={URL} initials="AO" />,
    )

    fireEvent.error(container.querySelector('img'))

    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('AO')).toBeInTheDocument()
  })

  it('tries again when given a different picture', () => {
    const { container, rerender } = render(
      <UserAvatar className="avatar" imageUrl={URL} initials="AO" />,
    )
    fireEvent.error(container.querySelector('img'))

    rerender(
      <UserAvatar className="avatar" imageUrl={`${URL}?v=2`} initials="AO" />,
    )

    expect(container.querySelector('img')).toHaveAttribute('src', `${URL}?v=2`)
  })
})
