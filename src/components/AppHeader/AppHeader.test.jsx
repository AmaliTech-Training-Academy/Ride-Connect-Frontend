import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import AppHeader from './AppHeader'
import { uploadImage } from '../../services/cloudinary'
import { changePassword, updateProfileImage } from '../../services/auth'

jest.mock('../../services/cloudinary', () => ({
  uploadImage: jest.fn(),
}))
jest.mock('../../services/auth', () => ({
  updateProfileImage: jest.fn(),
  changePassword: jest.fn(),
}))

function CurrentPath() {
  return <p data-testid="path">{useLocation().pathname}</p>
}

function renderHeader(path = '/find-a-ride', props = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppHeader userInitials="AO" onLogout={jest.fn()} {...props} />
      <Routes>
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppHeader', () => {
  beforeEach(() => {
    uploadImage.mockReset()
    updateProfileImage.mockReset()
  })

  it.each([
    ['/find-a-ride', 'Find a Ride'],
    ['/my-rides', 'My Rides'],
  ])('marks the tab for %s as the current page', (path, label) => {
    renderHeader(path)

    expect(screen.getByRole('button', { name: label })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it.each([
    ['Find a Ride', '/find-a-ride'],
    ['My Rides', '/my-rides'],
    ['Offer a Ride', '/offer-a-ride'],
  ])('navigates to %s', async (label, path) => {
    const user = userEvent.setup()
    renderHeader('/some-other-page')

    await user.click(screen.getByRole('button', { name: label }))

    expect(screen.getByTestId('path')).toHaveTextContent(path)
  })

  it('goes home from the brand', async () => {
    const user = userEvent.setup()
    renderHeader('/my-rides')

    await user.click(screen.getByRole('button', { name: /RideConnect/ }))

    expect(screen.getByTestId('path')).toHaveTextContent('/find-a-ride')
  })

  it('shows the viewer initials and logs out from the account menu', async () => {
    const user = userEvent.setup()
    const onLogout = jest.fn()
    renderHeader('/find-a-ride', { onLogout })

    expect(screen.getByText('AO')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: /logout/i }))

    expect(onLogout).toHaveBeenCalled()
  })

  it('uploads a new picture, saves it, and passes it up to the app', async () => {
    const user = userEvent.setup()
    const onUserUpdated = jest.fn()
    uploadImage.mockResolvedValue('https://res.cloudinary.com/x/me.png')
    updateProfileImage.mockResolvedValue(undefined)
    renderHeader('/find-a-ride', { onUserUpdated })
    const file = new File(['x'], 'me.png', { type: 'image/png' })

    await user.upload(screen.getByLabelText('Choose a profile picture'), file)

    expect(uploadImage).toHaveBeenCalledWith(file)
    expect(updateProfileImage).toHaveBeenCalledWith(
      'https://res.cloudinary.com/x/me.png',
    )
    expect(onUserUpdated).toHaveBeenCalledWith({
      image: 'https://res.cloudinary.com/x/me.png',
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Profile picture updated.',
    )
  })

  it('reports a failed upload and keeps the old picture', async () => {
    const user = userEvent.setup()
    const onUserUpdated = jest.fn()
    uploadImage.mockRejectedValue(new Error('Please choose an image under 5 MB.'))
    renderHeader('/find-a-ride', { onUserUpdated })

    await user.upload(
      screen.getByLabelText('Choose a profile picture'),
      new File(['x'], 'huge.png', { type: 'image/png' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please choose an image under 5 MB.',
    )
    expect(updateProfileImage).not.toHaveBeenCalled()
    expect(onUserUpdated).not.toHaveBeenCalled()
  })

  it('opens the change-password panel from the account menu', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Change password' }))

    expect(
      screen.getByRole('dialog', { name: 'Change password' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirms a changed password once the panel closes', async () => {
    const user = userEvent.setup()
    changePassword.mockResolvedValue(undefined)
    renderHeader()

    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Change password' }))
    await user.type(screen.getByLabelText('Current password'), 'OldPass123')
    await user.type(screen.getByLabelText('New password'), 'NewPass456')
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPass456')
    await user.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your password has been updated.',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
