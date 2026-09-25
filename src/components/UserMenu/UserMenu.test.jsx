import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import UserMenu from './UserMenu'

async function openMenu(user) {
  await user.click(screen.getByRole('button', { name: 'Account menu' }))
}

describe('UserMenu', () => {
  it('shows the trigger with the given initials and no popover initially', () => {
    render(<UserMenu initials="YO" onLogout={jest.fn()} />)

    expect(screen.getByText('YO')).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows the profile picture instead of initials once there is one', () => {
    const { container } = render(
      <UserMenu initials="YO" imageUrl="https://res.cloudinary.com/x/me.png" />,
    )

    expect(screen.queryByText('YO')).not.toBeInTheDocument()
    expect(container.querySelector('img.user-menu-avatar')).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/x/me.png',
    )
  })

  it('offers the three account actions', async () => {
    const user = userEvent.setup()
    render(<UserMenu initials="YO" />)

    await openMenu(user)

    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['Update profile picture', 'Change password', 'Logout'])
  })

  it('opens the popover at the trigger and logs out on click', async () => {
    const user = userEvent.setup()
    const onLogout = jest.fn()
    render(<UserMenu initials="YO" onLogout={onLogout} />)

    await openMenu(user)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: /logout/i }))

    expect(onLogout).toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens the picture picker and hands back the chosen file', async () => {
    const user = userEvent.setup()
    const onChangePicture = jest.fn()
    render(<UserMenu initials="YO" onChangePicture={onChangePicture} />)
    const picker = screen.getByLabelText('Choose a profile picture')
    const openPicker = jest.spyOn(picker, 'click')

    await openMenu(user)
    await user.click(
      screen.getByRole('menuitem', { name: 'Update profile picture' }),
    )
    expect(openPicker).toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    const file = new File(['x'], 'me.png', { type: 'image/png' })
    await user.upload(picker, file)

    expect(onChangePicture).toHaveBeenCalledWith(file)
  })

  it('shows progress and blocks another upload while one is running', async () => {
    const user = userEvent.setup()
    render(<UserMenu initials="YO" isUploadingImage />)

    await openMenu(user)

    expect(
      screen.getByRole('menuitem', { name: 'Uploading picture...' }),
    ).toBeDisabled()
  })

  it('asks to change the password, passing the trigger for focus return', async () => {
    const user = userEvent.setup()
    const onChangePassword = jest.fn()
    render(<UserMenu initials="YO" onChangePassword={onChangePassword} />)

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Change password' }))

    expect(onChangePassword).toHaveBeenCalledWith(
      screen.getByRole('button', { name: 'Account menu' }),
    )
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

    await openMenu(user)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes the popover on Escape', async () => {
    const user = userEvent.setup()
    render(<UserMenu initials="YO" onLogout={jest.fn()} />)

    await openMenu(user)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('does nothing when the picker is closed without choosing a file', () => {
    const onChangePicture = jest.fn()
    render(<UserMenu initials="YO" onChangePicture={onChangePicture} />)

    fireEvent.change(screen.getByLabelText('Choose a profile picture'), {
      target: { files: [] },
    })

    expect(onChangePicture).not.toHaveBeenCalled()
  })
})
