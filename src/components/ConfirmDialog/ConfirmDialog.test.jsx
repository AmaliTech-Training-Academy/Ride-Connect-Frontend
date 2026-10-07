import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import ConfirmDialog from './ConfirmDialog'

function renderDialog(props = {}) {
  const onConfirm = jest.fn()
  const onCancel = jest.fn()
  const utils = render(
    <ConfirmDialog
      title="Withdraw your request?"
      message="The seat may go to someone else."
      confirmLabel="Yes, withdraw"
      cancelLabel="Keep request"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { ...utils, onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('is an alert dialog named by its title and described by its message', () => {
    renderDialog()

    const dialog = screen.getByRole('alertdialog', {
      name: 'Withdraw your request?',
    })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription(
      'The seat may go to someone else.',
    )
  })

  it('starts on the safe choice', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Keep request' })).toHaveFocus()
  })

  it('confirms or cancels with its buttons', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Yes, withdraw' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Keep request' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels on Escape or a click on the backdrop, not inside', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog()

    await user.click(screen.getByRole('heading'))
    expect(onCancel).not.toHaveBeenCalled()

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('alertdialog').parentElement)
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('keeps keyboard focus inside', async () => {
    const user = userEvent.setup()
    renderDialog()
    const keep = screen.getByRole('button', { name: 'Keep request' })
    const confirm = screen.getByRole('button', { name: 'Yes, withdraw' })

    await user.keyboard('{Tab}')
    expect(confirm).toHaveFocus()
    await user.keyboard('{Tab}')
    expect(keep).toHaveFocus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(confirm).toHaveFocus()
  })

  it('returns focus to what opened it', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const { unmount } = renderDialog()
    unmount()

    expect(opener).toHaveFocus()
    opener.remove()
  })

  it('cannot be dismissed while its action is running', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog({
      isPending: true,
      pendingLabel: 'Withdrawing...',
    })

    expect(
      screen.getByRole('button', { name: 'Withdrawing...' }),
    ).toBeDisabled()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('alertdialog').parentElement)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('can use a calmer tone and leave out the message', () => {
    renderDialog({ tone: 'neutral', message: undefined })

    expect(screen.getByRole('button', { name: 'Yes, withdraw' })).toHaveClass(
      'confirm-dialog-confirm-neutral',
    )
    expect(screen.getByRole('alertdialog')).not.toHaveAttribute(
      'aria-describedby',
    )
  })
})
