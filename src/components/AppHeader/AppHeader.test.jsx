import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import AppHeader from './AppHeader'
import { uploadAvatar } from '../../services/avatar'
import { changePassword } from '../../services/auth'

jest.mock('../../services/avatar', () => ({
  uploadAvatar: jest.fn(),
}))
jest.mock('../../services/auth', () => ({
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
    uploadAvatar.mockReset()
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

  it('shows the signed-in name and address in the account menu', async () => {
    const user = userEvent.setup()
    renderHeader('/find-a-ride', {
      userName: 'Kwame Mensah',
      userEmail: 'kwame@amalitech.com',
    })

    await user.click(screen.getByRole('button', { name: 'Account menu' }))

    expect(screen.getByText('Kwame Mensah')).toBeInTheDocument()
    expect(screen.getByText('kwame@amalitech.com')).toBeInTheDocument()
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

  it('uploads a new picture and passes it up to the app', async () => {
    const user = userEvent.setup()
    const onUserUpdated = jest.fn()
    const image = 'https://bucket.s3.eu-west-1.amazonaws.com/avatars/u1/me.png'
    uploadAvatar.mockResolvedValue(image)
    renderHeader('/find-a-ride', { onUserUpdated })
    const file = new File(['x'], 'me.png', { type: 'image/png' })

    await user.upload(screen.getByLabelText('Choose a profile picture'), file)

    expect(uploadAvatar).toHaveBeenCalledWith(file)
    expect(onUserUpdated).toHaveBeenCalledWith({ image })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Profile picture updated.',
    )
  })

  it('reports a failed upload and keeps the old picture', async () => {
    const user = userEvent.setup()
    const onUserUpdated = jest.fn()
    uploadAvatar.mockRejectedValue(
      new Error('Please choose an image under 5 MB.'),
    )
    renderHeader('/find-a-ride', { onUserUpdated })

    await user.upload(
      screen.getByLabelText('Choose a profile picture'),
      new File(['x'], 'huge.png', { type: 'image/png' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please choose an image under 5 MB.',
    )
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

  describe('on a phone', () => {
    /** jsdom has no matchMedia, so the phone breakpoint is stubbed as matched. */
    function pretendPhone() {
      globalThis.matchMedia = jest.fn(() => ({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
    }

    afterEach(() => {
      delete globalThis.matchMedia
    })

    it('moves the destinations into a bottom bar', () => {
      pretendPhone()
      renderHeader('/find-a-ride')

      const bar = screen.getByRole('navigation', { name: 'Main navigation' })
      // Read by accessible name: the avatar contributes its initials to the
      // account tab's text, which says nothing about what the tab is.
      expect(
        within(bar)
          .getAllByRole('button')
          .map(
            (button) => button.getAttribute('aria-label') ?? button.textContent,
          ),
      ).toEqual(['Find', 'My Rides', 'Offer', 'Account menu'])
    })

    it('keeps the header to the brand and the notification bell', () => {
      pretendPhone()
      renderHeader('/find-a-ride')

      // The wrapped three-row header was what made the hero unreadable.
      expect(
        screen.queryByRole('button', { name: 'Offer a Ride' }),
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Notifications/ }),
      ).toBeInTheDocument()
    })

    it('mounts one account menu, in the bar rather than the header', () => {
      pretendPhone()
      renderHeader('/find-a-ride')

      const triggers = screen.getAllByRole('button', { name: 'Account menu' })
      expect(triggers).toHaveLength(1)
      expect(triggers[0].closest('.bottom-nav')).not.toBeNull()
    })

    it('leaves the desktop header alone above the breakpoint', () => {
      renderHeader('/find-a-ride')

      expect(
        screen.getByRole('button', { name: 'Offer a Ride' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Find a Ride' }),
      ).toBeInTheDocument()
      expect(document.querySelector('.bottom-nav')).toBeNull()
    })
  })
})
