import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import ChangePasswordPanel from './ChangePasswordPanel'
import { changePassword } from '../../services/auth'

jest.mock('../../services/auth', () => ({
  changePassword: jest.fn(),
}))

function renderPanel(props = {}) {
  const onClose = jest.fn()
  const onChanged = jest.fn()
  render(
    <ChangePasswordPanel onClose={onClose} onChanged={onChanged} {...props} />,
  )
  return { onClose, onChanged }
}

async function fill(user, { current, next, confirm = next }) {
  if (current) await user.type(screen.getByLabelText('Current password'), current)
  if (next) await user.type(screen.getByLabelText('New password'), next)
  if (confirm)
    await user.type(screen.getByLabelText('Confirm new password'), confirm)
}

const submit = (user) =>
  user.click(screen.getByRole('button', { name: 'Update password' }))

describe('ChangePasswordPanel', () => {
  beforeEach(() => {
    changePassword.mockReset()
    changePassword.mockResolvedValue(undefined)
  })

  it('opens as a dialog with focus on the current password', () => {
    renderPanel()

    expect(
      screen.getByRole('dialog', { name: 'Change password' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toHaveFocus()
  })

  it('changes the password and reports back', async () => {
    const user = userEvent.setup()
    const { onChanged } = renderPanel()

    await fill(user, { current: 'OldPass123', next: 'NewPass456' })
    await submit(user)

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'OldPass123',
      newPassword: 'NewPass456',
    })
    expect(onChanged).toHaveBeenCalled()
  })

  it('checks every field before sending anything', async () => {
    const user = userEvent.setup()
    renderPanel()

    await submit(user)

    expect(screen.getByText('Enter your current password.')).toBeInTheDocument()
    expect(screen.getByText('Enter a new password.')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it.each([
    [
      'a password under 8 characters',
      { current: 'OldPass123', next: 'short' },
      'Use at least 8 characters.',
    ],
    [
      'the same password again',
      { current: 'OldPass123', next: 'OldPass123' },
      'Choose a password different from your current one.',
    ],
    [
      'a confirmation that does not match',
      { current: 'OldPass123', next: 'NewPass456', confirm: 'NewPass999' },
      'This does not match your new password.',
    ],
  ])('rejects %s', async (_, values, message) => {
    const user = userEvent.setup()
    renderPanel()

    await fill(user, values)
    await submit(user)

    expect(screen.getByText(message)).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('keeps the panel open and explains a wrong current password', async () => {
    changePassword.mockRejectedValueOnce(
      new Error('Your current password is incorrect.'),
    )
    const user = userEvent.setup()
    const { onChanged } = renderPanel()

    await fill(user, { current: 'WrongPass1', next: 'NewPass456' })
    await submit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your current password is incorrect.',
    )
    expect(onChanged).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Update password' }),
    ).toBeEnabled()
  })

  it('reveals the passwords on request', async () => {
    const user = userEvent.setup()
    renderPanel()

    expect(screen.getByLabelText('New password')).toHaveAttribute(
      'type',
      'password',
    )
    await user.click(screen.getByLabelText('Show passwords'))

    expect(screen.getByLabelText('New password')).toHaveAttribute(
      'type',
      'text',
    )
  })

  it.each([
    ['Cancel', (user) => user.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['the close button', (user) => user.click(screen.getByRole('button', { name: 'Close' }))],
    ['Escape', (user) => user.keyboard('{Escape}')],
  ])('closes with %s', async (_, close) => {
    const user = userEvent.setup()
    const { onClose } = renderPanel()

    await close(user)

    expect(onClose).toHaveBeenCalled()
  })

  it('closes when the backdrop around the panel is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderPanel()

    await user.click(screen.getByRole('dialog').parentElement)

    expect(onClose).toHaveBeenCalled()
  })

  it('stays open while clicking inside the panel', async () => {
    const user = userEvent.setup()
    const { onClose } = renderPanel()

    await user.click(screen.getByRole('heading', { name: 'Change password' }))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps keyboard focus inside the panel', async () => {
    const user = userEvent.setup()
    renderPanel()
    const close = screen.getByRole('button', { name: 'Close' })
    const submitButton = screen.getByRole('button', { name: 'Update password' })

    close.focus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(submitButton).toHaveFocus()

    await user.keyboard('{Tab}')
    expect(close).toHaveFocus()
  })

  it('cannot be dismissed while the change is being saved', async () => {
    let finish
    changePassword.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const user = userEvent.setup()
    const { onClose, onChanged } = renderPanel()

    await fill(user, { current: 'OldPass123', next: 'NewPass456' })
    await submit(user)
    expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled()

    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()

    finish()
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(changePassword).toHaveBeenCalledTimes(1)
  })

  it('returns focus to whatever opened it', async () => {
    const user = userEvent.setup()
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    const onClose = jest.fn()
    const { unmount } = render(
      <ChangePasswordPanel onClose={onClose} returnFocusTo={{ current: opener }} />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    unmount()

    expect(opener).toHaveFocus()
    opener.remove()
  })
})
