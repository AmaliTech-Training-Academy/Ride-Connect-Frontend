import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import RejoinRideDialog, { RejoinRideModal } from './RejoinRideDialog'

const RIDE = {
  id: 'ride-1',
  origin: 'Madina',
  destination: 'AmaliTech Accra',
  driverName: 'Ama Owusu',
}

function renderDialog(props = {}) {
  const onCancel = jest.fn()
  const onConfirm = jest.fn()
  const onReasonChange = jest.fn()
  render(
    <RejoinRideDialog
      ride={RIDE}
      reason=""
      onReasonChange={onReasonChange}
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...props}
    />,
  )
  return { onCancel, onConfirm, onReasonChange }
}

describe('RejoinRideDialog', () => {
  it('explains the one extra ask and starts on Cancel', () => {
    renderDialog()

    expect(
      screen.getByRole('dialog', { name: 'Request to join again?' }),
    ).toHaveTextContent('Let Ama Owusu know why')
    expect(
      screen.getByText('You can only ask again once for this ride.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('needs a reason before it can send', () => {
    renderDialog({ reason: '   ' })
    expect(screen.getByRole('button', { name: 'Send request' })).toBeDisabled()
  })

  it('passes typing up and sends once a reason is given', async () => {
    const user = userEvent.setup()
    const { onReasonChange, onConfirm } = renderDialog({ reason: 'Please' })

    await user.type(screen.getByLabelText('Reason for rejoining'), 'x')
    expect(onReasonChange).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Send request' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('shows sending, then an error with a retry label', () => {
    const { rerender } = render(
      <RejoinRideDialog
        ride={RIDE}
        reason="Please"
        isPending
        onReasonChange={jest.fn()}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled()

    rerender(
      <RejoinRideDialog
        ride={RIDE}
        reason="Please"
        error="Network down"
        onReasonChange={jest.fn()}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Network down')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog()

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup()
    renderDialog({ reason: 'Please' })
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const send = screen.getByRole('button', { name: 'Send request' })

    send.focus()
    await user.tab()
    expect(screen.getByLabelText('Reason for rejoining')).toHaveFocus()

    cancel.focus()
    await user.tab()
    expect(send).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Reason for rejoining')).toHaveFocus()
    await user.tab({ shift: true })
    expect(send).toHaveFocus()
  })

  it('returns focus to what opened it', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)

    const { unmount } = render(
      <RejoinRideDialog
        ride={RIDE}
        reason=""
        returnFocusTo={{ current: opener }}
        onReasonChange={jest.fn()}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />,
    )
    unmount()

    expect(opener).toHaveFocus()
    opener.remove()
  })

  it('renders nothing from the modal wrapper without a ride', () => {
    const { container } = render(
      <RejoinRideModal
        ride={null}
        reason=""
        onReasonChange={jest.fn()}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
