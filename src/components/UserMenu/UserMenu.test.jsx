import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import UserMenu from './UserMenu'

describe('UserMenu', () => {
  it('shows the trigger with the given initials and no popover initially', () => {
    render(<UserMenu initials="YO" onLogout={jest.fn()} />)

    expect(screen.getByText('YO')).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens the popover at the trigger and logs out on click', async () => {
    const user = userEvent.setup()
    const onLogout = jest.fn()
    render(<UserMenu initials="YO" onLogout={onLogout} />)

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: /logout/i }))

    expect(onLogout).toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes the popover when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <UserMenu initials="YO" onLogout={jest.fn()} />
        <button type="button">Outside</button>
      </div>,
    )

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes the popover on Escape', async () => {
    const user = userEvent.setup()
    render(<UserMenu initials="YO" onLogout={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
